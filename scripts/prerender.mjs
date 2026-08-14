import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const routes = [
  ['/', 'dist/index.html'],
  ['/about/', 'dist/about/index.html'],
  ['/ranking/', 'dist/ranking/index.html'],
];

const serverEntryUrl = pathToFileURL(resolve('.prerender/entry-server.js')).href;
const { renderPath } = await import(serverEntryUrl);

for (const [pathname, htmlPath] of routes) {
  const html = await readFile(htmlPath, 'utf8');
  const markup = renderPath(pathname);
  const target = '<div id="root"></div>';
  if (!html.includes(target)) {
    throw new Error(`Prerender target not found: ${htmlPath}`);
  }
  await writeFile(htmlPath, html.replace(target, `<div id="root">${markup}</div>`));
}

console.log(`prerendered ${routes.length} routes`);
