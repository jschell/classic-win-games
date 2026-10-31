import {test,expect} from '@playwright/test';
import * as m from '../../src/minesweeper.js';
import {deploymentServer} from './server.js';
const key='classic-win-minesweeper-v1';
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const cell=(page,index)=>page.locator(`#minesweeper-board [data-cell="${index}"]`);
function field() {const s=m.newGame(123);s.mines=[0,1,2,3,4,5,6,7,8,80];return s;}
async function load(page,state) {
  if(state)await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key,state});
  await page.goto('/#minesweeper');await expect(page.locator('#minesweeper-board')).toBeVisible();
  await expect(page.locator('#game-controls')).toBeHidden();await expect(page.locator('#board')).toBeHidden();
}
for(const [width,height] of [[375,667],[390,844],[430,932],[768,1024],[1440,900]])test(`Minesweeper touch and contained Expert grid ${width}x${height}`,async({page},info)=>{
  await page.setViewportSize({width,height});await load(page);
  await expect(page.locator('.mine-cell')).toHaveCount(81);
  await cell(page,40).tap();const s=await saved(page);expect(m.validate(s)).toBe(true);expect(m.clues(s)[40]).toBe(0);
  await page.screenshot({path:info.outputPath(`mines-opening-${width}.png`),fullPage:true});
  page.once('dialog',d=>d.accept());await page.locator('#mine-difficulty').selectOption('expert');
  await expect(page.locator('.mine-cell')).toHaveCount(480);
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,
    cells:[...document.querySelectorAll('.mine-cell')].map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))}));
  expect(geometry.overflow).toBe(false);expect(geometry.cells.every(c=>c.w>=32&&c.h>=32)).toBe(true);
  await cell(page,479).tap();expect((await saved(page)).revealed[479]).toBe(true);
  await page.screenshot({path:info.outputPath(`mines-expert-${width}.png`),fullPage:true});
});
test('touch flag mode and questions do not reveal a cell or start the clock',async({page})=>{
  await load(page);await page.locator('#mine-flag-mode').tap();
  for(const mark of [1,2,0]) {await cell(page,40).tap();expect((await saved(page)).marks[40]).toBe(mark);}
  expect((await saved(page)).mines).toBeNull();await expect(page.locator('#mine-time')).toHaveText('Time: 0 s');
  await page.getByRole('checkbox',{name:'Question marks'}).uncheck();
  await cell(page,40).tap();expect((await saved(page)).marks[40]).toBe(1);
  await cell(page,40).tap();expect((await saved(page)).marks[40]).toBe(0);
  await page.locator('#mine-flag-mode').tap();await cell(page,40).tap();expect((await saved(page)).revealed[40]).toBe(true);
});
test('wrong chord flags lose; Replay keeps the mines and a new minefield resets them',async({page})=>{
  const s=field();s.revealed[9]=true;s.status='playing';s.marks[0]=1;s.marks[18]=1;
  await load(page,s);await cell(page,9).tap();await expect(page.locator('#mine-status')).toHaveText('Mine hit. Game over.');
  const lost=await saved(page);expect(m.validate(lost)).toBe(true);expect(lost.status).toBe('lost');
  await expect(cell(page,20)).toBeDisabled();
  // A late pointer event must still be harmless, independently of aria-disabled.
  await cell(page,20).tap({force:true});expect((await saved(page)).revealed).toEqual(lost.revealed);
  page.once('dialog',d=>d.accept());await page.locator('#mine-replay').tap();
  expect((await saved(page)).mines).toEqual(s.mines);await expect(page.locator('#mine-status')).toContainText('first reveal can lose');
  await cell(page,0).tap();await expect(page.locator('#mine-status')).toContainText('Game over');
  await page.locator('#mine-new').tap();expect((await saved(page)).mines).toBeNull();
  await cell(page,0).tap();expect((await saved(page)).status).not.toBe('lost');
});
test('mouse right-click and middle-click chord; keyboard navigation and Shift+Enter',async({page})=>{
  const s=field();s.revealed[9]=true;s.status='playing';
  await load(page,s);
  await cell(page,0).click({button:'right'});await cell(page,1).click({button:'right'});
  expect((await saved(page)).marks.slice(0,2)).toEqual([1,1]);
  await cell(page,9).click({button:'middle'});expect((await saved(page)).revealed[10]).toBe(true);
  page.once('dialog',d=>d.accept());await page.locator('#mine-replay').click();
  await cell(page,9).click();
  await cell(page,0).focus();await page.keyboard.press('ArrowRight');await expect(cell(page,1)).toBeFocused();
  await page.keyboard.press('f');expect((await saved(page)).marks[1]).toBe(1);
  await cell(page,0).click({button:'right'});
  await cell(page,9).focus();await page.keyboard.press('Shift+Enter');
  expect((await saved(page)).revealed[10]).toBe(true);
});
test('saved board survives reload, game switching and offline play',async({page})=>{
  const deployment=await deploymentServer();
  try {
    await page.goto(deployment.url+'#minesweeper');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
    await cell(page,40).tap();const s=await saved(page);
    await page.getByRole('link',{name:'FreeCell',exact:true}).tap();await page.getByRole('link',{name:'Minesweeper',exact:true}).tap();
    expect((await saved(page)).mines).toEqual(s.mines);expect((await saved(page)).revealed).toEqual(s.revealed);
    deployment.disconnected=true;await page.reload();await expect(page.locator('#minesweeper-board')).toBeVisible();
    const before=await saved(page);const index=before.revealed.findIndex(v=>!v);
    await page.locator('#mine-flag-mode').tap();await cell(page,index).tap();expect((await saved(page)).marks[index]).toBe(1);
    deployment.disconnected=false;await page.reload();expect((await saved(page)).marks[index]).toBe(1);
  } finally {await deployment.close();}
});
test('all safe squares win without flags and corrupt saves recover',async({page})=>{
  const s=field();s.status='playing';s.revealed=s.revealed.map((_,i)=>!s.mines.includes(i)&&i!==79);
  await load(page,s);await cell(page,79).tap();await expect(page.locator('#mine-status')).toHaveText('You won!');
  expect((await saved(page)).status).toBe('won');expect(m.validate(await saved(page))).toBe(true);
  await page.getByRole('link',{name:'FreeCell',exact:true}).tap();
  await expect(page.locator('main')).toHaveAttribute('data-game','freecell');
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({game:'minesweeper',version:1,difficulty:'expert',mines:[]})),key);
  await page.getByRole('link',{name:'Minesweeper',exact:true}).tap();
  await expect(page.locator('.mine-cell')).toHaveCount(81);await expect(page.locator('#mine-status')).toContainText('Reveal a square');
});
test('simultaneous left and right mouse buttons chord a revealed number',async({page})=>{
  const s=field();s.revealed[9]=true;s.status='playing';s.marks[0]=1;s.marks[1]=1;
  await load(page,s);const box=await cell(page,9).boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down({button:'left'});await page.mouse.down({button:'right'});
  await page.mouse.up({button:'left'});await page.mouse.up({button:'right'});
  expect((await saved(page)).revealed[10]).toBe(true);expect(m.validate(await saved(page))).toBe(true);
});
