import {test,expect} from '@playwright/test';
import * as spider from '../../src/spider.js';
import * as freecell from '../../src/freecell.js';
import * as klondike from '../../src/klondike.js';
import {positionKey,candidates} from '../../src/hints.js';
import {equivalentSpider} from './hint-fixtures.js';
const engines={spider,freecell,klondike};
const pile=(s,from)=>from.kind==='waste'?s.waste:s[from.kind][from.index];
async function load(page,game,state,trail=[positionKey(state)]) {
  const key=`classic-win-${game}-v1`;
  await page.addInitScript(({key,state,trail})=>{
    if(!localStorage.getItem(key)) {
      localStorage.setItem(key,JSON.stringify(state));localStorage.setItem(`${key}-hint-trail`,JSON.stringify(trail));
    }
  },{key,state,trail});
  await page.goto(`/#${game}`);await expect(page.locator('.stack')).toHaveCount(state.tableau.length);
  return key;
}
const read=(page,key)=>page.evaluate(key=>({state:JSON.parse(localStorage.getItem(key)),trail:JSON.parse(localStorage.getItem(`${key}-hint-trail`))}),key);
async function play(page,s,h) {
  if(h.type!=='move') {await page.locator('#top [data-kind="stock"] button').tap();return;}
  const card=pile(s,h.from)[h.start];
  await page.locator(`[data-card-id="${card.id}"]`).tap({position:{x:12,y:12}});
  const dst=s[h.to.kind][h.to.index];
  if(dst.length)await page.locator(`[data-card-id="${dst.at(-1).id}"]`).tap({position:{x:12,y:12}});
  else {
    const label=h.to.kind==='tableau'?'column':h.to.kind==='cells'?'cell':'foundation';
    await page.getByRole('button',{name:`Empty ${label} ${h.to.index+1}`,exact:true}).tap();
  }
}
test('Spider equivalent Queen supports suggest stock, clear old selection and remain stable on repeated taps',async({page},info)=>{
  await page.setViewportSize({width:375,height:667});const s=equivalentSpider(),key=await load(page,'spider',s);
  await page.locator(`[data-card-id="${s.tableau[1][2].id}"]`).tap({position:{x:12,y:12}});
  for(let i=0;i<5;i++) {
    await page.getByRole('button',{name:'Hint',exact:true}).tap();
    await expect(page.locator('#selection')).toContainText('dealing a new row');
    await expect(page.locator('.selected')).toHaveCount(0);
  }
  expect((await read(page,key)).state).toEqual(s);
  await page.screenshot({path:info.outputPath('spider-equivalent-supports-375.png'),fullPage:true});
});
for(const [game,engine] of Object.entries(engines)) {
  test(`${game} touch hint walks avoid repeats; Undo, refresh and game switches retain the correct trail`,async({page})=>{
    const s=engine.newGame(123),key=await load(page,game,s);
    let first;
    for(let i=0;i<10;i++) {
      const before=await read(page,key),h=engine.hint(before.state,before.trail);
      await page.getByRole('button',{name:'Hint',exact:true}).tap();
      expect(await read(page,key)).toEqual(before);
      if(!h){await expect(page.locator('#selection')).toContainText('No improving hint');break;}
      await expect(page.locator('#selection')).not.toBeEmpty();
      // Hint already selects its source; cancel before exercising explicit touch selection.
      if(h.type==='move')await page.locator(`[data-card-id="${pile(before.state,h.from)[h.start].id}"]`).tap({position:{x:12,y:12}});
      await play(page,before.state,h);
      const after=await read(page,key);expect(after.state.moves).toBe(before.state.moves+1);
      expect(engine.validate(after.state)).toBe(true);expect(before.trail).not.toContain(positionKey(after.state));
      if(!i)first=after;
    }
    const progress=await read(page,key);expect(progress.state.moves).toBeGreaterThan(0);
    await page.getByRole('button',{name:'Undo',exact:true}).tap();const undone=await read(page,key);
    expect(undone.state.moves).toBe(progress.state.moves-1);expect(undone.trail).not.toContain(positionKey(progress.state));
    await page.reload();expect(await read(page,key)).toEqual(undone);
    const other=game==='spider'?'FreeCell':'Spider';await page.getByRole('link',{name:other,exact:true}).tap();
    await page.getByRole('link',{name:game==='freecell'?'FreeCell':game==='spider'?'Spider':'Klondike',exact:true}).tap();
    expect(await read(page,key)).toEqual(undone);expect(first.trail).toHaveLength(2);
  });
  test(`${game} rejects visited outcomes after refresh and Restart clears the trail`,async({page})=>{
    const s=engine.newGame(123),trail=candidates(s,engine.move).map(c=>positionKey(c.state));
    const stock=engine.dealRow?.(s)||engine.drawStock?.(s);if(stock)trail.push(positionKey(stock));trail.push(positionKey(s));
    const key=await load(page,game,s,trail);await page.reload();
    await page.getByRole('button',{name:'Hint',exact:true}).tap();await expect(page.locator('#selection')).toContainText('No improving hint');
    await expect(page.locator('.selected')).toHaveCount(0);expect((await read(page,key)).state).toEqual(s);
    page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Restart',exact:true}).tap();
    expect((await read(page,key)).trail).toEqual([positionKey(s)]);
  });
}
