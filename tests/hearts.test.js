import test from 'node:test';
import assert from 'node:assert/strict';
import * as h from '../src/hearts.js';
import {deck} from '../src/cards.js';
import {autoPass,step,lastTrick,matchEnd,moonEnd} from './browser/hearts-fixtures.js';
const card=(rank,suit)=>deck().find(c=>c.rank===rank&&c.suit===suit);
const rules=(hand,trick=[],first=false,broken=false)=>({hands:[hand,[],[],[]],phase:'play',turn:0,trick,tricks:first?[]:[{}],broken,moves:0});
test('Hearts seeded 13-card hands conserve 52 IDs; ranks use Ace high and scoring uses 26 points',()=>{
  const s=h.newGame(123);assert.deepEqual(s,h.newGame(123));assert.notDeepEqual(s.hands,h.newGame(124).hands);
  assert.deepEqual(s.hands.map(p=>p.length),[13,13,13,13]);assert.ok(h.validate(s));assert.equal(deck().reduce((n,c)=>n+h.penalty(c),0),26);
  assert.equal(h.value(card(1,'♠')),14);assert.equal(h.penalty(card(12,'♠')),13);assert.equal(h.penalty(card(12,'♥')),1);
  for(const seed of [0,-1,1.2,Infinity,2147483648])assert.throws(()=>h.newGame(seed),RangeError);
});
test('passing is simultaneous, own-card-only and rotates left/right/across/hold',()=>{
  let s=h.newGame(42);
  for(let hand=0;hand<4;hand++) {
    assert.equal(h.passOffset(s),[1,3,2,0][hand]);assert.equal(h.passName(s),['left','right','across','hold'][hand]);
    if(hand<3) {
      const choices=s.hands.map(p=>p.slice(0,3).map(c=>c.id)),before=structuredClone(s),n=h.passCards(s,choices),offset=h.passOffset(s);
      assert.deepEqual(s,before);assert.ok(h.validate(n));
      choices.forEach((ids,p)=>ids.forEach(id=>assert.ok(n.hands[(p+offset)%4].some(c=>c.id===id))));
      assert.deepEqual(n.sent.sort((a,b)=>a-b),[...choices[0]].sort((a,b)=>a-b));s=n;
    } else assert.equal(h.passCards(s,[[],[],[],[]]),null);
    while(!['handOver','gameOver'].includes(s.phase))s=step(s);
    if(hand<3)s=h.nextHand(s);
  }
});
test('bad pass selections, out-of-turn plays and repeated actions are rejected without mutation',()=>{
  const s=h.newGame(7),choices=s.hands.map(p=>p.slice(0,3).map(c=>c.id)),before=structuredClone(s);
  for(const bad of [null,[],[...choices.slice(0,3)],[[1,1,1],...choices.slice(1)],[choices[1],...choices.slice(1)]])assert.equal(h.passCards(s,bad),null);
  assert.equal(h.play(s,0,s.hands[0][0].id),null);assert.equal(h.collect(s),null);assert.equal(h.nextHand(s),null);assert.deepEqual(s,before);
  const n=autoPass(s);assert.equal(h.passCards(n,choices),null);
  assert.equal(h.play(n,(n.turn+1)%4,n.hands[(n.turn+1)%4][0].id),null);
  const legal=h.legalCards(n)[0],played=h.play(n,n.turn,legal.id);assert.ok(played);assert.equal(h.play(played,n.turn,legal.id),null);
});
test('2 clubs opens, follow suit is compulsory, first-trick penalties are forbidden unless forced',()=>{
  let s=autoPass(h.newGame(123));assert.deepEqual(h.legalCards(s).map(c=>c.id),[card(2,'♣').id]);
  const lead=[{player:1,card:card(2,'♣')}];
  assert.deepEqual(h.legalCards(rules([card(3,'♣'),card(1,'♥')],lead,true)).map(c=>c.id),[card(3,'♣').id]);
  assert.deepEqual(h.legalCards(rules([card(5,'♦'),card(1,'♥'),card(12,'♠')],lead,true)).map(c=>c.id),[card(5,'♦').id]);
  assert.equal(h.legalCards(rules([card(1,'♥'),card(12,'♠')],lead,true)).length,2);
});
test('heart leads wait until broken or only hearts remain; Q spades does not break hearts',()=>{
  let s=rules([card(2,'♥'),card(5,'♣')]);assert.deepEqual(h.legalCards(s).map(c=>c.id),[card(5,'♣').id]);
  assert.equal(h.legalCards({...s,broken:true}).length,2);assert.equal(h.legalCards(rules([card(2,'♥'),card(1,'♥')])).length,2);
  const lead=[{player:3,card:card(2,'♣')}];
  s=rules([card(12,'♠'),card(4,'♥')],lead);assert.equal(h.play(s,0,card(12,'♠').id).broken,false);assert.equal(h.play(s,0,card(4,'♥').id).broken,true);
});
test('highest led suit wins with no trump; completed tricks remain visible until explicit collection',()=>{
  const entries=[{player:2,card:card(13,'♣')},{player:3,card:card(1,'♠')},{player:0,card:card(1,'♣')},{player:1,card:card(12,'♠')}];assert.equal(h.trickWinner(entries),0);
  let s=autoPass(h.newGame(2));while(s.phase==='play')s=step(s);
  assert.equal(s.phase,'trick');assert.equal(s.trick.length,4);assert.equal(s.tricks.length,0);assert.equal(h.legalCards(s).length,0);
  const n=h.collect(s);assert.equal(n.trick.length,0);assert.equal(n.tricks.length,1);assert.equal(n.turn,n.tricks[0].winner);assert.ok(h.validate(n));
  assert.equal(h.collect(n),null);assert.equal(s.trick.length,4);
});
test('shooting the moon, hand-end scoring and match end are applied exactly once and undoable',()=>{
  assert.deepEqual(h.scoreHand([26,0,0,0]).points,[0,26,26,26]);assert.deepEqual(h.scoreHand([5,8,0,13]).points,[5,8,0,13]);
  for(const before of [moonEnd(),matchEnd()]) {
    assert.ok(h.validate(before));const n=h.collect(before);assert.ok(h.validate(n));assert.equal(h.collect(n),null);
    assert.equal(before.rounds.length+1,n.rounds.length);assert.notDeepEqual(before.scores,n.scores);
    if(n.phase==='gameOver'){assert.ok(h.winners(n).length);assert.equal(h.nextHand(n),null);}
    else {assert.equal(n.rounds.at(-1).moon,2);assert.deepEqual(n.rounds.at(-1).points,[26,26,0,26]);assert.ok(h.validate(h.nextHand(n)));}
  }
});
test('computer decisions/hints use only own hand and public play; advancement stops for human or trick review',()=>{
  let s=autoPass(h.newGame(13));s=h.advanceComputers(s);assert.ok(h.validate(s));assert.ok(s.turn===0||s.phase==='trick');
  const view=h.playerView(s,0),changed=structuredClone(s);[changed.hands[1],changed.hands[2]]=[changed.hands[2],changed.hands[1]];
  assert.equal('hands' in view,false);assert.equal(view.hand.length,s.hands[0].length);assert.deepEqual(h.playerView(changed,0),view);
  assert.deepEqual(h.choosePass(view),h.choosePass(h.playerView(changed,0)));assert.equal(h.chooseCard(view),h.chooseCard(h.playerView(changed,0)));
  if(s.phase==='play')assert.ok(h.legalCards(s,0).some(c=>c.id===h.chooseCard(view)));
});
test('validation rejects corrupt cards, scores, turns, trick winners and illegal replay without throwing',()=>{
  const good=lastTrick();assert.ok(h.validate(good));
  for(const bad of [null,{},[],{...good,phase:'pass'},{...good,seed:0},{...good,scores:[100,0,0,0]},{...good,turn:9},{...good,received:[]}])assert.equal(h.validate(bad),false);
  let bad=structuredClone(good);bad.tricks[0].winner=(bad.tricks[0].winner+1)%4;assert.equal(h.validate(bad),false);
  bad=structuredClone(good);bad.tricks[0].cards[0].card.rank=7;assert.equal(h.validate(bad),false);
  bad=structuredClone(good);bad.hands[0][0]=bad.hands[1][0];assert.equal(h.validate(bad),false);
  bad=structuredClone(good);bad.tricks[0].cards[0].player=(bad.tricks[0].cards[0].player+1)%4;assert.equal(h.validate(bad),false);
  assert.ok(h.validate(JSON.parse(JSON.stringify(good))));
});
test('30 seeded full matches terminate legally with reproducible AI, passing, all 52 cards and score totals',()=>{
  for(let seed=1;seed<=30;seed++) {
    let s=h.newGame(seed),steps=0;
    while(s.phase!=='gameOver') {
      assert.ok(h.validate(s),`seed ${seed} step ${steps} ${s.phase}`);const before=structuredClone(s),n=step(s);assert.ok(n);assert.deepEqual(s,before);s=n;assert.ok(++steps<2000);
    }
    assert.ok(h.validate(s));assert.ok(s.scores.some(n=>n>=100));assert.equal(s.tricks.length,13);
    assert.equal(s.scores.reduce((a,b)=>a+b,0),s.rounds.reduce((n,r)=>n+r.points.reduce((a,b)=>a+b,0),0));
  }
});
