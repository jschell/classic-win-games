import test from 'node:test';
import assert from 'node:assert/strict';
import {appendHistory,loadHistory,saveGame,HISTORY_LIMIT} from '../src/history.js';
import * as klondike from '../src/klondike.js';

function storage() {
  const values=new Map();
  return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
}
test('Undo survives saving and is bound to the exact current board',()=>{
  const store=storage(),initial=klondike.newGame(123),next=klondike.drawStock(initial);
  saveGame(store,'game',next,[initial]);
  assert.deepEqual(loadHistory(store,'game',next,klondike.validate),[initial]);
  assert.deepEqual(loadHistory(store,'game',klondike.drawStock(next),klondike.validate),[]);
});
test('Undo caps the oldest states at 100 without mutating the previous chain',()=>{
  let history=[];
  for(let i=0;i<150;i++)history=appendHistory(history,{moves:i});
  assert.equal(history.length,HISTORY_LIMIT);
  assert.equal(history[0].moves,50);
  assert.equal(appendHistory(history,{moves:150}).at(-1).moves,150);
  assert.equal(history.at(-1).moves,149);
});
test('corrupt, invalid, cross-deal and cross-rule Undo histories are discarded',()=>{
  const store=storage(),current=klondike.newGame(123);
  for(const states of [[{}],[klondike.newGame(456)],[klondike.newGame(123,3)],
    Array.from({length:101},()=>current),null]) {
    store.setItem('game-undo',JSON.stringify({current:JSON.stringify(current),states}));
    assert.deepEqual(loadHistory(store,'game',current,klondike.validate),[]);
  }
  store.setItem('game-undo','{broken');
  assert.deepEqual(loadHistory(store,'game',current,klondike.validate),[]);
});
test('a failed Undo write still attempts to save the current game',()=>{
  let saved;
  const store={setItem(key,value){if(key.endsWith('-undo'))throw Error('quota');saved=value;}};
  const state=klondike.newGame(123);
  assert.throws(()=>saveGame(store,'game',state,[]),/quota/);
  assert.deepEqual(JSON.parse(saved),state);
});
