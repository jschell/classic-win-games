import {test,expect} from '@playwright/test';
import {newGame,validate} from '../../src/freecell.js';
import {freePuzzle,freeLong,almostWon,capacityState} from './freecell-fixtures.js';
import {deploymentServer} from './server.js';
const key='classic-win-freecell-v1',klondikeKey='classic-win-klondike-v1';
const pile=(p,name)=>p.getByRole('group',{name,exact:true});
const tap=(p,name)=>p.getByRole('button',{name,exact:true}).tap({position:{x:12,y:12}});
const saved=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
async function load(page,state=newGame(123)) {
  await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key,state});
  await page.goto('/#freecell');await expect(page.locator('.stack')).toHaveCount(8);
}
async function geometry(page) {
  return page.evaluate(()=>{
    const rect=e=>e.getBoundingClientRect(),board=rect(document.querySelector('#board'));
    const columns=[...document.querySelectorAll('.stack')];
    return {
      width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
      contained:columns.every(p=>rect(p.lastElementChild).bottom<=rect(p).bottom+1&&rect(p.lastElementChild).bottom<=board.bottom),
      cards:columns.flatMap(p=>[...p.querySelectorAll('.card')].map(c=>{
        const r=rect(c),next=c.nextElementSibling,limit=next?rect(next).top:r.bottom,mark=rect(c.querySelector('.card-corner'));
        return {width:r.width,exposed:limit-r.top,readable:mark.bottom<=limit&&mark.right<=r.right};
      }))
    };
  });
}
for(const [width,height] of [[375,667],[390,844],[430,932],[768,1024],[1440,900]]) {
  test(`FreeCell initial and long columns ${width}x${height}`,async({page},info)=>{
    await page.setViewportSize({width,height});await load(page);
    await expect(page.locator('.card')).toHaveCount(52);await expect(page.locator('.back')).toHaveCount(0);
    await expect(page.getByRole('combobox',{name:'Draw',exact:true})).toBeHidden();
    let g=await geometry(page);expect(g.width).toBe(width);expect(g.overflow).toBe(false);expect(g.contained).toBe(true);
    expect(g.cards.every(c=>c.width>=44&&c.exposed>=44&&c.readable)).toBe(true);
    await page.screenshot({path:info.outputPath(`freecell-initial-${width}.png`),fullPage:true});
    await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:freeLong()});
    const other=await page.context().newPage();await other.setViewportSize({width,height});await other.goto('/#freecell');
    g=await geometry(other);expect(g.width).toBe(width);expect(g.overflow).toBe(false);expect(g.contained).toBe(true);
    expect(g.cards.every(c=>c.width>=44&&c.exposed>=44&&c.readable)).toBe(true);
    await pile(other,'Column 1').locator('.card').last().scrollIntoViewIfNeeded();
    await expect(pile(other,'Column 1').locator('.card').last()).toBeInViewport();
    await other.screenshot({path:info.outputPath(`freecell-long-${width}.png`),fullPage:true});
  });
}
test('FreeCell touch cells, sequences, any-card empty column, homes, undo and refresh',async({page})=>{
  await load(page,freePuzzle());
  await tap(page,'Q of hearts');await tap(page,'Q of hearts');await expect(page.locator('.selected')).toHaveCount(0);
  await tap(page,'Q of hearts');await tap(page,'K of spades');await expect(pile(page,'Column 2').locator('.card')).toHaveCount(3);
  await tap(page,'5 of hearts');await tap(page,'Empty column 3');
  await expect(pile(page,'Cell 1').locator('.card')).toHaveCount(0);
  await tap(page,'5 of hearts');await tap(page,'Empty cell 2');
  await tap(page,'5 of hearts');await tap(page,'6 of clubs');
  await tap(page,'A of clubs');await tap(page,'Empty foundation 1');
  await tap(page,'2 of clubs');await tap(page,'A of clubs');
  await expect(pile(page,'Foundation 1').locator('.card')).toHaveCount(1);
  await expect(pile(page,'Foundation 1').getByRole('button',{name:'2 of clubs',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Undo',exact:true}).tap();
  await expect(pile(page,'Foundation 1').getByRole('button',{name:'A of clubs',exact:true})).toBeVisible();
  const s=await saved(page);expect(validate(s)).toBe(true);await page.reload();expect(await saved(page)).toEqual(s);
  await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
});
test('FreeCell rejects over-capacity sequence without mutation and allows cancel',async({page})=>{
  const s=capacityState(0,1);await load(page,s);const before=await saved(page);
  await tap(page,'9 of hearts');await tap(page,'10 of spades');expect(await saved(page)).toEqual(before);
  await expect(page.locator('#selection')).toContainText('Move unavailable');
  await tap(page,'9 of hearts');await expect(page.locator('.selected')).toHaveCount(0);
});
test('FreeCell numbered deals, hints, restart, new deal and independent Klondike save',async({page})=>{
  await load(page);
  const before=await saved(page);await page.getByRole('button',{name:'Hint',exact:true}).tap();
  await expect(page.locator('#selection')).toContainText('Try moving');expect(await saved(page)).toEqual(before);
  // Cancel the hint selection before choosing the bottom card.
  await page.locator('[aria-pressed="true"]').tap({position:{x:12,y:12}});
  await pile(page,'Column 1').locator('.card').last().tap();await tap(page,'Empty cell 1');
  const progress=await saved(page);await page.getByRole('link',{name:'Klondike',exact:true}).tap();
  await expect(page.locator('.stack')).toHaveCount(7);await page.getByRole('button',{name:/^Draw 1 /}).tap();
  const k=await page.evaluate(key=>localStorage.getItem(key),klondikeKey);
  await page.getByRole('link',{name:'FreeCell',exact:true}).tap();expect(await saved(page)).toEqual(progress);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Restart',exact:true}).tap();expect((await saved(page)).tableau).toEqual(before.tableau);
  await page.getByRole('spinbutton',{name:'Deal number',exact:true}).fill('42');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Play deal',exact:true}).tap();
  expect((await saved(page)).tableau).toEqual(newGame(42).tableau);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'New deal',exact:true}).tap();
  expect((await saved(page)).moves).toBe(0);expect(validate(await saved(page))).toBe(true);
  expect(await page.evaluate(key=>localStorage.getItem(key),klondikeKey)).toBe(k);
});
test('FreeCell completes game; undo exits win state',async({page})=>{
  await load(page,almostWon());
  for(const [i,suit] of ['spades','hearts','clubs','diamonds'].entries()) {await tap(page,`K of ${suit}`);await pile(page,`Foundation ${i+1}`).locator('button').tap();}
  await expect(page.locator('#status')).toHaveText('You won!');expect((await saved(page)).foundations.every(p=>p.length===13)).toBe(true);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();await expect(page.locator('#status')).not.toHaveText('You won!');
});
test('FreeCell cached shell works offline with saved state and switches games',async({page})=>{
  const deployment=await deploymentServer();
  try {
    await page.goto(deployment.url+'#freecell');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
    await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    await pile(page,'Column 1').locator('.card').last().tap();await tap(page,'Empty cell 1');const s=await saved(page);
    deployment.disconnected=true;await page.reload();await expect(page.locator('.stack')).toHaveCount(8);expect(await saved(page)).toEqual(s);
    await page.getByRole('link',{name:'Klondike',exact:true}).tap();await expect(page.locator('.stack')).toHaveCount(7);
    await page.getByRole('link',{name:'FreeCell',exact:true}).tap();expect(await saved(page)).toEqual(s);
    deployment.disconnected=false;await page.reload();await expect(page.locator('.stack')).toHaveCount(8);
  } finally {await deployment.close();}
});
