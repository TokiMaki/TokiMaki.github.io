import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const cases = [
  ['dist/index.html', 'landing-page'],
  ['dist/about/index.html', 'about-page'],
  ['dist/ranking/index.html', 'setting-value-page'],
  ['dist/privacy/index.html', 'privacy-page'],
];

for (const [path, expectedClass] of cases) {
  const html = await readFile(path, 'utf8');
  assert.match(html, new RegExp(`<div id="root">[\\s\\S]+${expectedClass}`), `${path} should contain prerendered React markup`);
  assert.doesNotMatch(html, /seo-static-fallback/, `${path} should not contain the old hidden SEO fallback`);
}

const rankingHtml = await readFile('dist/ranking/index.html', 'utf8');
assert.match(rankingHtml, /<meta name="robots" content="index,follow" \/>/);
assert.match(rankingHtml, /https:\/\/www\.dunpilot\.com\/ranking\//);

const legacyStatsHtml = await readFile('dist/stats/index.html', 'utf8');
assert.match(legacyStatsHtml, /<meta name="robots" content="noindex,follow" \/>/);
assert.match(legacyStatsHtml, /\/ranking\//);

const adsTxt = await readFile('dist/ads.txt', 'utf8');
assert.equal(adsTxt.trim(), 'google.com, pub-1303918238179014, DIRECT, f08c47fec0942fa0');

console.log('prerender output tests passed');
