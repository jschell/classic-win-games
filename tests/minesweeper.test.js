import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../src/minesweeper.js';

const copy = value => structuredClone(value);
function field() {
  const s=m.newGame(123);
  s.mines=[0,1,2,3,4,5,6,7,8,80];
  return s;
}
const freeze = s => { Object.freeze(s.revealed); Object.freeze(s.marks); if(s.mines)Object.freeze(s.mines); return Object.freeze(s); };

test('three standard presets defer mines until the first reveal',()=>{
  for(const [level,{width,height,mines}] of Object.entries(m.LEVELS)) {
    const ready=m.newGame(123,level);
    assert.equal(ready.revealed.length,width*height);assert.equal(ready.mines,null);assert.equal(m.validate(ready),true);
    for(const first of [0,width-1,width*Math.floor(height/2)+Math.floor(width/2),width*height-1]) {
      const before=copy(ready), start=m.reveal(freeze(copy(ready)),first);
      assert.equal(m.validate(start),true);assert.equal(start.mines.length,mines);assert.equal(new Set(start.mines).size,mines);
      assert.equal(m.clues(start)[first],0);assert.equal(start.revealed[first],true);
      assert.ok([first,...m.neighbors(start,first)].every(i=>!start.mines.includes(i)));
      assert.deepEqual(m.reveal(ready,first),start);assert.deepEqual(ready,before);
    }
  }
});
test('flags/question marks cycle without starting the clock or revealing a cell',()=>{
  const s=freeze(m.newGame(123));let next=m.mark(s,20);
  assert.equal(next.marks[20],1);assert.equal(next.status,'ready');assert.equal(next.mines,null);
  assert.equal(m.reveal(next,20),null);next=m.mark(next,20);assert.equal(next.marks[20],2);
  next=m.mark(next,20);assert.equal(next.marks[20],0);assert.equal(m.validate(next),true);
  next=m.setQuestions(m.mark(m.mark(s,20),20),false);assert.equal(next.marks[20],0);
  next=m.mark(next,20);assert.equal(next.marks[20],1);next=m.mark(next,20);assert.equal(next.marks[20],0);
  assert.equal(m.reveal(s,-1),null);assert.equal(m.mark(s,81),null);assert.equal(m.chord(s,0),null);
});
test('clues include diagonals without wrapping rows; flood opening preserves flags',()=>{
  const s=field(), values=m.clues(s);
  assert.deepEqual(m.neighbors(s,0),[1,9,10]);assert.equal(values[9],2);assert.equal(values[10],3);
  assert.equal(values[70],1);assert.equal(values[79],1);assert.equal(values[80],-1);
  const marked=m.mark(s,40), opened=m.reveal(marked,41);
  assert.equal(opened.marks[40],1);assert.equal(opened.revealed[40],false);assert.equal(opened.status,'playing');
  assert.ok(opened.revealed.filter(Boolean).length>20);assert.equal(m.validate(opened),true);
});
test('correct chording opens neighbors; matching wrong flags explode a mine',()=>{
  let s=field();s.revealed[9]=true;s.status='playing';
  const before=copy(s);assert.equal(m.chord(s,9),null);
  const correct=m.mark(m.mark(s,0),1), opened=m.chord(freeze(correct),9);
  assert.ok(opened.revealed[10]);assert.equal(m.validate(opened),true);assert.deepEqual(s,before);
  const wrong=m.mark(m.mark(s,0),18), lost=m.chord(wrong,9);
  assert.equal(lost.status,'lost');assert.ok(lost.mines.includes(lost.exploded));assert.equal(m.validate(lost),true);
});
test('reveal every safe square wins without placing flags; terminal actions are inert',()=>{
  let s=field();
  for(let i=0;i<s.revealed.length;i++)if(!s.mines.includes(i)&&!s.revealed[i])s=m.reveal(s,i);
  assert.equal(s.status,'won');assert.equal(s.revealed.filter(Boolean).length,71);assert.equal(m.validate(s),true);
  assert.equal(m.reveal(s,0),null);assert.equal(m.mark(s,0),null);assert.equal(m.chord(s,9),null);
});
test('Replay preserves exact mines and can lose on its first reveal; a fresh board protects the opening',()=>{
  const started=m.reveal(m.newGame(42),40), replay=m.restart({...started,elapsedMs:10000});
  assert.deepEqual(replay.mines,started.mines);assert.equal(replay.status,'ready');assert.equal(replay.elapsedMs,0);
  assert.equal(m.validate(replay),true);const index=replay.mines[0], lost=m.reveal(replay,index);
  assert.equal(lost.status,'lost');assert.equal(lost.exploded,index);assert.equal(m.validate(lost),true);
  assert.notEqual(m.reveal(m.newGame(42),index).status,'lost');
});
test('canonical save validation rejects corrupt geometry, counts, marks and terminal claims',()=>{
  const valid=m.reveal(m.newGame(123),40);assert.equal(m.validate(JSON.parse(JSON.stringify(valid))),true);
  for(const mutate of [s=>s.mines.push(s.mines[0]),s=>s.mines[0]=-1,s=>s.difficulty='custom',
    s=>s.revealed.pop(),s=>s.marks[0]=3,s=>s.elapsedMs=-1,s=>s.elapsedMs=NaN,s=>s.seed=0,
    s=>s.status='won',s=>s.status='lost',s=>s.marks[s.revealed.findIndex(Boolean)]=1,
    s=>s.mines=null,s=>s.version=2]) {const s=copy(valid);mutate(s);assert.equal(m.validate(s),false);}
});
test('many seeds preserve game invariants through mixed actions and loss',()=>{
  for(const level of Object.keys(m.LEVELS))for(let seed=1;seed<=20;seed++) {
    let s=m.newGame(seed,level);const length=s.revealed.length;
    for(let step=0;step<40&&!['lost','won'].includes(s.status);step++) {
      const index=(step*37+seed*13)%length, next=step%4===0?m.mark(s,index):m.reveal(s,index);
      if(next)s=next;assert.equal(m.validate(s),true,`${level}/${seed}/${step}`);
    }
  }
});
