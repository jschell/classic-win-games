import {test,expect} from '@playwright/test';
import {newGame,validate} from '../../src/spider.js';
import {positionKey} from '../../src/hints.js';
import {multiPuzzle,multiCompletion,multiNearWin,multiLong} from './spider-suit-fixtures.js';
import {deploymentServer} from './server.js';
const key=suits=>suits===1?'classic-win-spider-v1':`classic-win-spider-${suits}-v1`;
const saved=(page,suits)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key(suits));
const tap=(page,c)=>page.locator(`[data-card-id="${c.id}"]`).tap({position:{x:12,y:12}});
async function load(page,suits,state=newGame(123,suits)) {
  await page.addInitScript(({suits,key,state})=>{
    if(!localStorage.getItem(key)){localStorage.setItem('classic-win-spider-suits-v1',String(suits));localStorage.setItem(key,JSON.stringify(state));}
  },{suits,key:key(suits),state});
  await page.goto('/#spider');await expect(page.locator('.stack')).toHaveCount(10);
  await expect(page.getByRole('combobox',{name:'Suits',exact:true})).toHaveValue(String(suits));
}
async function geometry(page) {
  return page.evaluate(()=>{
    const r=e=>e.getBoundingClientRect(),scroll=document.querySelector('#tableau-scroll');
    return {
      overflow:document.documentElement.scrollWidth>innerWidth,
      innerScroll:scroll.scrollWidth>scroll.clientWidth,
      cards:[...document.querySelectorAll('.stack .card:not(.back)')].map(c=>{
        const rect=r(c),mark=r(c.querySelector('.card-corner')),bottom=c.nextElementSibling?r(c.nextElementSibling).top:rect.bottom;
        return {width:rect.width,readable:mark.right<=rect.right&&mark.bottom<=bottom,exposed:bottom-rect.top,contained:rect.bottom<=r(c.parentElement).bottom+1};
      })
    };
  });
}
for(const suits of [2,4]) {
  for(const [width,height] of [[375,667],[390,844],[430,932],[768,1024],[1440,900]])test(`${suits}-suit initial and mixed long columns ${width}x${height}`,async({page},info)=>{
    await page.setViewportSize({width,height});await load(page,suits);
    await expect(page.locator('.stack .card')).toHaveCount(54);await expect(page.locator('.stack .back')).toHaveCount(44);
    let g=await geometry(page);expect(g.overflow).toBe(false);expect(g.innerScroll).toBe(false);expect(g.cards.every(c=>c.readable&&c.contained)).toBe(true);
    await expect(page.locator('.stack .card.red').first()).toHaveCSS('color','rgb(182, 35, 50)');
    await page.screenshot({path:info.outputPath(`spider-${suits}-suits-${width}.png`),fullPage:true});
    await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:key(suits),state:multiLong(suits)});await page.reload();
    g=await geometry(page);expect(g.overflow).toBe(false);expect(g.cards.every(c=>c.readable&&c.contained&&c.exposed>=44)).toBe(true);
    await page.getByRole('combobox',{name:'Cards',exact:true}).selectOption('large');
    g=await geometry(page);expect(g.overflow).toBe(false);expect(g.innerScroll).toBe(width<600);expect(g.cards.every(c=>c.width>=44&&c.readable)).toBe(true);
    await page.locator('.stack').first().locator('.card').last().scrollIntoViewIfNeeded();await expect(page.locator('.stack').first().locator('.card').last()).toBeInViewport();
  });
  test(`${suits}-suit touch moves, mixed-suit rejection, hints, reveals, completion, win and Undo`,async({page})=>{
    const s=multiPuzzle(suits);await load(page,suits,s);
    await tap(page,s.tableau[3][0]);await expect(page.locator('#selection')).toContainText('same-suit');await expect(page.locator('.selected')).toHaveCount(0);
    expect(await saved(page,suits)).toEqual(s);
    await page.getByRole('button',{name:'Hint',exact:true}).tap();await expect(page.locator('#selection')).toContainText('column 3');
    await tap(page,s.tableau[2][0]);let progress=await saved(page,suits);expect(validate(progress)).toBe(true);expect(progress.tableau[0][0].up).toBe(true);
    await page.getByRole('button',{name:'Undo',exact:true}).tap();expect(await saved(page,suits)).toEqual(s);
    // Same-suit group can also land on the next rank of a different suit.
    await tap(page,s.tableau[0][1]);await tap(page,s.tableau[1][0]);expect((await saved(page,suits)).tableau[1]).toHaveLength(3);
    await page.getByRole('button',{name:'Undo',exact:true}).tap();
    await tap(page,s.tableau[3][1]);await page.getByRole('button',{name:'Empty column 8',exact:true}).tap();expect((await saved(page,suits)).tableau[7][0].suit).toBe('♥');
    const completion=multiCompletion(suits);await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:key(suits),state:completion});await page.reload();
    await tap(page,completion.tableau[1][0]);await tap(page,completion.tableau[0].at(-1));await expect(page.locator('.run-marker.complete')).toHaveCount(0);
    await tap(page,completion.tableau[1][0]);await tap(page,completion.tableau[3][0]);
    await tap(page,completion.tableau[2][0]);await tap(page,completion.tableau[0].at(-1));
    await expect(page.getByRole('img',{name:'Run 1 complete, hearts',exact:true})).toHaveCSS('color','rgb(182, 35, 50)');
    await page.getByRole('button',{name:'Undo',exact:true}).tap();await expect(page.locator('.run-marker.complete')).toHaveCount(0);
    const end=multiNearWin(suits);await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:key(suits),state:end});await page.reload();
    await tap(page,end.tableau[1][0]);await tap(page,end.tableau[0].at(-1));await expect(page.locator('#status')).toHaveText('You won!');
    await page.getByRole('button',{name:'Undo',exact:true}).tap();expect(await saved(page,suits)).toEqual(end);
  });
}
test('each suit mode resumes its own board and trail; legacy one-suit save, replay and Restart remain intact',async({page})=>{
  const legacy=newGame(42);await load(page,1,legacy);const progress={1:legacy};
  for(const suits of [2,4,1]) {
    await page.getByRole('combobox',{name:'Suits',exact:true}).selectOption(String(suits));
    await page.getByRole('button',{name:/^Deal row /}).tap();progress[suits]=await saved(page,suits);expect(progress[suits].suits).toBe(suits);
    expect(validate(progress[suits])).toBe(true);
  }
  for(const suits of [2,4,1]) {
    await page.getByRole('combobox',{name:'Suits',exact:true}).selectOption(String(suits));expect(await saved(page,suits)).toEqual(progress[suits]);
    await page.reload();await expect(page.getByRole('combobox',{name:'Suits',exact:true})).toHaveValue(String(suits));expect(await saved(page,suits)).toEqual(progress[suits]);
    expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(`${key}-hint-trail`)).at(-1),key(suits))).toBe(positionKey(progress[suits]));
    await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeDisabled();
  }
  await page.getByRole('combobox',{name:'Suits',exact:true}).selectOption('4');
  await page.getByRole('spinbutton',{name:'Deal number',exact:true}).fill('42');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Play deal',exact:true}).tap();
  expect(await saved(page,4)).toEqual(newGame(42,4));await page.getByRole('button',{name:/^Deal row /}).tap();
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Restart',exact:true}).tap();expect(await saved(page,4)).toEqual(newGame(42,4));
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'New deal',exact:true}).tap();expect((await saved(page,4)).suits).toBe(4);expect((await saved(page,4)).moves).toBe(0);
  expect(await saved(page,1)).toEqual(progress[1]);expect(await saved(page,2)).toEqual(progress[2]);
});
test('invalid mode preference and mismatched saves recover without overwriting another mode',async({page})=>{
  const legacy=newGame(42);
  await page.addInitScript(s=>{
    if(!localStorage.getItem('recovery-seeded')){
      localStorage.setItem('recovery-seeded','1');localStorage.setItem('classic-win-spider-suits-v1','3');
      localStorage.setItem('classic-win-spider-v1',JSON.stringify(s));localStorage.setItem('classic-win-spider-2-v1',JSON.stringify(s));
    }
  },legacy);
  await page.goto('/#spider');await expect(page.getByRole('combobox',{name:'Suits',exact:true})).toHaveValue('1');
  await page.getByRole('combobox',{name:'Suits',exact:true}).selectOption('2');await expect(page.locator('#status')).toContainText('2 suits');
  await page.getByRole('button',{name:/^Deal row /}).tap();expect(validate(await saved(page,2))).toBe(true);expect((await saved(page,2)).suits).toBe(2);
  expect(await saved(page,1)).toEqual(legacy);
});
test('suit switching and new deals work when browser storage is unavailable',async({page})=>{
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked');};Storage.prototype.setItem=()=>{throw Error('blocked');};});
  await page.goto('/#spider');await page.getByRole('combobox',{name:'Suits',exact:true}).selectOption('4');
  await expect(page.getByRole('combobox',{name:'Suits',exact:true})).toHaveValue('4');await expect(page.locator('#status')).toContainText('4 suits');
  await page.getByRole('button',{name:/^Deal row /}).tap();await expect(page.locator('#status')).toContainText('Moves: 1');await expect(page.locator('#storage-note')).toBeVisible();
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'New deal',exact:true}).tap();await expect(page.locator('#status')).toContainText('4 suits');
});
test('multi-suit modes work offline, retain preference and reconnect without losing boards',async({page})=>{
  const deployment=await deploymentServer();
  try {
    await page.goto(deployment.url+'#spider');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();
    await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
    const progress={};
    for(const suits of [2,4]){await page.getByRole('combobox',{name:'Suits',exact:true}).selectOption(String(suits));await page.getByRole('button',{name:/^Deal row /}).tap();progress[suits]=await saved(page,suits);}
    deployment.disconnected=true;await page.reload();await expect(page.getByRole('combobox',{name:'Suits',exact:true})).toHaveValue('4');expect(await saved(page,4)).toEqual(progress[4]);
    await page.getByRole('combobox',{name:'Suits',exact:true}).selectOption('2');expect(await saved(page,2)).toEqual(progress[2]);
    await page.getByRole('button',{name:'Hint',exact:true}).tap();await expect(page.locator('#selection')).not.toBeEmpty();
    deployment.disconnected=false;await page.reload();expect(await saved(page,2)).toEqual(progress[2]);
  } finally {await deployment.close();}
});
