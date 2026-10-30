import {newGame} from '../../src/freecell.js';
import {deck} from '../../src/cards.js';
export function freePuzzle() {
  const s=newGame(123),available=deck().map(c=>({...c,up:true}));
  const take=(rank,suit)=>available.splice(available.findIndex(c=>c.rank===rank&&c.suit===suit),1)[0];
  s.tableau=[[take(12,'♥'),take(11,'♣')],[take(13,'♠')],[],[take(1,'♣')],[take(2,'♣')],[take(6,'♣')],[take(9,'♠')],[]];
  s.cells=[[take(5,'♥')],[],[],[]];s.tableau[7]=available;return s;
}
export function freeLong() {
  const s=newGame(123),available=deck().map(c=>({...c,up:true})),sequence=[];
  for(let rank=13;rank>=1;rank--)sequence.push(available.splice(available.findIndex(c=>c.rank===rank&&c.red===(rank%2===0)),1)[0]);
  s.tableau=[sequence,[],[],[],[],[],[],available];return s;
}
export function almostWon() {
  const s=newGame(123),cards=deck().map(c=>({...c,up:true}));
  s.foundations=Array.from({length:4},(_,i)=>cards.slice(i*13,i*13+12));
  s.tableau=Array.from({length:8},(_,i)=>i<4?[cards[i*13+12]]:[]);return s;
}
// Complete canonical state; spare cards precede the source run, leaving exactly
// the requested number of empty cells/columns. No fake or duplicate cards.
export function capacityState(emptyCells,emptyColumns) {
  const s=newGame(123),available=deck().map(c=>({...c,up:true}));
  const take=(rank,suit)=>available.splice(available.findIndex(c=>c.rank===rank&&c.suit===suit),1)[0];
  const run=[take(9,'♥'),take(8,'♣'),take(7,'♥'),take(6,'♣'),take(5,'♥')];
  s.tableau=[[...run],[take(10,'♠')],[],[],[],[],[],[]];
  s.cells=Array.from({length:4},(_,i)=>i<emptyCells?[]:[available.pop()]);
  for(let i=2+emptyColumns;i<8;i++)s.tableau[i]=[available.pop()];
  s.tableau[0].unshift(...available);return s;
}
