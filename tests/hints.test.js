import test from 'node:test';
import assert from 'node:assert/strict';
import * as spider from '../src/spider.js';
import * as freecell from '../src/freecell.js';
import * as klondike from '../src/klondike.js';
import {positionKey,evaluate,candidates} from '../src/hints.js';
import {equivalentSpider} from './browser/hint-fixtures.js';
import {spiderCompletion} from './browser/spider-fixtures.js';
const col=index=>({kind:'tableau',index});
export function apply(engine,s,h) {
  return h.type==='move'?engine.move(s,h.from,h.to,h.start):h.type==='deal'?engine.dealRow(s):engine.drawStock(s);
}
test('Spider screenshot: exchanging identical Queen supports has no value in either direction',()=>{
  const s=equivalentSpider();assert.ok(spider.validate(s));
  const switched=spider.move(s,col(1),col(0),2);assert.ok(spider.validate(switched));
  assert.equal(evaluate(s),evaluate(switched));
  assert.equal(spider.hint(s).type,'deal');
  assert.equal(spider.hint(switched,[s]).type,'deal');
  s.stock=[];assert.equal(spider.hint(s),null);
});
test('canonical positions ignore counters, column/slot permutations and interchangeable Spider copies',()=>{
  for(const engine of [spider,freecell,klondike]) {
    const s=engine.newGame(123),n=structuredClone(s);n.tableau.reverse();n.moves+=50;n.passes=99;
    if(n.cells)n.cells.reverse();if(n.foundations)n.foundations.reverse();
    assert.equal(positionKey(s),positionKey(n));
    if(n.game==='spider') {
      for(const c of [...n.stock,...n.tableau.flat()])c.id=(c.id+13)%104;
      assert.equal(positionKey(s),positionKey(n));
    }
    n.tableau[0].at(-1).up=false;assert.notEqual(positionKey(s),positionKey(n));
  }
});
test('completed runs and reveals outrank cosmetic rearrangement; hints do not mutate state',()=>{
  const s=spiderCompletion(),before=structuredClone(s),h=spider.hint(s);
  assert.equal(h.type,'move');assert.match(h.reason,/run/);
  assert.equal(apply(spider,s,h).completed[0].length,13);assert.deepEqual(s,before);
});
test('FreeCell can suggest temporary storage only when bounded search finds subsequent progress',()=>{
  const s={game:'freecell',tableau:Array.from({length:8},()=>[]),cells:Array.from({length:4},()=>[]),foundations:Array.from({length:4},()=>[]),moves:0};
  s.tableau[0]=[{id:0,rank:1,suit:'♠',red:false,up:true},{id:1,rank:9,suit:'♥',red:true,up:true}];
  const before=evaluate(s),h=freecell.hint(s);assert.ok(h);assert.match(h.reason,/Sets up/);
  const n=apply(freecell,s,h),next=freecell.hint(n,[s]);assert.ok(next);
  assert.ok(evaluate(apply(freecell,n,next))>before);
  // Isolate equivalent supports with occupied cells and no useful destination.
  const c=(rank,red)=>({rank,red,suit:red?'♥':'♠',up:true});
  s.tableau=[[c(12,true),c(11,false)],[c(12,true)],...Array.from({length:6},()=>[c(5,false)])];
  s.cells=Array.from({length:4},()=>[c(5,false)]);
  assert.equal(freecell.hint(s),null);
});
test('all engines reject every previously visited result, including stock and foundation moves',()=>{
  for(const engine of [spider,freecell,klondike]) {
    const s=engine.newGame(2),visited=[s,...candidates(s,engine.move).map(c=>c.state)];
    const stock=engine.dealRow?.(s)||engine.drawStock?.(s);if(stock)visited.push(stock);
    assert.equal(engine.hint(s,visited),null);
  }
});
test('Klondike stock recycling stops after a full canonical cycle in both draw modes',()=>{
  for(const draw of [1,3]) {
    let s=klondike.newGame(42,draw);const recent=[s];
    // Blocking every move isolates the stock strategy from tableau progress.
    for(let i=0;i<100;i++) {
      const h=klondike.hint(s,[...recent,...candidates(s,klondike.move).map(c=>c.state)]);
      if(!h)break;assert.equal(h.type,'draw');s=apply(klondike,s,h);
      assert.ok(!recent.some(p=>positionKey(p)===positionKey(s)));recent.push(s);
      assert.ok(i<99,'stock must not cycle forever');
    }
    assert.ok(recent.length>2);
  }
});
for(const [name,engine] of Object.entries({spider,freecell,klondike}))test(`${name}: 20 seeded hint walks never revisit a position or violate rules`,()=>{
  for(let seed=1;seed<=20;seed++) {
    let s=engine.newGame(seed);const recent=[positionKey(s)];
    for(let i=0;i<100;i++) {
      const before=structuredClone(s),h=engine.hint(s,recent);if(!h)break;
      const n=apply(engine,s,h);assert.ok(n);assert.ok(engine.validate(n));assert.deepEqual(s,before);
      const key=positionKey(n);assert.ok(!recent.includes(key),`${name} seed ${seed} repeated at step ${i}`);
      recent.push(key);s=n;
    }
  }
});
