import {test,expect} from '@playwright/test';
import * as h from '../../src/hearts.js';
import {lastTrick,matchEnd,moonEnd} from './hearts-fixtures.js';
import {deploymentServer} from './server.js';
const key='classic-win-hearts-v1';
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const hand=page=>page.locator('#hearts-hand');
const tap=(page,id)=>hand(page).locator(`[data-card-id="${id}"]`).tap({position:{x:15,y:15}});
async function load(page,state=h.newGame(123)) {
  await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key,state});
  await page.goto('/#hearts');await expect(page.locator('#hearts-board')).toBeVisible();await expect(page.locator('#board')).toBeHidden();
}
async function action(page) {
  const s=await saved(page);
  if(s.phase==='pass')await page.getByRole('button',{name:'Hint',exact:true}).tap();
  if(s.phase==='play')await tap(page,h.chooseCard(h.playerView(s,0)));
  await page.locator('#hearts-action').tap();expect(h.validate(await saved(page))).toBe(true);
}
async function geometry(page) {
  return page.evaluate(()=>{
    const r=e=>e.getBoundingClientRect();return {
      overflow:document.documentElement.scrollWidth>innerWidth,
      cards:[...document.querySelectorAll('#hearts-hand .card')].map(c=>{
        const b=r(c),m=r(c.querySelector('.card-corner'));return {width:b.width,height:b.height,readable:m.right<=b.right&&m.bottom<=b.bottom};
      })
    };
  });
}
for(const [width,height] of [[375,667],[390,844],[430,932],[768,1024],[1440,900]])test(`Hearts passing and progressed layout ${width}x${height}`,async({page},info)=>{
  await page.setViewportSize({width,height});await load(page);
  await expect(hand(page).locator('.card')).toHaveCount(13);await expect(page.getByRole('table',{name:'Hearts scores',exact:true})).toBeVisible();
  let g=await geometry(page);expect(g.overflow).toBe(false);expect(g.cards.every(c=>c.width>=44&&c.height>=44&&c.readable)).toBe(true);
  await expect(page.locator('#hearts-action')).toBeDisabled();await page.screenshot({path:info.outputPath(`hearts-pass-${width}.png`),fullPage:true});
  await action(page);
  while((await saved(page)).phase!=='trick')await action(page);
  await expect(page.locator('.hearts-trick .card')).toHaveCount(4);
  g=await geometry(page);expect(g.overflow).toBe(false);expect(g.cards.every(c=>c.readable&&c.width>=44)).toBe(true);
  await page.screenshot({path:info.outputPath(`hearts-trick-${width}.png`),fullPage:true});
  await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:lastTrick()});await page.reload();
  await expect(hand(page).locator('.card')).toHaveCount(1);g=await geometry(page);expect(g.overflow).toBe(false);
  expect(g.cards.every(c=>c.width>=44&&c.height>=44&&Math.abs(c.width/c.height-2.5/3.5)<.02)).toBe(true);
});
test('touch passing, deselection, illegal-card disabling, hints, repeated taps and Undo',async({page})=>{
  const s=h.newGame(123);await load(page,s);
  for(const c of s.hands[0].slice(0,3))await tap(page,c.id);
  await tap(page,s.hands[0][3].id);await expect(hand(page).locator('.selected')).toHaveCount(3);await expect(page.locator('#selection')).toContainText('exactly three');
  await tap(page,s.hands[0][0].id);await expect(hand(page).locator('.selected')).toHaveCount(2);
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Hint',exact:true}).tap();expect(await saved(page)).toEqual(s);
  await expect(hand(page).locator('.selected')).toHaveCount(3);await page.locator('#hearts-action').tap();
  const passed=await saved(page);expect(h.validate(passed)).toBe(true);expect(passed.sent).toHaveLength(3);expect(passed.received).toHaveLength(3);
  await expect(page.locator('#hearts-board')).toContainText('Received:');await expect(page.locator('#hearts-action')).toBeDisabled();
  const legal=h.legalCards(passed,0);for(const c of passed.hands[0]) {const el=hand(page).locator(`[data-card-id="${c.id}"]`);if(legal.some(l=>l.id===c.id))await expect(el).toBeEnabled();else await expect(el).toBeDisabled();}
  await page.getByRole('button',{name:'Hint',exact:true}).tap();expect(await saved(page)).toEqual(passed);
  await page.locator('#hearts-action').tap();const played=await saved(page);expect(played.moves).toBeGreaterThan(passed.moves);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();expect(await saved(page)).toEqual(passed);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();expect(await saved(page)).toEqual(s);
});
test('a complete hand plays through 13 visible tricks, scores once and advances to right passing',async({page})=>{
  test.setTimeout(60000);await load(page);let count=0;
  while(!['handOver','gameOver'].includes((await saved(page)).phase)) {
    await action(page);
    expect(++count<100).toBe(true);
  }
  const end=await saved(page);expect(end.tricks).toHaveLength(13);expect(end.rounds).toHaveLength(1);expect(end.scores.reduce((a,b)=>a+b,0)).toBe(26);
  await expect(page.locator('#hearts-summary')).toContainText('Hand complete');
  await page.getByRole('button',{name:'Undo',exact:true}).tap();expect((await saved(page)).rounds).toHaveLength(0);await action(page);
  await page.getByRole('button',{name:'Next hand',exact:true}).tap();const next=await saved(page);expect(next.handNumber).toBe(1);expect(next.scores).toEqual(end.scores);await expect(page.locator('#hearts-summary')).toContainText('right');
});
test('shooting the moon and match completion display correct scores and support Undo',async({page})=>{
  const moon=moonEnd();await load(page,moon);await page.getByRole('button',{name:'Collect trick',exact:true}).tap();
  let s=await saved(page);expect(s.rounds.at(-1).moon).toBe(2);expect(s.rounds.at(-1).points).toEqual([26,26,0,26]);await expect(page.locator('#hearts-board')).toContainText('North shot the moon');
  await page.getByRole('button',{name:'Undo',exact:true}).tap();expect(await saved(page)).toEqual(moon);
  const end=matchEnd();await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:end});await page.reload();
  await page.getByRole('button',{name:'Collect trick',exact:true}).tap();s=await saved(page);expect(s.phase).toBe('gameOver');await expect(page.locator('#hearts-summary')).toContainText('Match complete');await expect(page.getByRole('button',{name:'Match finished',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Undo',exact:true}).tap();expect(await saved(page)).toEqual(end);
});
test('refresh and game switching preserve play; numbered replay, Restart and New game reset only Hearts',async({page})=>{
  await load(page);await action(page);await action(page);const progress=await saved(page);await page.reload();expect(await saved(page)).toEqual(progress);await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
  await page.getByRole('link',{name:'Spider',exact:true}).tap();await page.getByRole('button',{name:/^Deal row /}).tap();
  const spider=await page.evaluate(()=>localStorage.getItem('classic-win-spider-v1'));
  await page.getByRole('link',{name:'Hearts',exact:true}).tap();expect(await saved(page)).toEqual(progress);
  await page.getByRole('spinbutton',{name:'Match number',exact:true}).fill('42');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Play deal',exact:true}).tap();expect(await saved(page)).toEqual(h.newGame(42));
  await action(page);page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Restart',exact:true}).tap();expect(await saved(page)).toEqual(h.newGame(42));
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'New game',exact:true}).tap();expect(h.validate(await saved(page))).toBe(true);expect((await saved(page)).rounds).toHaveLength(0);
  expect(await page.evaluate(()=>localStorage.getItem('classic-win-spider-v1'))).toBe(spider);
});
test('Hearts cached route, computer decisions and next hand work offline then reconnect',async({page})=>{
  const deployment=await deploymentServer();
  try {
    await page.goto(deployment.url+'#hearts');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    await action(page);const progress=await saved(page);deployment.disconnected=true;await page.reload();expect(await saved(page)).toEqual(progress);
    await action(page);const after=await saved(page);expect(h.validate(after)).toBe(true);
    const almost=lastTrick();await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:almost});await page.reload();
    while((await saved(page)).phase==='play')await action(page);await action(page);await page.getByRole('button',{name:'Next hand',exact:true}).tap();
    expect((await saved(page)).handNumber).toBe(1);deployment.disconnected=false;const next=await saved(page);await page.reload();expect(await saved(page)).toEqual(next);
  } finally {await deployment.close();}
});
test('corrupt saved state recovers and blocked storage leaves a playable game with warning',async({page,context})=>{
  await page.addInitScript(()=>localStorage.setItem('classic-win-hearts-v1','{"game":"hearts","hands":[]}'));await page.goto('/#hearts');expect(h.validate(await saved(page))).toBe(true);await expect(hand(page).locator('.card')).toHaveCount(13);
  const other=await context.newPage();await other.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked');};Storage.prototype.setItem=()=>{throw Error('blocked');};});
  await other.goto('/#hearts');await expect(other.locator('#storage-note')).toBeVisible();await other.getByRole('button',{name:'Hint',exact:true}).tap();await other.locator('#hearts-action').tap();await expect(other.locator('#hearts-summary')).toContainText('Your turn');
});
