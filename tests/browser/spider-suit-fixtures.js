import {deck,newGame} from '../../src/spider.js';
const symbols=['♠','♥','♣','♦'];
function fixture(suits,build) {
  const s=newGame(123,suits),available=deck(suits);s.stock=[];s.tableau=Array.from({length:10},()=>[]);
  const take=(rank,suit,up=true)=>{
    const i=available.findIndex(c=>(rank===undefined||c.rank===rank)&&(!suit||c.suit===suit));
    if(i<0)throw Error(`Exhausted ${rank}${suit}`);
    return {...available.splice(i,1)[0],up};
  };
  const run=(suit,low=1)=>Array.from({length:14-low},(_,i)=>take(13-i,suit));
  build(s,take,run);
  if(available.length){s.tableau[8].unshift(...available.map(c=>({...c,up:false})));s.tableau[8].at(-1).up=true;}
  return s;
}
export const multiPuzzle=suits=>fixture(suits,(s,take)=>{
  s.tableau[0]=[take(4,'♠',false),take(12,'♥'),take(11,'♥')];
  s.tableau[1]=[take(13,'♠')];s.tableau[2]=[take(13,'♥')];
  s.tableau[3]=[take(9,'♠'),take(8,'♥')];s.tableau[4]=[take(10,suits===4?'♣':'♠')];
  s.tableau[5]=[take(5,suits===4?'♦':'♥')];s.tableau[6]=[take(6,suits===4?'♣':'♠')];
  s.stock=Array.from({length:20},()=>take(undefined,undefined,false));
});
export const multiCompletion=suits=>fixture(suits,(s,take,run)=>{
  s.tableau[0]=[take(4,'♠',false),...run('♥',2)];
  s.tableau[1]=[take(1,'♠')];s.tableau[2]=[take(1,'♥')];s.tableau[3]=[take(2,'♠')];
});
export const multiNearWin=suits=>fixture(suits,(s,take,run)=>{
  for(let i=0;i<7;i++)s.completed[i]=run(symbols[i%suits]);
  s.tableau[0]=run(symbols[7%suits],2);s.tableau[1]=[take(1,symbols[7%suits])];
});
export const multiLong=suits=>fixture(suits,(s,take,run)=>{
  s.tableau[0]=[...Array.from({length:6},()=>take(undefined,undefined,false)),...run('♥',2),...run('♠',2)];
});
