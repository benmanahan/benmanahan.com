interface VideoSurface {
  src: string;
  muted: boolean;
  currentTime: number;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  removeAttribute(name: string): void;
}

/** One player loads each clip only when needed, then wraps the complete sequence. */
export function createVideoSequence(video: VideoSurface, clips: readonly string[]) {
  if (clips.length === 0) throw new Error('A video sequence needs at least one clip.');
  let currentIndex = 0;
  let resumeAt = 0;
  const play = async () => {
    try {
      if (!video.src) {
        video.src = clips[currentIndex];
        video.load();
        if (resumeAt > 0) video.currentTime = resumeAt;
      }
      video.muted = true;
      await video.play();
      return true;
    } catch { return false; } // Hovering again, tapping, or pressing Enter can retry.
  };
  const select = async (index: number, continuePlaying: boolean) => {
    if (!Number.isInteger(index) || index < 0 || index >= clips.length) throw new RangeError('Invalid video selection.');
    currentIndex = index;
    resumeAt = 0;
    video.src = clips[currentIndex];
    video.load();
    return continuePlaying ? play() : false;
  };
  return {
    get currentIndex() { return currentIndex; },
    play,
    suspend() {
      video.pause();
      if (video.src) {
        resumeAt = Number.isFinite(video.currentTime) ? video.currentTime : 0;
        video.removeAttribute('src');
        video.load(); // Aborts buffering; the inert data-src is not a fallback resource.
      }
    },
    select,
    advance: (continuePlaying: boolean) => select((currentIndex + 1) % clips.length, continuePlaying),
  };
}

/** Reels start on view; videos need an interaction that remains latched afterward. */
export function createPlaybackState(reducedMotion = false, requiresActivation = false) {
  let pausedByUser = false;
  let activated = !requiresActivation;
  let motionAllowedByUser = false;
  return {
    activate(explicit = false) {
      activated = true;
      pausedByUser = false;
      if (explicit) motionAllowedByUser = true;
    },
    deactivate() { activated = false; pausedByUser = false; motionAllowedByUser = false; },
    pause() { pausedByUser = true; },
    setReducedMotion(value: boolean) {
      reducedMotion = value;
      if (value) motionAllowedByUser = false;
    },
    shouldPlay(visible: boolean, hidden: boolean) {
      return visible && !hidden && activated && !pausedByUser && (!reducedMotion || motionAllowedByUser);
    },
  };
}

/** Starting another video stops and unloads the previous one, including pending loads. */
export function createPlaybackCoordinator() {
  let current: (() => void) | undefined;
  return {
    claim(stop: () => void) {
      if (current !== stop) { current?.(); current = stop; }
    },
    release(stop: () => void) { if (current === stop) current = undefined; },
  };
}

export function registerProjectMedia() {
  if (typeof window === 'undefined' || customElements.get('project-interactive-media')) return;
  const coordinator = createPlaybackCoordinator();

  class ProjectInteractiveMedia extends HTMLElement {
    private cleanup?: () => void;

    connectedCallback() {
      if (this.cleanup) return;
      const abort = new AbortController();
      const options = { signal: abort.signal };
      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
      const video = this.querySelector('video');
      const playback = createPlaybackState(reducedMotion.matches, Boolean(video));
      let pointerInside = false;
      let touched = false;
      let visible = !('IntersectionObserver' in window);
      let timer: ReturnType<typeof setInterval> | undefined;
      let refresh = () => {};
      let activateVideo = (_explicit: boolean, _index?: number) => {};
      let disposeVideo = () => {};
      const keyboardFocused = () => this.matches(':focus-visible') || [...this.querySelectorAll('button')].some((element) => element.matches(':focus-visible'));
      const updateColor = () => {
        this.dataset.color = String(visible && !document.hidden && (pointerInside || touched || keyboardFocused()));
      };
      const stopTimer = () => { clearInterval(timer); timer = undefined; };

      if (this.dataset.kind === 'slideshow') {
        const slides = [...this.querySelectorAll<HTMLImageElement>('[data-slide]')];
        const selectors = [...this.querySelectorAll<HTMLButtonElement>('[data-select-slide]')];
        let current = 0;
        const show = (index: number) => {
          current = index % slides.length;
          slides.forEach((slide, i) => { slide.dataset.current = String(i === current); });
          selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
        };
        refresh = () => {
          const shouldRotate = playback.shouldPlay(visible, document.hidden) && slides.length > 1;
          if (shouldRotate && timer === undefined) timer = setInterval(() => show(current + 1), Number(this.dataset.interval) || 5000);
          else if (!shouldRotate) stopTimer();
          updateColor();
        };
        selectors.forEach((button, i) => button.addEventListener('click', () => {
          show(i);
          playback.pause();
          stopTimer();
          refresh();
        }, options));
        show(0);
      } else if (video) {
        const clips: string[] = JSON.parse(this.dataset.playlist || '[]');
        if (clips.length === 0) return;
        const sequence = createVideoSequence(video, clips);
        let request = 0;
        let pending = false;
        const cancelRequest = () => { request++; pending = false; };
        const selectors = [...this.querySelectorAll<HTMLButtonElement>('[data-select-video]')];
        const zooms: number[] = JSON.parse(this.dataset.clipZooms || '[]');
        const updateSelection = () => {
          selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === sequence.currentIndex)));
          video.style.transform = `scale(${zooms[sequence.currentIndex] ?? 1})`;
        };
        const suspendForAnotherVideo = () => {
          playback.deactivate();
          cancelRequest();
          sequence.suspend();
        };
        activateVideo = (explicit, index) => {
          coordinator.claim(suspendForAnotherVideo);
          if (index !== undefined) {
            cancelRequest();
            void sequence.select(index, false);
            updateSelection();
          }
          playback.activate(explicit);
          refresh();
        };
        disposeVideo = () => { coordinator.release(suspendForAnotherVideo); suspendForAnotherVideo(); };
        selectors.forEach((button, i) => button.addEventListener('click', () => activateVideo(true, i), options));
        video.loop = clips.length === 1;
        refresh = () => {
          if (!playback.shouldPlay(visible, document.hidden)) {
            cancelRequest();
            sequence.suspend();
          } else if (video.paused && !pending) {
            const currentRequest = ++request;
            pending = true;
            void sequence.play().then((started) => {
              if (currentRequest !== request) return;
              pending = false;
              if (!started) playback.pause();
            });
          }
          updateColor();
        };
        video.addEventListener('ended', () => {
          if (clips.length > 1 && video.ended) {
            cancelRequest();
            void sequence.advance(false);
            updateSelection();
            refresh();
          }
        }, options);
        updateSelection();
      }

      reducedMotion.addEventListener('change', () => {
        playback.setReducedMotion(reducedMotion.matches);
        refresh();
      }, options);
      this.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'touch') { pointerInside = true; activateVideo(false); updateColor(); }
      }, options);
      this.addEventListener('pointerleave', (event) => {
        if (event.pointerType !== 'touch') { pointerInside = false; updateColor(); }
      }, options);
      this.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch') { touched = true; updateColor(); }
      }, options);
      this.addEventListener('click', (event) => {
        if (!(event.target as Element).closest('button')) activateVideo(true);
      }, options);
      this.addEventListener('keydown', (event) => {
        if (event.target === this && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          activateVideo(true);
        }
      }, options);
      this.addEventListener('focusin', () => { queueMicrotask(() => {
        if (keyboardFocused()) activateVideo(false);
        updateColor();
      }); }, options);
      this.addEventListener('focusout', () => { queueMicrotask(updateColor); }, options);
      document.addEventListener('visibilitychange', refresh, options);
      const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.05;
        pointerInside = matchMedia('(hover: hover)').matches && this.matches(':hover');
        if (!visible) touched = false;
        if (visible && pointerInside && video) activateVideo(false);
        else refresh();
      }, { threshold: 0.05 }) : undefined;
      observer?.observe(this);
      this.dataset.ready = 'true';
      refresh();
      this.cleanup = () => {
        abort.abort();
        observer?.disconnect();
        stopTimer();
        disposeVideo();
      };
    }

    disconnectedCallback() { this.cleanup?.(); this.cleanup = undefined; }
  }
  customElements.define('project-interactive-media', ProjectInteractiveMedia);
}
