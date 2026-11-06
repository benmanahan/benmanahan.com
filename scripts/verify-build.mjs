// Check the generated static site, including Pages base paths and all local links.
import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root = resolve('dist');
const base = `/${(process.env.BASE_PATH || '/').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
const site = new URL(process.env.SITE_URL || 'https://benmanahan.com');
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : join(directory, entry.name)))).flat();
}
const files = await walk(root);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const decodeAttribute = (value) => value.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&');
let links = 0;
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  assert.match(html, /<html lang="en">/, `${file}: language`);
  assert.match(html, /name="description"/, `${file}: SEO description`);
  const canonical = html.match(/rel="canonical" href="([^"]+)"/);
  assert.ok(canonical, `${file}: canonical URL`);
  assert.equal(new URL(canonical[1]).origin, site.origin, `${file}: canonical must use the deployment domain`);
  assert.match(html, /id="main"/, `${file}: skip link destination`);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${file}: exactly one primary heading`);
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  if (!html.includes('<project-interactive-media')) assert.equal(scripts.length, 0, `${file}: noninteractive pages need no browser JavaScript`);
  for (const script of scripts) {
    assert.match(script[1], /\btype="module"/, `${file}: deferred module script`);
    if (/\bsrc="[^"]+"/.test(script[1])) assert.equal(script[2].trim(), '', `${file}: bundled external script`);
    else assert.ok(script[2].trim().length > 0, `${file}: Astro-inlined module must contain its controller`);
  }
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: IDs must be unique`);
  for (const image of html.matchAll(/<img\b([^>]+)>/g)) {
    assert.match(image[1], /\balt="[^"]+"/, `${file}: descriptive image alt text`);
    assert.match(image[1], /\bwidth="\d+"/, `${file}: image width`);
    assert.match(image[1], /\bheight="\d+"/, `${file}: image height`);
  }
  const social = html.match(/property="og:image" content="([^"]+)"/);
  assert.ok(social, `${file}: social image`);
  const playlists = [...html.matchAll(/\bdata-playlist="([^"]+)"/g)].map((match) => JSON.parse(decodeAttribute(match[1])));
  const sequentialSources = new Set(playlists.filter((clips) => clips.length > 1).map((clips) => clips[0]));
  for (const panel of html.matchAll(/<project-interactive-media\b[^>]*>([\s\S]*?)<\/project-interactive-media>/g)) {
    assert.doesNotMatch(panel[1], /<button\b[^>]*\bdata-toggle-playback(?:\s|=|>)/, `${file}: media should expose item selectors only`);
  }
  for (const video of html.matchAll(/<video\b([^>]+)>([\s\S]*?)<\/video>/g)) {
    assert.doesNotMatch(video[1], /\bcontrols(?:\s|=|$)/, `${file}: use compact custom controls instead of native video chrome`);
    assert.doesNotMatch(video[1], /(?:^|\s)src=/, `${file}: video URLs must stay deferred until interaction`);
    assert.doesNotMatch(video[2], /<source\b[^>]*\ssrc=/, `${file}: source must stay inert until interaction`);
    const firstSource = video[2].match(/<source\b[^>]*\bdata-src="([^"]+)"/);
    if (firstSource && sequentialSources.has(decodeAttribute(firstSource[1]))) {
      assert.doesNotMatch(video[1], /\bloop(?:\s|=|$)/, `${file}: sequence must reach ended to advance to the next clip`);
    } else assert.match(video[1], /\bloop(?:\s|=|$)/, `${file}: looping project video`);
    assert.match(video[1], /\bpreload="none"/, `${file}: video should load on demand`);
    assert.match(video[1], /\baria-label="[^"]+"/, `${file}: descriptive video label`);
    assert.doesNotMatch(video[1], /\bautoplay(?:\s|=|$)/, `${file}: videos must wait for interaction`);
  }
  const values = [...html.matchAll(/\b(?:href|src|poster|data-src)="([^"]+)"/g)].map((match) => match[1]);
  values.push(...playlists.flat());
  values.push(new URL(social[1]).pathname);
  for (const value of values) {
    if (/^(https?:|mailto:|data:|tel:)/.test(value)) continue;
    const [path, fragment] = value.split('#');
    let target = file;
    if (path) {
      assert.ok(path.startsWith(`${base}/`), `${file}: ${value} must include the base path ${base}/`);
      target = resolve(root, `.${decodeURIComponent(path.slice(base.length).split('?')[0])}`);
      assert.ok(target.startsWith(`${root}/`) || target === root, 'Local links must stay within dist');
      const info = await stat(target).catch(() => null);
      assert.ok(info, `${file}: missing local resource ${value}`);
      if (info.isDirectory()) target = join(target, 'index.html');
      await stat(target);
    }
    if (fragment && target.endsWith('.html')) {
      const destination = await readFile(target, 'utf8');
      assert.ok(destination.includes(`id="${fragment}"`), `${file}: broken fragment ${value}`);
    }
    links++;
  }
}
const projectFiles = htmlFiles.filter((file) => file.includes('/projects/'));
assert.ok(projectFiles.length >= 1, 'Expected generated project detail routes');
await stat(join(root, 'robots.txt'));
await stat(join(root, 'sitemap.xml'));
await stat(join(root, '.nojekyll'));
console.log(`Verified ${htmlFiles.length} pages, ${projectFiles.length} project routes, and ${links} local references; media scripts are limited to interactive project pages.`);
