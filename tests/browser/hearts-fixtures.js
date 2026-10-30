import * as hearts from '../../src/hearts.js';
import {deck} from '../../src/cards.js';
export const autoPass=s=>hearts.passCards(s,s.hands.map((_,p)=>hearts.choosePass(hearts.playerView(s,p))));
export function step(s) {
  if(s.phase==='pass')return autoPass(s);
  if(s.phase==='play')return hearts.play(s,s.turn,hearts.chooseCard(hearts.playerView(s,s.turn)));
  if(s.phase==='trick')return hearts.collect(s);
  return hearts.nextHand(s);
}
export function lastTrick(seed=123) {
  let s=autoPass(hearts.newGame(seed));while(s.tricks.length<12)s=step(s);return s;
}
export function matchEnd(seed=123) {
  let s=hearts.newGame(seed);
  for(let i=0;i<2000;i++) {
    const n=step(s);if(n.phase==='gameOver')return s;s=n;
  }
  throw Error('Fixture match did not finish');
}
export function moonEnd() {
  // Canonical, legal hold-hand puzzle: each player has one whole suit.
  // North owns every club and takes all tricks, including every penalty.
  let s=hearts.newGame(123);s.handNumber=3;s.phase='play';s.leader=s.turn=2;
  s.hands=Array.from({length:4},(_,p)=>deck().filter(c=>Math.floor(c.id/13)===p).map(c=>({...c,up:true})));
  s.rounds=Array.from({length:3},()=>hearts.scoreHand([6,7,6,7]));s.scores=[18,21,18,21];
  while(s.phase!=='trick'||s.tricks.length!==12)s=step(s);return s;
}
