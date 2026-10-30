import {test,expect} from '@playwright/test';
import {newGame,validate} from '../../src/spider.js';
import {spiderPuzzle,spiderCompletion,spiderNearWin,spiderDealCompletion,spiderLong} from './spider-fixtures.js';
import {deploymentServer} from './server.js';
const key='classic-win-spider-v1';
const saved=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const col=(p,index)=>p.getByRole('group',{name:`Column ${index+1}`,exact:true});
const card=(p,id)=>p.locator(`[data-card-id="${id}"]`);
const tap=(p,id)=>card(p,id).tap({position:{x:12,y:12}});
async function load(page,state=newGame(123)) {
  await page.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key,state});
  await page.goto('/#spider');await expect(page.locator('.stack')).toHaveCount(10);
}
async function geometry(page) {
  return page.evaluate(()=>{
    const rect=e=>e.getBoundingClientRect(),board=rect(document.querySelector('#board')),scroll=document.querySelector('#tableau-scroll');
    const columns=[...document.querySelectorAll('.stack')];
    return {
      width:innerWidth,pageOverflow:document.documentElement.scrollWidth>innerWidth,
      boardOverflow:scroll.scrollWidth>scroll.clientWidth,
      contained:columns.every(p=>rect(p.lastElementChild).bottom<=rect(p).bottom+1&&rect(p.lastElementChild).bottom<=board.bottom),
      cards:columns.flatMap(p=>[...p.querySelectorAll('.card:not(.back)')].map(c=>{
        const r=rect(c),next=c.nextElementSibling,limit=next?rect(next).top:r.bottom,mark=rect(c.querySelector('.card-corner'));
        return {width:r.width,exposed:limit-r.top,readable:mark.bottom<=limit&&mark.right<=r.right};
      }))
    };
  });
}
for(const [width,height] of [[375,667],[390,844],[430,932],[768,1024],[1440,900]]) {
  test(`Spider initial and long columns ${width}x${height}`,async({page},info)=>{
    await page.setViewportSize({width,height});await load(page);
    await expect(page.locator('.stack .card')).toHaveCount(54);await expect(page.locator('.stack .back')).toHaveCount(44);
    await expect(page.locator('.run-marker')).toHaveCount(8);await expect(page.getByRole('combobox',{name:'Draw',exact:true})).toBeHidden();
    let g=await geometry(page);expect(g.width).toBe(width);expect(g.pageOverflow).toBe(false);expect(g.boardOverflow).toBe(false);expect(g.contained).toBe(true);
    expect(g.cards.every(c=>c.width>=32&&c.exposed>=44&&c.readable)).toBe(true);
    await page.screenshot({path:info.outputPath(`spider-initial-${width}.png`),fullPage:true});
    await page.getByRole('combobox',{name:'Cards',exact:true}).selectOption('large');
    await page.screenshot({path:info.outputPath(`spider-large-${width}.png`),fullPage:true});
    await page.getByRole('combobox',{name:'Cards',exact:true}).selectOption('fit');
    await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:spiderLong()});
    const other=await page.context().newPage();await other.setViewportSize({width,height});await other.goto('/#spider');
    g=await geometry(other);expect(g.pageOverflow).toBe(false);expect(g.contained).toBe(true);expect(g.cards.every(c=>c.readable&&c.exposed>=44)).toBe(true);
    await col(other,0).locator('.card').last().scrollIntoViewIfNeeded();await expect(col(other,0).locator('.card').last()).toBeInViewport();
    await other.screenshot({path:info.outputPath(`spider-long-${width}.png`),fullPage:true});
    await other.getByRole('combobox',{name:'Cards',exact:true}).selectOption('large');
    g=await geometry(other);expect(g.pageOverflow).toBe(false);expect(g.cards.every(c=>c.width>=44&&c.exposed>=44&&c.readable)).toBe(true);
    expect(g.boardOverflow).toBe(width<600);
  });
}
test('Spider touch sequences, reveal, empty destination, deselection, undo and restoration',async({page})=>{
  const s=spiderPuzzle(),queen=s.tableau[0][1].id,king=s.tableau[1][0].id;
  await load(page,s);await tap(page,queen);await tap(page,queen);await expect(page.locator('.selected')).toHaveCount(0);
  await tap(page,queen);await tap(page,king);await expect(col(page,0).locator('.back')).toHaveCount(0);
  await expect(col(page,1).locator('.card')).toHaveCount(3);
  await tap(page,s.tableau[3][0].id);await page.getByRole('button',{name:'Empty column 3',exact:true}).tap();
  expect((await saved(page)).tableau[2][0].rank).toBe(5);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();const progress=await saved(page);expect(validate(progress)).toBe(true);
  await page.reload();expect(await saved(page)).toEqual(progress);await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
});
test('Spider large-card view preserves selection across horizontal scrolling',async({page})=>{
  const s=spiderPuzzle();await page.setViewportSize({width:375,height:667});await load(page,s);
  await page.getByRole('combobox',{name:'Cards',exact:true}).selectOption('large');
  await tap(page,s.tableau[0][1].id);
  await page.locator('#tableau-scroll').evaluate(el=>{el.scrollLeft=el.scrollWidth;});
  await expect(page.locator('[aria-pressed="true"]')).toHaveCount(1);
  // Column 10 is rank 3: this invalid destination must keep the selection/state.
  const before=await saved(page);await tap(page,s.tableau[9][0].id);expect(await saved(page)).toEqual(before);
  await expect(page.locator('#selection')).toContainText('Move unavailable');
  await page.locator('#tableau-scroll').evaluate(el=>{el.scrollLeft=0;});
  await tap(page,s.tableau[1][0].id);await expect(col(page,1).locator('.card')).toHaveCount(3);
  await page.reload();await expect(page.getByRole('combobox',{name:'Cards',exact:true})).toHaveValue('large');
});
test('Spider completion and reveal are undone together; eighth run wins',async({page})=>{
  const s=spiderCompletion();await load(page,s);await tap(page,s.tableau[1][0].id);await tap(page,s.tableau[0].at(-1).id);
  await expect(page.locator('.run-marker.complete')).toHaveCount(1);await expect(col(page,0).locator('.card')).toHaveCount(1);await expect(col(page,0).locator('.back')).toHaveCount(0);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();expect(await saved(page)).toEqual(s);
  const end=spiderNearWin();await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:end});await page.reload();
  await tap(page,end.tableau[1][0].id);await tap(page,end.tableau[0].at(-1).id);
  await expect(page.locator('#status')).toHaveText('You won!');await expect(page.locator('.run-marker.complete')).toHaveCount(8);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();await expect(page.locator('#status')).toContainText('Runs: 7/8');
});
test('Spider stock deals complete rows, exhausts, blocks empty columns and supports Undo',async({page})=>{
  await load(page);for(let i=0;i<5;i++)await page.getByRole('button',{name:/^Deal row /}).tap();
  expect((await saved(page)).stock).toHaveLength(0);await page.getByRole('button',{name:'Stock exhausted',exact:true}).tap();await expect(page.locator('#selection')).toContainText('No stock rows');
  await page.getByRole('button',{name:'Undo',exact:true}).tap();expect((await saved(page)).stock).toHaveLength(10);
  let s=spiderDealCompletion();s.tableau[1].push(...s.tableau[2]);s.tableau[2]=[];
  await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:s});await page.reload();
  const before=await saved(page);await page.getByRole('button',{name:/^Deal row /}).tap();expect(await saved(page)).toEqual(before);await expect(page.locator('#selection')).toContainText('Fill every empty column');
  s=spiderDealCompletion();await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key,state:s});await page.reload();
  await page.getByRole('button',{name:/^Deal row /}).tap();await expect(page.locator('.run-marker.complete')).toHaveCount(1);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();expect(await saved(page)).toEqual(s);
});
test('Spider hints, numbered replay, Restart, New deal and independent saves',async({page})=>{
  await load(page);const before=await saved(page);await page.getByRole('button',{name:'Hint',exact:true}).tap();expect(await saved(page)).toEqual(before);await expect(page.locator('#selection')).not.toBeEmpty();
  const selected=page.locator('[aria-pressed="true"]');if(await selected.count())await selected.tap({position:{x:12,y:12}});
  await page.getByRole('button',{name:/^Deal row /}).tap();const progress=await saved(page);
  await page.getByRole('link',{name:'FreeCell',exact:true}).tap();await expect(page.locator('.stack')).toHaveCount(8);
  await page.getByRole('link',{name:'Klondike',exact:true}).tap();await expect(page.locator('.stack')).toHaveCount(7);await page.getByRole('button',{name:/^Draw 1 /}).tap();
  const k=await page.evaluate(()=>localStorage.getItem('classic-win-klondike-v1'));
  await page.getByRole('link',{name:'Spider',exact:true}).tap();await expect(page.locator('.stack')).toHaveCount(10);expect(await saved(page)).toEqual(progress);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Restart',exact:true}).tap();expect((await saved(page)).tableau).toEqual(before.tableau);
  await page.getByRole('spinbutton',{name:'Deal number',exact:true}).fill('42');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Play deal',exact:true}).tap();expect((await saved(page)).tableau).toEqual(newGame(42).tableau);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'New deal',exact:true}).tap();expect(validate(await saved(page))).toBe(true);expect((await saved(page)).moves).toBe(0);
  expect(await page.evaluate(()=>localStorage.getItem('classic-win-klondike-v1'))).toBe(k);
});
test('Spider cached route reloads offline, switches games, then reconnects',async({page})=>{
  const deployment=await deploymentServer();
  try {
    await page.goto(deployment.url+'#spider');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    await page.getByRole('button',{name:/^Deal row /}).tap();const progress=await saved(page);
    deployment.disconnected=true;await page.reload();await expect(page.locator('.stack')).toHaveCount(10);expect(await saved(page)).toEqual(progress);
    await page.getByRole('link',{name:'FreeCell',exact:true}).tap();await expect(page.locator('.stack')).toHaveCount(8);
    await page.getByRole('link',{name:'Spider',exact:true}).tap();await expect(page.locator('.stack')).toHaveCount(10);expect(await saved(page)).toEqual(progress);
    deployment.disconnected=false;await page.reload();await expect(page.locator('.stack')).toHaveCount(10);
  } finally {await deployment.close();}
});
