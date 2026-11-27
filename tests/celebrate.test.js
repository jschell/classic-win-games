import test from 'node:test';
import assert from 'node:assert/strict';
import {deck} from '../src/cards.js';
import {launchOrder,launch,step} from '../src/celebrate.js';

const homes=()=>{const cards=deck().map(c=>({...c,up:true}));return Array.from({length:4},(_,i)=>cards.slice(i*13,i*13+13));};

test('cards leave every home top-down, one rank round at a time',()=>{
  const order=launchOrder(homes());
  assert.equal(order.length,52);
  assert.equal(new Set(order.map(o=>o.card.id)).size,52);
  assert.deepEqual(order.slice(0,4).map(o=>[o.pile,o.card.rank]),[[0,13],[1,13],[2,13],[3,13]]);
  assert.deepEqual(order.slice(-4).map(o=>o.card.rank),[1,1,1,1]);
  // Input piles are not consumed.
  const piles=homes();launchOrder(piles);assert.equal(piles.flat().length,52);
});
test('Spider run order (King first) and empty piles are handled',()=>{
  const [run]=homes();
  const order=launchOrder([[...run].reverse(),[]]);
  assert.deepEqual(order.map(o=>o.card.rank),[13,12,11,10,9,8,7,6,5,4,3,2,1]);
  assert.ok(order.every(o=>o.pile===0));
});
test('launch keeps the origin and picks a sideways, non-downward velocity',()=>{
  const p=launch({x:10,y:20,w:40,h:56},900,()=>0.25);
  assert.deepEqual([p.x,p.y,p.w,p.h],[10,20,40,56]);
  assert.ok(p.vx<0&&Math.abs(p.vx)>=2.5);assert.ok(p.vy<=0);
  assert.ok(launch({x:0,y:0,w:1,h:1},900,()=>0.75).vx>0);
});
test('cards bounce on the floor with lost energy and finish off-screen',()=>{
  let p={x:100,y:90,w:20,h:10,vx:5,vy:4};
  p=step(p,400,100);
  assert.equal(p.y,90);assert.ok(p.vy<0&&Math.abs(p.vy)<4.5);assert.equal(p.done,false);
  let frames=0;while(!p.done&&frames++<1000)p=step(p,400,100);
  assert.ok(p.done);assert.ok(p.x>400);
  // Never below the floor at any point.
  p={x:0,y:0,w:10,h:10,vx:-1,vy:0};for(let i=0;i<200&&!p.done;i++){p=step(p,50,60);assert.ok(p.y+p.h<=60);}
  assert.ok(p.done);
});
