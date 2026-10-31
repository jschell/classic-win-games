import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
export async function buildWorker(root = defaultRoot, overrides = new Map()) {
  const read = path => overrides.has(path) ? overrides.get(path) : readFile(resolve(root, path));
  const template = String(await read('tools/service-worker.template.js'));
  const paths = [...template.matchAll(/'\.\/([^']+)'/g)].map(match => match[1]);
  const hash = createHash('sha256').update(template);
  for (const path of paths) hash.update(path).update(await read(path));
  return template.replace('__VERSION__', hash.digest('hex').slice(0,16));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const worker = await buildWorker();
  if (process.argv.includes('--check')) {
    if (await readFile(resolve(defaultRoot, 'sw.js'), 'utf8') !== worker) throw Error('Shell changed: run npm run build:sw and commit sw.js');
  } else await writeFile(resolve(defaultRoot, 'sw.js'), worker);
}
