import { copyFile, readFile } from 'node:fs/promises';

const files = ['robots.txt', 'sitemap.xml'];

for (const file of files) {
  const source = `public/${file}`;
  const target = `dist/${file}`;
  await copyFile(source, target);
  const content = await readFile(target, 'utf8');
  if (!content.trim()) {
    throw new Error(`${target} is empty after copy`);
  }
}

console.log('public SEO files copied to dist');
