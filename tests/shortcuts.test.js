import test from 'node:test';
import assert from 'node:assert/strict';
import * as klondike from '../src/klondike.js';
import * as freecell from '../src/freecell.js';
import {toFoundation,finishGame} from '../src/shortcuts.js';
import {puzzle} from './browser/fixtures.js';
import {almostWon} from './browser/freecell-fixtures.js';

test('foundation shortcut only moves a single exposed top card using legal homes',()=>{
  const state=puzzle(),before=structuredClone(state);
  assert.equal(toFoundation(state,klondike.move,{kind:'tableau',index:0},1),null);
  assert.equal(toFoundation(state,klondike.move,{kind:'tableau',index:6},0),null);
  const next=toFoundation(state,klondike.move,{kind:'tableau',index:3},0);
  assert.ok(klondike.validate(next));assert.equal(next.foundations[0][0].rank,1);
  assert.deepEqual(state,before);
});
for(const [game,engine] of Object.entries({klondike,freecell})) {
  test(`${game} finishes only a proven foundation-only path without mutating the input`,()=>{
    const state=almostWon();
    if(game==='klondike') {
      delete state.game;delete state.version;delete state.cells;
      state.tableau.pop();state.draw=1;state.stock=[];state.waste=[];state.passes=0;
    }
    const before=structuredClone(state),next=finishGame(state,engine.move,engine.won);
    assert.ok(engine.won(next));assert.ok(engine.validate(next));
    assert.equal(next.moves,state.moves+4);assert.deepEqual(state,before);
    assert.equal(finishGame(next,engine.move,engine.won),null);
    assert.equal(finishGame(engine.newGame(123),engine.move,engine.won),null);
  });
}
