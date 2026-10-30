import {deck,newGame} from '../../src/spider.js';
// Reproduce the screenshot's K-Q / K-Q-J-10-9-8-7 equivalent supports.
// Unknown cards below the screenshot are not invented as gameplay evidence:
// the remaining canonical cards form covered piles and two stock rows.
export function equivalentSpider() {
  const s=newGame(123),available=deck();
  const take=(rank,up=true)=>({...available.splice(available.findIndex(c=>c.rank===rank),1)[0],up});
  s.tableau=[[take(13),take(12)],[take(13),take(12),...[11,10,9,8,7].map(r=>take(r))],
    ...Array.from({length:8},()=>[take(1)])];
  s.stock=available.splice(0,20);
  s.tableau[8].unshift(...available.map(c=>({...c,up:false})));
  return s;
}
