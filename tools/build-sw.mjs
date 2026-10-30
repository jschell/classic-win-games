import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root));
const template=String(await read('tools/service-worker.template.js'));
const paths=[...template.matchAll(/'\.\/([^']+)'/g)].map(m=>m[1]);
const hash=createHash('sha256').update(template);
for(const path of paths)hash.update(path).update(await read(path));
const worker=template.replace('__VERSION__',hash.digest('hex').slice(0,16));
if(process.argv.includes('--check')) {
  if(String(await read('sw.js'))!==worker)throw new Error('Shell changed: run npm run build:sw and commit sw.js');
} else await writeFile(new URL('sw.js',root),worker);
