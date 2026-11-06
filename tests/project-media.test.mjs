import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackCoordinator, createPlaybackState, createVideoSequence } from '../src/scripts/project-media.ts';

function player() {
  return {
    src: '', muted: false, currentTime: 0, plays: 0, pauses: 0, loads: 0,
    async play() { this.plays++; },
    pause() { this.pauses++; },
    load() { this.loads++; this.currentTime = 0; },
    removeAttribute(name) { if (name === 'src') this.src = ''; },
  };
}

test('queued videos are not loaded or played during initialization', () => {
  const video = player();
  const sequence = createVideoSequence(video, ['v1.mp4', 'v2.mp4']);
  assert.equal(sequence.currentIndex, 0);
  assert.equal(video.src, '');
  assert.equal(video.loads, 0);
  assert.equal(video.plays, 0);
});

test('the complete v1 → v2 sequence repeats in order', async () => {
  const video = player();
  const sequence = createVideoSequence(video, ['v1.mp4', 'v2.mp4']);
  assert.equal(await sequence.play(), true);
  assert.equal(video.muted, true);
  await sequence.advance(true);
  assert.equal(video.src, 'v2.mp4');
  assert.equal(sequence.currentIndex, 1);
  await sequence.advance(true);
  assert.equal(video.src, 'v1.mp4');
  assert.equal(sequence.currentIndex, 0);
  assert.equal(video.plays, 3);
});

test('suspending aborts loading and resumes the same clip at its saved position', async () => {
  const video = player();
  const sequence = createVideoSequence(video, ['v1.mp4', 'v2.mp4']);
  await sequence.play();
  video.currentTime = 4.5;
  sequence.suspend();
  assert.equal(video.pauses, 1);
  assert.equal(video.src, '');
  sequence.suspend(); // Repeated visibility updates must not overwrite the saved position.
  await sequence.play();
  assert.equal(video.src, 'v1.mp4');
  assert.equal(video.currentTime, 4.5);
  await sequence.advance(false);
  assert.equal(video.src, 'v2.mp4');
  assert.equal(video.currentTime, 0);
  assert.equal(video.plays, 2);
});

test('browser playback denial is handled without an unhandled rejection', async () => {
  const video = player();
  video.play = async () => { throw new Error('Playback denied'); };
  assert.equal(await createVideoSequence(video, ['v1.mp4']).play(), false);
});

test('selecting V2 starts it immediately and the sequence then wraps to V1', async () => {
  const video = player();
  const sequence = createVideoSequence(video, ['v1.mp4', 'v2.mp4']);
  await sequence.select(1, true);
  assert.equal(video.src, 'v2.mp4');
  assert.equal(sequence.currentIndex, 1);
  assert.equal(video.plays, 1);
  await sequence.advance(true);
  assert.equal(video.src, 'v1.mp4');
  assert.equal(sequence.currentIndex, 0);
  await sequence.select(1, false);
  await sequence.select(0, true);
  assert.equal(video.src, 'v1.mp4');
  assert.equal(sequence.currentIndex, 0);
});

test('invalid clip selection cannot alter the current clip', async () => {
  const video = player();
  const sequence = createVideoSequence(video, ['v1.mp4', 'v2.mp4']);
  for (const index of [-1, 2, 0.5]) await assert.rejects(sequence.select(index, true), /Invalid video selection/);
  assert.equal(video.src, '');
  assert.equal(video.loads, 0);
});

test('a sequence requires at least one source', () => {
  assert.throws(() => createVideoSequence(player(), []), /at least one clip/);
});

test('Pomodoro cycles V0 through the V3 still and V4, then wraps; direct selection keeps sequencing', async () => {
  const video = player();
  const clips = ['v0.mp4', 'v1.mp4', 'v2.mp4', 'v3-still.mp4', 'v4.mp4'];
  const sequence = createVideoSequence(video, clips);
  assert.equal(video.loads, 0);
  await sequence.play();
  for (const index of [1, 2, 3, 4, 0]) {
    await sequence.advance(true);
    assert.equal(sequence.currentIndex, index);
    assert.equal(video.src, clips[index]);
  }
  await sequence.select(3, true);
  assert.equal(video.src, 'v3-still.mp4');
  await sequence.advance(true);
  assert.equal(video.src, 'v4.mp4');
});

test('image reels start on entering the viewport and pause offscreen', () => {
  const state = createPlaybackState();
  assert.equal(state.shouldPlay(false, false), false);
  assert.equal(state.shouldPlay(true, false), true);
  assert.equal(state.shouldPlay(false, false), false);
  assert.equal(state.shouldPlay(true, false), true);
});

test('choosing an image stops rotation even after returning to the viewport', () => {
  const state = createPlaybackState();
  state.pause();
  assert.equal(state.shouldPlay(true, false), false);
  assert.equal(state.shouldPlay(false, false), false);
  assert.equal(state.shouldPlay(true, false), false);
  assert.equal(state.shouldPlay(true, true), false);
  assert.equal(state.shouldPlay(true, false), false);
});

test('a hidden tab suspends playback without losing the autoplay preference', () => {
  const state = createPlaybackState();
  assert.equal(state.shouldPlay(true, true), false);
  assert.equal(state.shouldPlay(true, false), true);
});

test('video activation persists after hover and visibility changes', () => {
  const state = createPlaybackState(false, true);
  assert.equal(state.shouldPlay(true, false), false);
  state.activate();
  assert.equal(state.shouldPlay(true, false), true);
  // Pointer exit only changes color; activation remains latched.
  assert.equal(state.shouldPlay(true, false), true);
  assert.equal(state.shouldPlay(false, false), false);
  assert.equal(state.shouldPlay(true, true), false);
  assert.equal(state.shouldPlay(true, false), true);
  state.deactivate();
  assert.equal(state.shouldPlay(true, false), false);
});

test('reduced motion prevents hover playback while an explicit tap is respected', () => {
  const state = createPlaybackState(true, true);
  state.activate();
  assert.equal(state.shouldPlay(true, false), false);
  state.activate(true);
  assert.equal(state.shouldPlay(true, false), true);
  state.setReducedMotion(true);
  assert.equal(state.shouldPlay(true, false), false);
  state.pause();
  state.setReducedMotion(false);
  assert.equal(state.shouldPlay(true, false), false);
});

test('only one video owns playback and stale cleanup cannot release its replacement', () => {
  const coordinator = createPlaybackCoordinator();
  const first = createPlaybackState(false, true);
  const second = createPlaybackState(false, true);
  let firstStops = 0;
  let secondStops = 0;
  const stopFirst = () => { firstStops++; first.deactivate(); };
  const stopSecond = () => { secondStops++; second.deactivate(); };
  coordinator.claim(stopFirst);
  first.activate();
  coordinator.claim(stopSecond);
  second.activate();
  assert.equal(first.shouldPlay(true, false), false);
  assert.equal(second.shouldPlay(true, false), true);
  assert.equal(firstStops, 1);
  coordinator.claim(stopSecond);
  assert.equal(secondStops, 0);
  coordinator.release(stopFirst);
  coordinator.claim(stopFirst);
  assert.equal(secondStops, 1);
  coordinator.release(stopFirst);
  coordinator.claim(stopSecond);
  assert.equal(firstStops, 1);
});
