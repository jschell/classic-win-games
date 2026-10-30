import {test,expect} from '@playwright/test';
import {newGame,validate} from '../../src/klondike.js';
import {puzzle,longColumn} from './fixtures.js';
const key='classic-win-klondike-v1';
async function load(page,state=newGame(123)) {
  await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key,state});
  await page.goto('/');await expect(page.locator('.stack')).toHaveCount(7);
}
const pile=(page,name)=>page.getByRole('group',{name,exact:true});
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);}
async function tapCard(page,name){await page.getByRole('button',{name,exact:true}).tap();}
async function geometry(page) {
  return page.evaluate(()=>{
    const rect=e=>e.getBoundingClientRect();
    const board=rect(document.querySelector('#board'));
    const columns=[...document.querySelectorAll('.stack')];
    return {
      overflow:document.documentElement.scrollWidth>innerWidth,
      contained:columns.every(p=>{
        const r=rect(p),last=rect(p.lastElementChild);
        return last.bottom<=r.bottom+1&&last.bottom<=board.bottom&&r.left>=board.left&&r.right<=board.right;
      }),
      targets:columns.flatMap(p=>[...p.querySelectorAll('.card')].filter(c=>!c.disabled).map(c=>{
        const r=rect(c),next=c.nextElementSibling;
        const exposed=next?rect(next).top-r.top:r.height;
        const mark=rect(c.querySelector('.card-corner'));
        return {width:r.width,exposed,readable:mark.bottom<=(next?rect(next).top:r.bottom)&&mark.right<=r.right};
      })),
      gap:rect(document.querySelector('[data-kind="foundations"]')).left-rect(document.querySelector('[data-kind="waste"]')).right
    };
  });
}
for(const [width,height] of [[375,667],[390,844],[430,932],[768,1024],[1440,900]]) {
  test(`initial and long columns ${width}x${height}`,async({page},testInfo)=>{
    await page.setViewportSize({width,height});await load(page);
    let g=await geometry(page);
    expect(g.overflow).toBe(false);expect(g.contained).toBe(true);expect(g.gap).toBeGreaterThan(40);
    const backs=pile(page,'Column 7').locator('.back');await expect(backs).toHaveCount(6);
    await page.screenshot({path:testInfo.outputPath(`initial-${width}.png`),fullPage:true});
    await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:longColumn()});
    // Restore on a page without the initial seed hook.
    const restored=await page.context().newPage();await restored.goto('/');
    g=await geometry(restored);
    expect(g.overflow).toBe(false);expect(g.contained).toBe(true);
    expect(g.targets.every(t=>t.width>=44&&t.exposed>=44&&t.readable)).toBe(true);
    await pile(restored,'Column 1').locator('.card').last().scrollIntoViewIfNeeded();
    await expect(pile(restored,'Column 1').locator('.card').last()).toBeInViewport();
    await restored.screenshot({path:testInfo.outputPath(`long-${width}.png`),fullPage:true});
  });
}
test('touch selection, sequences, reveal, king, waste, foundations, undo, restore',async({page})=>{
  await load(page,puzzle());
  await tapCard(page,'Q of hearts');await expect(page.locator('[aria-pressed="true"]')).toHaveCount(1);
  await tapCard(page,'Q of hearts');await expect(page.locator('.selected')).toHaveCount(0);
  await tapCard(page,'Q of hearts');await tapCard(page,'K of spades');
  await expect(pile(page,'Column 1').getByRole('button',{name:'4 of clubs',exact:true})).toBeVisible();
  await tapCard(page,'K of spades');await tapCard(page,'Empty column 3');
  await expect(pile(page,'Column 3').locator('.card')).toHaveCount(3);
  await tapCard(page,'5 of hearts');await tapCard(page,'6 of clubs');
  await expect(pile(page,'Waste').locator('.card')).toHaveCount(0);
  await tapCard(page,'A of clubs');await tapCard(page,'Empty foundation 1');
  await tapCard(page,'2 of clubs');await tapCard(page,'A of clubs');
  await expect(pile(page,'Foundation 1').locator('.card')).toHaveCount(1);
  await expect(pile(page,'Foundation 1').getByRole('button',{name:'2 of clubs',exact:true})).toBeVisible();
  const before=await saved(page);expect(validate(before)).toBe(true);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();
  await expect(pile(page,'Foundation 1').getByRole('button',{name:'A of clubs',exact:true})).toBeVisible();
  const state=await saved(page);const restored=await page.context().newPage();await restored.goto('/');
  expect(await saved(restored)).toEqual(state);
  await expect(pile(restored,'Column 3').locator('.card')).toHaveCount(3);
  await expect(restored.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
});
test('draw modes, repeated stock taps, recycle, undo, new deal',async({page})=>{
  await load(page);
  await page.getByRole('button',{name:/^Draw 1 /}).tap();expect((await saved(page)).waste).toHaveLength(1);
  await page.getByRole('combobox',{name:'Draw',exact:true}).selectOption('3');
  await page.getByRole('button',{name:'Undo',exact:true}).tap();
  expect((await saved(page)).draw).toBe(3);await expect(page.getByRole('combobox',{name:'Draw',exact:true})).toHaveValue('3');
  for(let i=0;i<8;i++)await page.getByRole('button',{name:/^Draw 3 /}).tap();
  expect((await saved(page)).waste).toHaveLength(24);
  await tapCard(page,'Recycle waste');expect((await saved(page)).stock).toHaveLength(24);
  for(let i=0;i<20;i++)await pile(page,'Stock').locator('button').tap();
  expect(validate(await saved(page))).toBe(true);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'New deal',exact:true}).tap();
  expect((await saved(page)).moves).toBe(0);await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
});
test('waste ace to foundation and invalid move leaves state intact',async({page})=>{
  const s=puzzle();[s.waste[0],s.tableau[3][0]]=[s.tableau[3][0],s.waste[0]];
  await load(page,s);const before=await saved(page);
  await tapCard(page,'A of clubs');await tapCard(page,'9 of spades');expect(await saved(page)).toEqual(before);
  await tapCard(page,'A of clubs');await tapCard(page,'Empty foundation 1');
  await expect(pile(page,'Foundation 1').locator('.card')).toHaveCount(1);
});
test('offline shell, navigation and reconnection preserve saved game',async({page,context})=>{
  await load(page);await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await page.getByRole('button',{name:/^Draw 1 /}).tap();const state=await saved(page);
  await context.setOffline(true);await page.reload();await expect(page.locator('.stack')).toHaveCount(7);
  expect(await saved(page)).toEqual(state);
  await context.setOffline(false);await page.reload();await expect(page.locator('.stack')).toHaveCount(7);
  expect(await saved(page)).toEqual(state);
});
