import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,validate,move,moveCapacity,isSequence,won,hint} from '../src/freecell.js';
import {freePuzzle,freeLong,almostWon,capacityState} from './browser/freecell-fixtures.js';
const from=(kind,index)=>({kind,index});
test('FreeCell seeded deals have 52 unique face-up cards in 7/7/7/7/6/6/6/6 columns',()=>{
  const a=newGame(123);assert.deepEqual(a,newGame(123));assert.notDeepEqual(a.tableau,newGame(124).tableau);
  assert.deepEqual(a.tableau.map(p=>p.length),[7,7,7,7,6,6,6,6]);assert.ok(validate(a));
  for(let seed=1;seed<=200;seed++)assert.ok(validate(newGame(seed)));
  for(const seed of [0,-1,1.5,NaN,Infinity,2147483648])assert.throws(()=>newGame(seed),RangeError);
});
test('free cells hold one exposed card; moves preserve input and canonical deck',()=>{
  const s=freePuzzle(),before=structuredClone(s);
  assert.equal(move(s,from('tableau',0),from('cells',1),0),null);
  let n=move(s,from('tableau',0),from('cells',1),1);
  assert.ok(validate(n));assert.deepEqual(s,before);assert.equal(n.cells[1][0].rank,11);
  assert.equal(move(n,from('tableau',0),from('cells',1)),null);
  n=move(n,from('cells',1),from('tableau',0));assert.ok(validate(n));assert.deepEqual(n.tableau,s.tableau);
});
test('alternating descending runs move; any card may fill an empty column',()=>{
  let s=freePuzzle();assert.ok(isSequence(s.tableau[0]));
  s=move(s,from('tableau',0),from('tableau',1),0);assert.equal(s.tableau[1].length,3);assert.ok(validate(s));
  s=move(s,from('cells',0),from('tableau',2));assert.equal(s.tableau[2][0].rank,5);assert.ok(validate(s));
  assert.equal(move(s,from('tableau',6),from('tableau',5)),null);
  assert.equal(isSequence(s.tableau[7]),false);
});
test('capacity accounts for empty cells and columns, excluding an empty destination',()=>{
  for(let cells=0;cells<=4;cells++)for(let columns=0;columns<=6;columns++) {
    const s=capacityState(cells,columns);assert.ok(validate(s));
    assert.equal(moveCapacity(s,1),(cells+1)*2**columns);
    if(columns)assert.equal(moveCapacity(s,2),(cells+1)*2**(columns-1));
    const start=s.tableau[0].length-5;
    assert.equal(Boolean(move(s,from('tableau',0),from('tableau',1),start)),5<=(cells+1)*2**columns);
    if(columns)assert.equal(Boolean(move(s,from('tableau',0),from('tableau',2),start)),5<=(cells+1)*2**(columns-1));
  }
});
test('a newly emptied source is not temporary space; invalid indices/sources rejected',()=>{
  const s=freePuzzle();s.tableau[2]=s.cells[0];s.cells[0]=[s.tableau[7].pop()];
  for(let i=1;i<4;i++)s.cells[i]=[s.tableau[7].pop()];
  assert.ok(validate(s));assert.equal(moveCapacity(s,1),1);
  assert.equal(move(s,from('tableau',0),from('tableau',1),0),null);
  for(const source of [from('foundations',0),from('stock',0),from('tableau',-1),from('tableau',99)])assert.equal(move(s,source,from('tableau',1)),null);
  for(const index of [-1,1.5,99])assert.equal(move(s,from('tableau',0),from('tableau',1),index),null);
});
test('homes ascend by suit, accept one exposed card, and are irreversible; win detected',()=>{
  let s=freePuzzle();assert.equal(move(s,from('tableau',4),from('foundations',0)),null);
  s=move(s,from('tableau',3),from('foundations',0));
  s=move(s,from('tableau',4),from('foundations',0));assert.equal(s.foundations[0].length,2);assert.ok(validate(s));
  assert.equal(move(s,from('foundations',0),from('cells',1)),null);
  let end=almostWon();assert.ok(validate(end));assert.equal(won(end),false);
  for(let i=0;i<4;i++)end=move(end,from('tableau',i),from('foundations',i));
  assert.ok(validate(end));assert.equal(won(end),true);assert.equal(hint(end),null);
});
test('hints identify legal moves; repeated moves preserve deck and inputs',()=>{
  for(let seed=1;seed<=20;seed++) {
    let s=newGame(seed);
    for(let i=0;i<30;i++) {
      const h=hint(s);if(!h)break;const before=structuredClone(s);
      const n=move(s,h.from,h.to,h.start);assert.ok(n);assert.ok(validate(n));assert.deepEqual(s,before);s=n;
    }
  }
});
test('malformed/corrupt or wrong-game saves fail validation without throwing',()=>{
  for(const s of [null,{},[],{...newGame(1),game:'klondike'},{...newGame(1),cells:[]},{...newGame(1),seed:0}])assert.equal(validate(s),false);
  const s=newGame(1);s.tableau[0][0].up=false;assert.equal(validate(s),false);
  const bad=newGame(2);bad.tableau[0][0].rank=90;assert.equal(validate(bad),false);
  for(const fixture of [freePuzzle(),freeLong(),almostWon()])assert.ok(validate(fixture));
});
