import {test,expect} from '@playwright/test';
import {puzzle,won} from './fixtures.js';
import {freePuzzle,almostWon} from './freecell-fixtures.js';
import {spiderPuzzle} from './spider-fixtures.js';
const key=game=>`classic-win-${game}-v1`;
async function load(page,game,state) {
  await page.addInitScript(({key,state})=>{
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));
  },{key:key(game),state});
  await page.goto(`/#${game}`);
  await expect(page.locator('.stack')).toHaveCount(state.tableau.length);
}
const saved=(page,game)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key(game));
const pile=(page,name)=>page.getByRole('group',{name,exact:true});

for(const [game,fixture] of Object.entries({klondike:puzzle,freecell:freePuzzle})) {
  test(`${game} rapid touch taps cancel without sending a card home`,async({page})=>{
    await load(page,game,fixture());
    const before=await saved(page,game);
    const ace=page.getByRole('button',{name:'A of clubs',exact:true});
    await ace.tap();await ace.tap();
    expect(await saved(page,game)).toEqual(before);
    await expect(page.locator('.selected')).toHaveCount(0);
  });
  test(`${game} desktop double-click sends a top card home and Undo survives reload`,async({page})=>{
    await load(page,game,fixture());
    await page.getByRole('button',{name:'A of clubs',exact:true}).dblclick();
    expect((await saved(page,game)).foundations[0][0].rank).toBe(1);
    await page.reload();
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    expect((await saved(page,game)).foundations[0]).toHaveLength(0);
    await expect(page.getByRole('button',{name:'A of clubs',exact:true})).toBeVisible();
  });
}
for(const [game,fixture] of Object.entries({klondike:puzzle,freecell:freePuzzle,spider:spiderPuzzle})) {
  test(`${game} desktop drag moves sequences and invalid drops leave the board intact`,async({page})=>{
    await page.setViewportSize({width:1440,height:900});
    await load(page,game,fixture());
    const before=await saved(page,game);
    // Use the exposed strip when dragging the head of a sequence.
    const source=pile(page,'Column 1').locator('.card').filter({hasText:game==='spider'?'Q♠':'Q♥'});
    await source.dragTo(pile(page,'Column 2').locator('.card'),{sourcePosition:{x:12,y:12}});
    const moved=await saved(page,game);
    expect(moved.moves).toBe(before.moves+1);
    expect(moved.tableau[1]).toHaveLength(3);
    await pile(page,'Column 2').locator('.card').last().dragTo(pile(page,game==='spider'?'Column 5':'Column 6'),{sourcePosition:{x:12,y:12}});
    expect(await saved(page,game)).toEqual(moved);
  });
  test(`${game} empty column tap without a selection is quiet`,async({page})=>{
    await load(page,game,fixture());
    await page.getByRole('button',{name:'Empty column 3',exact:true}).tap();
    await expect(page.locator('#selection')).toBeEmpty();
  });
}
test('Finish wins FreeCell as one undoable action, including after refresh',async({page})=>{
  const before=almostWon();await load(page,'freecell',before);
  await page.getByRole('button',{name:'Finish game',exact:true}).tap();
  await expect(page.locator('#status')).toHaveText('You won!');
  await page.reload();
  await page.getByRole('button',{name:'Undo',exact:true}).tap();
  expect(await saved(page,'freecell')).toEqual(before);
  await expect(page.getByRole('button',{name:'Finish game',exact:true})).toBeEnabled();
});
test('unfinished Klondike disables Finish and hints disclose the search limit',async({page})=>{
  await load(page,'klondike',puzzle());
  await expect(page.getByRole('button',{name:'Finish game',exact:true})).toBeDisabled();
  await expect(page.locator('#help')).toContainText('Hints are local nudges');
  await expect(page.locator('#hint')).toHaveAttribute('title',/up to three moves/);
});
const hint=page=>page.getByRole('button',{name:'Hint',exact:true});
const celebration=page=>page.locator('canvas.celebration');
test('winning bounces the cards, disables Hint, and a tap or key clears it',async({page})=>{
  await load(page,'freecell',almostWon());
  await expect(hint(page)).toBeEnabled();
  await page.getByRole('button',{name:'Finish game',exact:true}).tap();
  await expect(page.locator('#status')).toHaveText('You won!');
  await expect(hint(page)).toBeDisabled();
  await expect(celebration(page)).toHaveCount(1);
  await expect(celebration(page)).toHaveAttribute('aria-hidden','true');
  // The trail is painted, not cleared: some pixels become opaque.
  await expect.poll(()=>celebration(page).evaluate(c=>{
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    for(let i=3;i<d.length;i+=4)if(d[i])return true;return false;
  })).toBe(true);
  await page.locator('#help').tap();
  await expect(celebration(page)).toHaveCount(0);
  // Win again and dismiss from the keyboard; win again and one tap on Undo both
  // clears the cards and undoes, because the overlay never swallows input.
  await page.getByRole('button',{name:'Undo',exact:true}).tap();
  await expect(hint(page)).toBeEnabled();
  await page.getByRole('button',{name:'Finish game',exact:true}).tap();
  await expect(celebration(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(celebration(page)).toHaveCount(0);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();
  // A keyboard win: the Enter that finishes the game does not clear it.
  await page.getByRole('button',{name:'Finish game',exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#status')).toHaveText('You won!');
  await page.waitForTimeout(100);
  await expect(celebration(page)).toHaveCount(1);
  await page.getByRole('button',{name:'Undo',exact:true}).tap();
  await expect(celebration(page)).toHaveCount(0);
  await expect(page.locator('#status')).not.toHaveText('You won!');
});
test('a saved won Klondike deal disables Hint without replaying the celebration',async({page})=>{
  await load(page,'klondike',won());
  await expect(page.locator('#status')).toHaveText('You won!');
  await expect(hint(page)).toBeDisabled();
  await expect(celebration(page)).toHaveCount(0);
  // Stale or scripted clicks are also refused rather than searching.
  await page.evaluate(()=>{const b=document.getElementById('hint');b.disabled=false;b.click();});
  await expect(page.locator('#selection')).toHaveText('You won! Start a new deal to play again.');
  // Hearts keeps its own hint, even after visiting a won solitaire deal.
  await page.goto('/#hearts');
  await expect(hint(page)).toBeEnabled();
});
test('reduced motion wins without the celebration',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await load(page,'freecell',almostWon());
  await page.getByRole('button',{name:'Finish game',exact:true}).tap();
  await expect(page.locator('#status')).toHaveText('You won!');
  await page.waitForTimeout(200);
  await expect(celebration(page)).toHaveCount(0);
});
