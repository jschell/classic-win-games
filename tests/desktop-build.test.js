import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildDesktop } from '../tools/build-desktop.mjs';

test('desktop staging shares all game modules, excludes web caching and cleans stale files', async () => {
  const output = await mkdtemp(join(tmpdir(), 'classic-desktop-'));
  try {
    const sourceHTML = await readFile(new URL('../index.html', import.meta.url), 'utf8');
    await writeFile(join(output, 'old-release.js'), 'stale');
    const paths = await buildDesktop(output);
    const html = await readFile(join(output, 'index.html'), 'utf8');
    assert.match(html, /data-packaged="desktop"/);
    assert.doesNotMatch(html, /rel="manifest"/);
    assert.equal(await readFile(new URL('../index.html', import.meta.url), 'utf8'), sourceHTML);
    assert.ok(!(await readdir(output)).includes('old-release.js'));
    assert.ok(!(await readdir(output)).includes('sw.js'));
    assert.ok(!paths.some(p => /node_modules|tests|docs|src-tauri/.test(p)));
    for (const path of paths.filter(p => p.startsWith('src/'))) {
      assert.deepEqual(await readFile(join(output, path)), await readFile(new URL(`../${path}`, import.meta.url)));
    }
    const first = await readFile(join(output, 'desktop-build.json'), 'utf8');
    await buildDesktop(output);
    assert.equal(await readFile(join(output, 'desktop-build.json'), 'utf8'), first);
  } finally { await rm(output, {recursive:true, force:true}); }
});

test('desktop identity and HTML drag/drop settings are explicit and versions agree', async () => {
  const config = JSON.parse(await readFile(new URL('../src-tauri/tauri.conf.json', import.meta.url)));
  const cargo = await readFile(new URL('../src-tauri/Cargo.toml', import.meta.url), 'utf8');
  assert.equal(config.identifier, 'com.jschell.classic-win-games');
  assert.equal(config.app.windows[0].label, 'main');
  assert.equal(config.app.windows[0].useHttpsScheme, true);
  assert.equal(config.app.windows[0].dragDropEnabled, false);
  assert.equal(config.bundle.active, false);
  assert.match(cargo, new RegExp(`version = "${config.version.replaceAll('.', '\\.')}"`));
});
