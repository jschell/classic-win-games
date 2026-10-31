import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { buildInfo } from './build-info.mjs';
import { checkVersions } from './version.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export const desktopOutput = resolve(root, 'build/desktop-web');

export async function buildDesktop(output = desktopOutput) {
  await checkVersions(root);
  const modules = (await readdir(resolve(root, 'src'))).filter(name => name.endsWith('.js')).sort();
  const paths = ['index.html', 'style.css', ...modules.map(name => `src/${name}`),
    'icons/icon-192.png', 'icons/icon-512.png'];
  const files = new Map();
  for (const path of paths) files.set(path, await readFile(resolve(root, path)));
  let html = files.get('index.html').toString();
  if (!html.includes('<html lang="en">')) throw Error('Desktop HTML marker insertion needs updating');
  html = html.replace('<html lang="en">', '<html lang="en" data-packaged="desktop">')
    .replace(/<link rel="manifest"[^>]*>/, '');
  files.set('index.html', Buffer.from(html));
  files.set('build-info.json', Buffer.from(JSON.stringify(await buildInfo(root))+'\n'));
  // Rebuild from an allowlist so old caches, tests and dependencies cannot leak
  // into the executable. Source assets are never modified during staging.
  await rm(output, {recursive:true, force:true});
  await mkdir(output, {recursive:true});
  const hashes = {};
  for (const [path, bytes] of files) {
    await mkdir(resolve(output, path, '..'), {recursive:true});
    await writeFile(resolve(output, path), bytes);
    hashes[path] = createHash('sha256').update(bytes).digest('hex');
  }
  await writeFile(resolve(output, 'desktop-build.json'), JSON.stringify({files:hashes}, null, 2)+'\n');
  return [...files.keys()];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await buildDesktop();
  console.log(`Staged ${files.length} shared frontend assets in build/desktop-web`);
}
