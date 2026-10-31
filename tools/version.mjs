import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWorker } from './build-sw.mjs';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const cargoVersion = /(\[package\][\s\S]*?^version = ")([^"]+)(")/m;
const lockVersion = /(\[\[package\]\]\r?\nname = "classic-win-games"\r?\nversion = ")([^"]+)(")/;
export const versionModule = version => `// Generated from package.json by npm run version:bump.\nexport const APP_VERSION = ${JSON.stringify(version)};\n`;
export const pagesMetadata = version => `---\nlayout: null\n---\n{"version":${JSON.stringify(version)},"revision":"{{ site.github.build_revision }}","modified":false}\n`;

export function nextVersion(version, kind) {
  if (!semver.test(version)) throw Error(`Invalid app version: ${version}`);
  const parts = version.split('.').map(Number);
  if (!parts.every(Number.isSafeInteger)) throw Error('Version exceeds safe integer range');
  const index = ['major', 'minor', 'patch'].indexOf(kind);
  if (index < 0) throw Error('Choose patch, minor or major');
  parts[index]++;
  if (!Number.isSafeInteger(parts[index])) throw Error('Version exceeds safe integer range');
  return parts.map((value, i) => i > index ? 0 : value).join('.');
}

async function metadata(root) {
  const paths = ['package.json', 'package-lock.json', 'src-tauri/tauri.conf.json',
    'src-tauri/Cargo.toml', 'src-tauri/Cargo.lock', 'src/version.js', 'build-info.json'];
  const files = new Map(await Promise.all(paths.map(async path => [path, await readFile(resolve(root, path), 'utf8')])));
  return {files, pkg:JSON.parse(files.get('package.json')), lock:JSON.parse(files.get('package-lock.json')),
    tauri:JSON.parse(files.get('src-tauri/tauri.conf.json'))};
}

export async function checkVersions(root = defaultRoot) {
  const {files, pkg, lock, tauri} = await metadata(root);
  const version = pkg.version;
  if (!semver.test(version)) throw Error('package.json needs a major.minor.patch app version');
  const values = [lock.version, lock.packages?.['']?.version, tauri.version,
    files.get('src-tauri/Cargo.toml').match(cargoVersion)?.[2],
    files.get('src-tauri/Cargo.lock').match(lockVersion)?.[2]];
  if (values.some(value => value !== version) || files.get('src/version.js') !== versionModule(version)
      || files.get('build-info.json') !== pagesMetadata(version)) {
    throw Error('App versions disagree: use npm run version:bump -- patch|minor|major');
  }
  return version;
}

export async function bumpVersion(kind, root = defaultRoot) {
  const current = await checkVersions(root);
  const version = nextVersion(current, kind);
  const {files, pkg, lock, tauri} = await metadata(root);
  const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8');
  if (changelog.split('## [Unreleased]\n').length !== 2 || changelog.includes(`## [${version}]`)) {
    throw Error('Changelog needs one Unreleased section and no duplicate new version');
  }
  pkg.version = lock.version = lock.packages[''].version = tauri.version = version;
  const json = value => JSON.stringify(value, null, 2) + '\n';
  files.set('package.json', json(pkg));
  files.set('package-lock.json', json(lock));
  files.set('src-tauri/tauri.conf.json', json(tauri));
  files.set('src-tauri/Cargo.toml', files.get('src-tauri/Cargo.toml').replace(cargoVersion, (_, prefix, old, suffix) => prefix + version + suffix));
  files.set('src-tauri/Cargo.lock', files.get('src-tauri/Cargo.lock').replace(lockVersion, (_, prefix, old, suffix) => prefix + version + suffix));
  files.set('src/version.js', versionModule(version));
  files.set('build-info.json', pagesMetadata(version));
  files.set('CHANGELOG.md', changelog.replace('## [Unreleased]\n', `## [Unreleased]\n\n## [${version}]\n`));
  // Compute the future cache before writing; invalid metadata/assets leave files untouched.
  files.set('sw.js', await buildWorker(root, files));
  for (const [path, content] of files) await writeFile(resolve(root, path), content);
  return version;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw Error('Usage: npm run version:bump -- patch|minor|major');
    console.log(process.argv[2] === '--check'
      ? `App versions agree: ${await checkVersions()}`
      : `App version bumped to ${await bumpVersion(process.argv[2])}. Review CHANGELOG.md and commit the changes.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
