import {deck,newGame} from '../../src/spider.js';

function fixture(build) {
  const s=newGame(123),available=deck();s.stock=[];s.tableau=Array.from({length:10},()=>[]);
  function take(rank,up=true) {
    const i=rank===undefined?0:available.findIndex(c=>c.rank===rank);
    if(i<0)throw Error('Fixture exhausted a rank');
    return {...available.splice(i,1)[0],up};
  }
  const run=(low=1)=>Array.from({length:14-low},(_,i)=>take(13-i));
  build(s,take,run);
  // Spare cards remain covered beneath a face-up card, retaining all 104 IDs.
  if(available.length) {
    s.tableau[8].unshift(...available.map(c=>({...c,up:false})));
    s.tableau[8].at(-1).up=true;
  }
  return s;
}
export const spiderPuzzle=()=>fixture((s,take)=>{
  s.tableau[0]=[take(4,false),take(12),take(11)];s.tableau[1]=[take(13)];
  s.tableau[3]=[take(5)];s.tableau[4]=[take(6)];s.tableau[9]=[take(3)];
});
export const spiderCompletion=()=>fixture((s,take,run)=>{
  s.tableau[0]=[take(4,false),...run(2)];s.tableau[1]=[take(1)];
});
export const spiderDoubleCompletion=()=>fixture((s,take,run)=>{
  s.tableau[0]=[take(4,false),...run(),...run(2)];s.tableau[1]=[take(1)];
});
export const spiderNearWin=()=>fixture((s,take,run)=>{
  for(let i=0;i<7;i++)s.completed[i]=run();
  s.tableau[0]=run(2);s.tableau[1]=[take(1)];
});
export const spiderDealCompletion=()=>fixture((s,take,run)=>{
  s.tableau[0]=[take(4,false),...run(2)];
  for(let i=1;i<10;i++)s.tableau[i]=[take()];
  const ace=take(1,false);s.stock=Array.from({length:9},()=>take(undefined,false));s.stock.push(ace);
});
export const spiderLong=()=>fixture((s,take,run)=>{
  s.tableau[0]=[...Array.from({length:6},()=>take(undefined,false)),...run(2),...run(2)];
  s.tableau[9]=[take(13)];
});
