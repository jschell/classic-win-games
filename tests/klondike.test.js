import test from 'node:test';import assert from 'node:assert/strict';import {newGame,validate,drawStock,move} from '../src/klondike.js';
test('seeded deals reproducible and complete',()=>{const a=newGame(123),b=newGame(123);assert.deepEqual(a,b);assert.ok(validate(a));assert.equal(a.tableau.length,7);assert.equal(a.stock.length,24)});
test('draw one and three preserve deck',()=>{for(const count of [1,3]){let s=newGame(12,count);s=drawStock(s);assert.equal(s.waste.length,count);assert.ok(validate(s))}});
test('reject illegal foundation moves',()=>{const s=newGame(1);assert.equal(move(s,{kind:'tableau',index:0},{kind:'foundations',index:0},0),null)});
test('stock recycles and preserves cards',()=>{let s=newGame(8,3);for(let i=0;i<8;i++)s=drawStock(s);assert.equal(s.stock.length,0);s=drawStock(s);assert.equal(s.stock.length,24);assert.ok(validate(s))});
