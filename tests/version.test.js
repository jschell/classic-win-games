import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { nextVersion, bumpVersion, checkVersions } from '../tools/version.mjs';
import { buildWorker } from '../tools/build-sw.mjs';
import { versionLabel } from '../src/about.js';
import { APP_VERSION } from '../src/version.js';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'classic-version-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for (const path of ['package.json','package-lock.json','src-tauri/Cargo.toml',
    'src-tauri/Cargo.lock','src-tauri/tauri.conf.json','CHANGELOG.md','build-info.json',
    'src','icons','index.html','style.css','manifest.webmanifest','sw.js','tools/service-worker.template.js']) {
    await mkdir(resolve(root,path,'..'),{recursive:true});
    await cp(new URL(`../${path}`,import.meta.url),resolve(root,path),{recursive:true});
  }
  return root;
}

test('semantic bumps reset subordinate numbers and reject invalid input',()=>{
  assert.equal(nextVersion('0.9.9','patch'),'0.9.10');
  assert.equal(nextVersion('0.9.9','minor'),'0.10.0');
  assert.equal(nextVersion('0.9.9','major'),'1.0.0');
  for (const value of ['01.2.3','1.2','v1.2.3','1.2.3-beta']) assert.throws(()=>nextVersion(value,'patch'));
  assert.throws(()=>nextVersion('0.1.0','latest'));
});
for (const kind of ['patch','minor','major']) test(`${kind} bump keeps all metadata/cache aligned without changing dependencies`,async t=>{
  const root = await fixture(t), old = await checkVersions(root);
  const before = await readFile(resolve(root,'src-tauri/Cargo.lock'),'utf8');
  const dependencies = JSON.parse(await readFile(resolve(root,'package-lock.json'))).packages;
  const next = await bumpVersion(kind,root);
  assert.equal(next,nextVersion(old,kind));
  assert.equal(await checkVersions(root),next);
  const after = await readFile(resolve(root,'src-tauri/Cargo.lock'),'utf8');
  assert.equal(after.replace(`name = "classic-win-games"\nversion = "${next}"`, `name = "classic-win-games"\nversion = "${old}"`),before);
  const packages = JSON.parse(await readFile(resolve(root,'package-lock.json'))).packages;
  packages[''].version=old;
  assert.deepEqual(packages,dependencies);
  assert.equal(await readFile(resolve(root,'sw.js'),'utf8'),await buildWorker(root));
  assert.match(await readFile(resolve(root,'CHANGELOG.md'),'utf8'),new RegExp(`## \\[Unreleased\\]\\n\\n## \\[${next.replaceAll('.','\\.')}\\]`));
});
test('metadata drift and invalid bump leave existing files untouched',async t=>{
  const root=await fixture(t), path=resolve(root,'src-tauri/tauri.conf.json');
  const original=await readFile(resolve(root,'package.json'),'utf8');
  await assert.rejects(bumpVersion('latest',root));
  assert.equal(await readFile(resolve(root,'package.json'),'utf8'),original);
  const config=JSON.parse(await readFile(path));config.version='9.9.9';await writeFile(path,JSON.stringify(config));
  await assert.rejects(checkVersions(root),/disagree/);
  await assert.rejects(bumpVersion('patch',root),/disagree/);
  assert.equal(await readFile(resolve(root,'package.json'),'utf8'),original);
});
test('About only labels matching metadata as a build commit',()=>{
  const revision='abcdef0123456789abcdef0123456789abcdef01';
  assert.equal(versionLabel({version:APP_VERSION,revision}),`${APP_VERSION} · abcdef0`);
  assert.equal(versionLabel({version:APP_VERSION,revision,modified:true}),`${APP_VERSION} · abcdef0 (modified)`);
  assert.equal(versionLabel({version:'9.9.9',revision}),`${APP_VERSION} · development`);
  assert.equal(versionLabel({version:APP_VERSION,revision:'{{ site.github.build_revision }}'}),`${APP_VERSION} · development`);
});
