// Run only on a disposable Windows CI runner: fixtures replace saved games in
// the runner's app profile. The exact release executable is exercised through
// WebDriver; no test commands or debug features are added to the shipped app.
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { puzzle } from '../browser/fixtures.js';
import { freePuzzle, almostWon } from '../browser/freecell-fixtures.js';
import * as spider from '../../src/spider.js';
import * as hearts from '../../src/hearts.js';
import { APP_VERSION } from '../../src/version.js';

if (process.platform !== 'win32') throw Error('Desktop smoke tests require Windows');
if (process.env.CI !== 'true') throw Error('Run these fixture-based tests on a disposable CI runner');
const evidence = resolve('build/desktop-evidence');
await mkdir(evidence, {recursive:true});
const app = resolve('src-tauri/target/release/classic-win-games.exe');
const driver = spawn(resolve('msedgedriver.exe'), ['--port=4444'], {stdio:['ignore','pipe','pipe']});
let driverLog = '', session, appProcess;
for (const stream of [driver.stdout, driver.stderr]) stream.on('data', bytes => {driverLog += bytes;});
driver.on('error', error => {driverLog += String(error);});
const base = 'http://127.0.0.1:4444';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function command(method, path, body) {
  console.log(`${method} ${path}`);
  const response = await fetch(base + path, {method,
    headers:body ? {'Content-Type':'application/json'} : {},
    body:body ? JSON.stringify(body) : undefined, signal:AbortSignal.timeout(60000)});
  const data = await response.json();
  if (!response.ok || data.value?.error) throw Error(JSON.stringify(data));
  return data.value;
}
const script = (code, ...args) => command('POST', `/session/${session}/execute/sync`, {script:code, args});
async function until(check, description, timeout = 20000) {
  const start = Date.now();
  while (Date.now()-start < timeout) {
    try { const value = await check(); if(value) return value; } catch {}
    await pause(150);
  }
  throw Error(`Timed out: ${description}\n${driverLog}`);
}
async function start() {
  // Launch outside WebDriver: its launch mode substitutes a temporary profile,
  // which would invalidate the real save/Undo persistence check.
  appProcess = spawn(app, [], {stdio:'ignore'});
  appProcess.on('error', error => {driverLog += String(error);});
  await until(async()=>{
    const response = await fetch('http://127.0.0.1:9222/json/version', {signal:AbortSignal.timeout(2000)});
    return response.ok;
  }, 'app debugging endpoint');
  const value = await command('POST', '/session', {capabilities:{alwaysMatch:{
    browserName:'webview2', 'ms:edgeOptions':{debuggerAddress:'127.0.0.1:9222'}
  }}});
  session = value.sessionId;
  await until(()=>script('return !!document.querySelector("main[data-game]")'), 'frontend startup');
  assert.equal(await script('return document.documentElement.dataset.packaged'), 'desktop');
  assert.equal(await script('return location.origin'), 'https://tauri.localhost');
  await until(()=>script('return /^[a-f0-9]{40}$/.test(document.querySelector("#app-version").title)'), 'embedded build identity');
  assert.equal(await script('return document.querySelector("#app-version").textContent'), `${APP_VERSION} · ${process.env.GITHUB_SHA.slice(0,7)}`);
  assert.equal(await script('return document.querySelector("#app-edition").textContent'), 'Windows edition');
}
async function stop() {
  if (appProcess && appProcess.exitCode === null) {
    const pid = appProcess.pid;
    await promisify(execFile)('pwsh', ['-NoProfile','-Command',
      `if (!(Get-Process -Id ${pid}).CloseMainWindow()) { throw 'Could not close the app window' }`]);
    await until(()=>appProcess.exitCode !== null, 'app process exit');
  }
  appProcess = undefined;
  if (session) {
    await command('DELETE', `/session/${session}`).catch(()=>{});
    session = undefined;
  }
  await pause(700);
}
const key = game => `classic-win-${game}-v1`;
async function saved(game) { return JSON.parse(await script('return localStorage.getItem(arguments[0])', key(game))); }
async function route(game) {
  await script('location.hash=arguments[0]; return true', `#${game}`);
  await until(()=>script('return document.querySelector("main").dataset.game===arguments[0]', game), `${game} navigation`);
}
async function fixture(game, state) {
  await route(game);
  await script('localStorage.setItem(arguments[0],JSON.stringify(arguments[1])); return true', key(game), state);
  await command('POST', `/session/${session}/refresh`, {});
  await until(()=>script('return document.querySelector("main")?.dataset.game===arguments[0] && document.querySelector("#status")?.textContent.includes("123")', game), `${game} fixture`);
}
async function element(selector) {
  return command('POST', `/session/${session}/element`, {using:'css selector',value:selector});
}
const elementId = el => el['element-6066-11e4-a52e-4f735466cecf'];
async function click(selector) {
  const el = await element(selector);
  return command('POST', `/session/${session}/element/${elementId(el)}/click`, {});
}
async function screenshot(name) {
  const png = await command('GET', `/session/${session}/screenshot`);
  await writeFile(resolve(evidence, `${name}.png`), Buffer.from(png, 'base64'));
}
async function pointer(actions) {
  return command('POST', `/session/${session}/actions`, {actions:[{
    type:'pointer', id:'mouse', parameters:{pointerType:'mouse'}, actions
  }]});
}
try {
  await until(async()=>{await command('GET','/status');return true;},'WebDriver server');
  await start();
  await fixture('klondike', puzzle());
  const ace = await element('[data-kind="tableau"][data-index="3"] .card');
  await pointer([
    {type:'pointerMove',duration:0,origin:ace,x:0,y:0},
    {type:'pointerDown',button:0},{type:'pointerUp',button:0},
    {type:'pause',duration:50},{type:'pointerDown',button:0},{type:'pointerUp',button:0}
  ]);
  assert.equal((await saved('klondike')).foundations[0].length,1,'native double-click builds a foundation');
  await click('#undo');
  const queen = puzzle().tableau[0][1].id;
  const rects = await script('return arguments[0].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:Math.round(r.x+12),y:Math.round(r.y+12)}})',
    [`[data-card-id="${queen}"]`, '[data-kind="tableau"][data-index="1"] .card']);
  const [from,to] = rects;
  await script(`window.dragEvents=[]; for(const type of ['dragstart','dragover','drop','dragend']) document.addEventListener(type,e=>window.dragEvents.push({type,trusted:e.isTrusted,target:e.target.dataset.cardId}),true); return true`);
  const scale = await script('return devicePixelRatio');
  await promisify(execFile)('pwsh', ['-NoProfile','-File',resolve('tests/desktop/drag.ps1'),
    '-FromX',String(from.x),'-FromY',String(from.y),'-ToX',String(to.x),'-ToY',String(to.y),'-Scale',String(scale)]);
  await pause(200);
  const dragEvents = await script('return window.dragEvents');
  await writeFile(resolve(evidence,'drag-events.json'),JSON.stringify(dragEvents,null,2));
  assert.ok(dragEvents.some(e=>e.type==='drop' && e.trusted),'Windows mouse input produces a trusted drop');
  assert.equal((await saved('klondike')).tableau[1].length,3,'native HTML drag moves the whole sequence');
  await screenshot('klondike');

  await fixture('freecell', freePuzzle());
  await click('[data-kind="tableau"][data-index="0"] .card:last-child');
  await click('[data-kind="cells"][data-index="1"] .empty');
  const progress = await saved('freecell');
  assert.equal(progress.moves,1);
  await stop(); await start(); await route('freecell');
  assert.deepEqual(await saved('freecell'),progress,'saved deal survives an actual process restart');
  await click('#undo');
  assert.deepEqual(await saved('freecell'),freePuzzle(),'Undo survives an actual process restart');
  await fixture('freecell', almostWon());
  await click('#finish');
  assert.equal(await script('return document.querySelector("#status").textContent'),'You won!');
  await click('#undo');
  assert.deepEqual(await saved('freecell'),almostWon());
  await screenshot('freecell');

  await fixture('spider',spider.newGame(123));
  await click('[data-kind="stock"] button');
  assert.equal((await saved('spider')).stock.length,40);
  await screenshot('spider');
  await fixture('hearts',hearts.newGame(123));
  await click('#hint');await click('#hearts-action');
  const match = await saved('hearts');
  assert.ok(hearts.validate(match));assert.notEqual(match.phase,'pass');
  await screenshot('hearts');

  // JS native dialogs are used by New deal/Restart/Draw. Exercise the real
  // WebView2 confirmation and reject it so the saved deal remains unchanged.
  await route('klondike');
  const before = await saved('klondike');
  await click('#new');
  await command('POST',`/session/${session}/alert/dismiss`,{});
  assert.deepEqual(await saved('klondike'),before);
  const registrations = await command('POST', `/session/${session}/execute/async`, {
    script:'const done=arguments[arguments.length-1]; navigator.serviceWorker.getRegistrations().then(r=>done(r.length));',args:[]
  });
  assert.equal(registrations,0,'packaged app has no service worker');
  await writeFile(resolve(evidence,'result.json'),JSON.stringify({passed:true,checks:[
    'all four games','mouse double-click','native HTML drag','saved deal and Undo after process restart',
    'Finish and Undo','native confirmation cancellation','no service worker'
  ]},null,2));
  console.log('Windows packaged-app smoke tests passed');
} catch (error) {
  if(session)await screenshot('failure').catch(()=>{});
  throw error;
} finally {
  await stop().catch(()=>{appProcess?.kill();});
  driver.kill();
  await writeFile(resolve(evidence,'driver.log'),driverLog);
}
