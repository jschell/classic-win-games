import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function buildInfo(root) {
  const {version} = JSON.parse(await readFile(resolve(root, 'package.json')));
  let revision = null, modified = false;
  try {
    revision = execFileSync('git', ['rev-parse','HEAD'], {cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
    modified = !!execFileSync('git', ['status','--porcelain'], {cwd:root,encoding:'utf8'}).trim();
  } catch { /* Source archives have a version but no Git identity. */ }
  return {version, revision, modified};
}
