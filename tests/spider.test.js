import test from 'node:test';
import assert from 'node:assert/strict';
import {deck,newGame,move,dealRow,canDeal,isSequence,validate,won,hint} from '../src/spider.js';
import {spiderPuzzle,spiderCompletion,spiderDoubleCompletion,spiderNearWin,spiderDealCompletion,spiderLong} from './browser/spider-fixtures.js';
const col=index=>({kind:'tableau',index});
test('Spider has 104 distinct cards, eight copies of every rank, and a seeded 54/50 deal',()=>{
  const cards=deck();assert.equal(new Set(cards.map(c=>c.id)).size,104);
  for(let rank=1;rank<=13;rank++)assert.equal(cards.filter(c=>c.rank===rank&&c.suit==='♠').length,8);
  const s=newGame(123);assert.deepEqual(s,newGame(123));assert.notDeepEqual(s.tableau,newGame(124).tableau);
  assert.deepEqual(s.tableau.map(p=>p.length),[6,6,6,6,5,5,5,5,5,5]);assert.equal(s.stock.length,50);
  assert.equal(s.tableau.flat().filter(c=>c.up).length,10);assert.ok(validate(s));
  for(const seed of [0,-1,1.1,Infinity,NaN,2147483648])assert.throws(()=>newGame(seed),RangeError);
});
test('ordered sequences move without free-cell capacity; any card can fill an empty column',()=>{
  const s=spiderPuzzle(),before=structuredClone(s);
  let n=move(s,col(0),col(1),1);assert.ok(validate(n));assert.deepEqual(s,before);
  assert.deepEqual(n.tableau[1].map(c=>c.rank),[13,12,11]);assert.ok(n.tableau[0][0].up);
  n=move(n,col(3),col(2));assert.equal(n.tableau[2][0].rank,5);assert.ok(validate(n));
});
test('face-down, unordered, same-column and invalid-source/index moves are rejected',()=>{
  const s=spiderPuzzle();
  for(const [from,to,start] of [[col(0),col(1),0],[col(0),col(0),1],[col(0),col(4),1],[col(-1),col(1),0],[col(0),col(12),1],[col(0),col(1),1.5],[{kind:'stock',index:0},col(1),0]])assert.equal(move(s,from,to,start),null);
  assert.equal(isSequence([{rank:3,suit:'♠',up:true},{rank:2,suit:'♥',up:true}]),false);
  assert.equal(isSequence([]),false);
});
test('completed runs remove automatically and reveal cards, without changing input',()=>{
  const s=spiderCompletion(),before=structuredClone(s),n=move(s,col(1),col(0));
  assert.deepEqual(s,before);assert.ok(validate(n));assert.equal(n.completed[0].length,13);
  assert.deepEqual(n.completed[0].map(c=>c.rank),Array.from({length:13},(_,i)=>13-i));
  assert.equal(n.tableau[0].length,1);assert.ok(n.tableau[0][0].up);assert.equal(n.moves,1);
});
test('run removal cascades when another full run becomes exposed',()=>{
  const n=move(spiderDoubleCompletion(),col(1),col(0));assert.ok(validate(n));
  assert.equal(n.completed.filter(p=>p.length).length,2);assert.equal(n.tableau[0].length,1);assert.ok(n.tableau[0][0].up);
});
test('stock deals exactly one face-up card per column in order; five rows exhaust stock',()=>{
  let s=newGame(17);
  for(let row=0;row<5;row++) {
    const before=structuredClone(s),expected=s.stock.slice(-10).reverse().map(c=>c.id);
    const n=dealRow(s);assert.deepEqual(s,before);assert.ok(validate(n));
    assert.deepEqual(n.tableau.map(p=>p.at(-1).id),expected);assert.ok(n.tableau.every(p=>p.at(-1).up));
    assert.equal(n.stock.length,40-row*10);assert.equal(n.moves,row+1);s=n;
  }
  assert.equal(dealRow(s),null);assert.equal(canDeal(s),false);
});
test('empty columns block a stock row; stock deal and automatic completion are one action',()=>{
  const s=newGame(8);s.tableau[1].unshift(...s.tableau[0].map(c=>({...c,up:false})));s.tableau[0]=[];
  assert.ok(validate(s));assert.equal(canDeal(s),false);assert.equal(dealRow(s),null);
  const before=spiderDealCompletion(),n=dealRow(before);assert.ok(validate(n));assert.equal(n.moves,1);
  assert.equal(n.completed[0].length,13);assert.equal(n.tableau[0].length,1);assert.equal(n.stock.length,0);
});
test('eighth completed run wins and a saved prior state remains available for Undo',()=>{
  const s=spiderNearWin();assert.ok(validate(s));assert.equal(won(s),false);
  const n=move(s,col(1),col(0));assert.ok(validate(n));assert.ok(won(n));assert.equal(n.tableau.flat().length,0);
  assert.equal(won(s),false);assert.equal(s.completed.filter(p=>p.length).length,7);assert.equal(hint(n),null);
});
test('generated hints are legal and repeated play conserves all 104 cards',()=>{
  for(let seed=1;seed<=10;seed++) {
    let s=newGame(seed);
    for(let i=0;i<25;i++) {
      const h=hint(s);if(!h)break;
      const before=structuredClone(s),n=h.type==='deal'?dealRow(s):move(s,h.from,h.to,h.start);
      assert.ok(n);assert.ok(validate(n));assert.deepEqual(s,before);s=n;
    }
  }
});
test('validation rejects corrupt decks, visibility, completed runs and other games',()=>{
  for(const s of [null,{},[],{...newGame(1),game:'freecell'},{...newGame(1),suits:2},{...newGame(1),completed:[]}])assert.equal(validate(s),false);
  const duplicate=newGame(1);duplicate.stock[0]=duplicate.stock[1];assert.equal(validate(duplicate),false);
  const hidden=newGame(1);hidden.tableau[0].at(-1).up=false;assert.equal(validate(hidden),false);
  const badRun=spiderNearWin();badRun.completed[0].reverse();assert.equal(validate(badRun),false);
  const badStock=newGame(1);badStock.stock[0].up=true;assert.equal(validate(badStock),false);
  for(const s of [spiderPuzzle(),spiderCompletion(),spiderDoubleCompletion(),spiderNearWin(),spiderDealCompletion(),spiderLong()])assert.ok(validate(s));
});
