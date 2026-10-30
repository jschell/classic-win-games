import {newGame} from '../../src/klondike.js';
// A complete canonical deck with an explicit move puzzle, never a mock renderer.
export function puzzle() {
  const s=newGame(123);const available=[...s.stock,...s.tableau.flat()];
  const take=(rank,suit,up=true)=>{const i=available.findIndex(c=>c.rank===rank&&c.suit===suit);return {...available.splice(i,1)[0],up};};
  s.tableau=[
    [take(4,'♣',false),take(12,'♥'),take(11,'♣')],
    [take(13,'♠')],[],[take(1,'♣')],[take(2,'♣')],[take(6,'♣')],[take(9,'♠')]
  ];
  s.waste=[take(5,'♥')];s.stock=available.map(c=>({...c,up:false}));return s;
}
export function longColumn() {
  const s=newGame(123);const available=[...s.stock,...s.tableau.flat()];
  const sequence=[];
  for(let rank=13;rank>=1;rank--) {
    const i=available.findIndex(c=>c.rank===rank&&c.red===(rank%2===0));
    sequence.push({...available.splice(i,1)[0],up:true});
  }
  // Include six covered cards plus a maximal face-up run to stress page growth.
  const covered=available.splice(0,6).map(c=>({...c,up:false}));
  s.tableau=[[...covered,...sequence],[],[],[],[],[],[]];
  s.stock=available.map(c=>({...c,up:false}));return s;
}
