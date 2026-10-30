import test from 'node:test';import assert from 'node:assert/strict';import {newGame,validate,drawStock,move} from '../src/klondike.js';
test('seeded deals reproducible and complete',()=>{const a=newGame(123),b=newGame(123);assert.deepEqual(a,b);assert.ok(validate(a));assert.equal(a.tableau.length,7);assert.equal(a.stock.length,24)});
test('draw one and three preserve deck',()=>{for(const count of [1,3]){let s=newGame(12,count);s=drawStock(s);assert.equal(s.waste.length,count);assert.ok(validate(s))}});
test('reject illegal foundation moves',()=>{const s=newGame(1);assert.equal(move(s,{kind:'tableau',index:0},{kind:'foundations',index:0},0),null)});
test('stock recycles and preserves cards',()=>{let s=newGame(8,3);for(let i=0;i<8;i++)s=drawStock(s);assert.equal(s.stock.length,0);s=drawStock(s);assert.equal(s.stock.length,24);assert.ok(validate(s))});
import {puzzle,longColumn} from './browser/fixtures.js';
test('sequence move reveals covered card; king moves to empty column',()=>{
  const s=puzzle(),before=structuredClone(s);
  const moved=move(s,{kind:'tableau',index:0},{kind:'tableau',index:1},1);
  assert.ok(validate(moved));assert.deepEqual(s,before);assert.ok(moved.tableau[0][0].up);
  assert.equal(moved.tableau[1].length,3);
  const king=move(moved,{kind:'tableau',index:1},{kind:'tableau',index:2},0);
  assert.ok(validate(king));assert.equal(king.tableau[2].length,3);
  assert.equal(move(s,{kind:'tableau',index:0},{kind:'tableau',index:2},1),null);
});
test('waste to tableau; foundations enforce single card, suit and rank',()=>{
  let s=puzzle();s=move(s,{kind:'waste'},{kind:'tableau',index:5});assert.ok(validate(s));
  s=move(s,{kind:'tableau',index:3},{kind:'foundations',index:0});assert.ok(validate(s));
  s=move(s,{kind:'tableau',index:4},{kind:'foundations',index:0});assert.equal(s.foundations[0].length,2);
  assert.equal(move(s,{kind:'tableau',index:0},{kind:'foundations',index:0},1),null);
  const back=move(s,{kind:'foundations',index:0},{kind:'tableau',index:6});assert.equal(back,null);
});
test('recycle restores original draw order with partial draw-three batches',()=>{
  let s=newGame(9,3);const expected=s.stock.at(-1).id;
  // Remove one card through a real legal foundation move when available;
  // exercise a partial batch separately using a small valid stock partition.
  const c=s.stock.splice(0,1)[0];c.up=true;s.waste.push(c);
  for(let i=0;i<8;i++)s=drawStock(s);
  assert.equal(s.stock.length,0);assert.equal(s.waste.length,24);
  s=drawStock(s);s=drawStock(s);assert.equal(s.waste[0].id,c.id);assert.ok(validate(s));
  let full=newGame(9,1);for(let i=0;i<24;i++)full=drawStock(full);
  full=drawStock(full);full=drawStock(full);assert.equal(full.waste[0].id,expected);
});
test('validate rejects malformed saved games without throwing',()=>{
  for(const value of [null,{},[],{stock:null}, {...newGame(1),draw:2}, {...newGame(1),tableau:[]}])assert.equal(validate(value),false);
  const s=newGame(1);s.stock[0].rank=42;assert.equal(validate(s),false);
  assert.ok(validate(puzzle()));assert.ok(validate(longColumn()));
});
test('many seeded draws preserve canonical state and do not mutate input',()=>{
  for(let seed=1;seed<=100;seed++)for(const count of [1,3]) {
    let s=newGame(seed,count);
    for(let i=0;i<30;i++) {const before=structuredClone(s),n=drawStock(s);assert.deepEqual(s,before);assert.ok(validate(n));s=n;}
  }
});
