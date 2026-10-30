import test from 'node:test';
import assert from 'node:assert/strict';
import {deck,newGame,validate,isSequence,move,dealRow,hint,won} from '../src/spider.js';
import {positionKey,evaluate} from '../src/hints.js';
import {multiPuzzle,multiCompletion,multiNearWin,multiLong} from './browser/spider-suit-fixtures.js';
const col=index=>({kind:'tableau',index});
for(const suits of [2,4]) {
  test(`${suits} suits: canonical deck, distribution, deterministic replay and validation`,()=>{
    const cards=deck(suits);assert.equal(new Set(cards.map(c=>c.id)).size,104);
    const symbols=['♠','♥','♣','♦'].slice(0,suits);
    for(const suit of symbols)for(let rank=1;rank<=13;rank++)assert.equal(cards.filter(c=>c.rank===rank&&c.suit===suit).length,8/suits);
    assert.ok(cards.every(c=>c.red===(c.suit==='♥'||c.suit==='♦')));
    for(let seed=1;seed<=100;seed++)assert.ok(validate(newGame(seed,suits)));
    const s=newGame(123,suits);assert.deepEqual(s,newGame(123,suits));assert.equal(s.stock.length,50);assert.equal(s.tableau.flat().filter(c=>c.up).length,10);
    const bad=structuredClone(s);bad.suits=1;assert.equal(validate(bad),false);
    for(const f of [multiPuzzle,multiCompletion,multiNearWin,multiLong])assert.ok(validate(f(suits)));
  });
  test(`${suits} suits: move same-suit suffix onto any next rank; reject mixed-suit multi-card moves`,()=>{
    const s=multiPuzzle(suits),before=structuredClone(s);
    for(const target of [1,2]) {
      const n=move(s,col(0),col(target),1);assert.ok(validate(n));assert.equal(n.tableau[target].length,3);assert.ok(n.tableau[0][0].up);
    }
    assert.equal(isSequence(s.tableau[3]),false);assert.equal(move(s,col(3),col(4),0),null);
    const n=move(s,col(3),col(7),1);assert.ok(validate(n));assert.equal(n.tableau[7][0].suit,'♥');assert.deepEqual(s,before);
  });
  test(`${suits} suits: mixed King–Ace stays; only a full same-suit run clears and reveals`,()=>{
    let s=multiCompletion(suits);s=move(s,col(1),col(0));assert.ok(validate(s));assert.equal(s.completed.flat().length,0);
    s=move(s,col(0),col(3));assert.ok(validate(s));s=move(s,col(2),col(0));assert.ok(validate(s));
    assert.equal(s.completed[0].length,13);assert.ok(s.completed[0].every(c=>c.suit==='♥'));assert.ok(s.tableau[0][0].up);
    const bad=structuredClone(s);[bad.completed[0][12],bad.tableau[3][1]]=[bad.tableau[3][1],bad.completed[0][12]];assert.equal(validate(bad),false);
  });
  test(`${suits} suits: eight correctly suited runs win; stock and Undo snapshots retain all cards`,()=>{
    const before=multiNearWin(suits),n=move(before,col(1),col(0));assert.ok(validate(n));assert.equal(won(n),true);assert.equal(won(before),false);
    let s=newGame(9,suits);for(let i=0;i<5;i++){s=dealRow(s);assert.ok(validate(s));}assert.equal(s.stock.length,0);
  });
  test(`${suits} suits: hints prefer same-suit organization and reject visited outcomes`,()=>{
    const s=multiPuzzle(suits),h=hint(s),n=move(s,h.from,h.to,h.start);
    assert.equal(h.to.index,2);assert.ok(evaluate(n)>evaluate(move(s,col(0),col(1),1)));
    assert.notEqual(positionKey(s),positionKey({...s,suits:1}));
    const h2=hint(s,[n]);assert.ok(!h2||h2.type!=='move'||positionKey(move(s,h2.from,h2.to,h2.start))!==positionKey(n));
  });
  test(`${suits} suits: seeded hint walks remain legal, conserve cards and never revisit positions`,()=>{
    for(let seed=1;seed<=20;seed++) {
      let s=newGame(seed,suits);const recent=[positionKey(s)];
      for(let i=0;i<60;i++) {
        const h=hint(s,recent);if(!h)break;const before=structuredClone(s);
        const n=h.type==='deal'?dealRow(s):move(s,h.from,h.to,h.start);assert.ok(n);assert.ok(validate(n));assert.deepEqual(s,before);
        const key=positionKey(n);assert.ok(!recent.includes(key));recent.push(key);s=n;
      }
    }
  });
}
test('unsupported Spider suit modes fail without accepting corrupt saves; one-suit defaults remain unchanged',()=>{
  for(const suits of [0,3,5,'2',null,NaN]){assert.throws(()=>deck(suits),RangeError);assert.throws(()=>newGame(1,suits),RangeError);assert.equal(validate({...newGame(1),suits}),false);}
  assert.deepEqual(deck(),deck(1));assert.deepEqual(newGame(123),newGame(123,1));
});
