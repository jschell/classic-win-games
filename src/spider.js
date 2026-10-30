import {shuffle,suits as cardSuits} from './cards.js';
import {chooseHint,unseen} from './hints.js';

export const MAX_SEED=2147483647;
export const SUIT_MODES=[1,2,4];
// Stable IDs and shuffle order preserve existing one-suit numbered deals.
export function deck(suits=1) {
  if(!SUIT_MODES.includes(suits))throw new RangeError('Spider uses 1, 2 or 4 suits');
  return Array.from({length:104},(_,id)=>{
    const suit=cardSuits[Math.floor(id/13)%suits];
    return {id,rank:id%13+1,suit,red:suit==='♥'||suit==='♦',up:false};
  });
}
export function newGame(seed=(Date.now()%MAX_SEED)||1,suits=1) {
  if(!Number.isInteger(seed)||seed<1||seed>MAX_SEED)throw new RangeError('Deal number must be 1–2147483647');
  const cards=shuffle(deck(suits),seed),tableau=Array.from({length:10},()=>[]);
  for(let row=0;row<5;row++)for(const pile of tableau)pile.push(cards.pop());
  for(let i=0;i<4;i++)tableau[i].push(cards.pop());
  tableau.forEach(p=>{p.at(-1).up=true;});
  return {game:'spider',version:1,suits,seed,moves:0,tableau,stock:cards,completed:Array.from({length:8},()=>[])};
}
export function isSequence(cards) {
  return cards.length>0&&cards.every((c,i)=>c.up&&(!i||cards[i-1].rank===c.rank+1&&cards[i-1].suit===c.suit));
}
function settle(s) {
  for(const pile of s.tableau) {
    if(pile.length)pile.at(-1).up=true;
    // Removal may expose another complete run. Reveal after each removal,
    // including a newly exposed face-down card, as part of the same action.
    while(pile.length>=13&&pile.at(-13).rank===13&&isSequence(pile.slice(-13))) {
      s.completed[s.completed.findIndex(p=>!p.length)]=pile.splice(-13);
      if(pile.length)pile.at(-1).up=true;
    }
  }
  return s;
}
export function move(s,from,to,start) {
  if(from?.kind!=='tableau'||to?.kind!=='tableau'||!Number.isInteger(from.index)||!Number.isInteger(to.index)||from.index===to.index)return null;
  const src=s.tableau[from.index],dst=s.tableau[to.index],index=start??src?.length-1;
  if(!src||!dst||!Number.isInteger(index)||index<0||index>=src.length)return null;
  const group=src.slice(index);
  if(!isSequence(group)||dst.length&&dst.at(-1).rank!==group[0].rank+1)return null;
  const next=structuredClone(s);
  next.tableau[to.index].push(...next.tableau[from.index].splice(index));next.moves++;
  return settle(next);
}
export const canDeal=s=>s.stock.length>=10&&s.tableau.every(p=>p.length>0);
export function dealRow(s) {
  if(!canDeal(s))return null;
  const next=structuredClone(s);
  // Deal the entire row before removing any runs, preserving column order.
  for(const pile of next.tableau)pile.push({...next.stock.pop(),up:true});
  next.moves++;return settle(next);
}
export const won=s=>s.completed.every(p=>p.length===13);
export function hint(s,recent=[]) {
  return chooseHint(s,move,recent)||(canDeal(s)&&unseen(dealRow(s),recent)?{type:'deal',reason:'No improving sequence move found.'}:null);
}
export function validate(s) {
  if(!s||s.game!=='spider'||s.version!==1||!SUIT_MODES.includes(s.suits)||!Number.isInteger(s.seed)||s.seed<1||s.seed>MAX_SEED||!Number.isInteger(s.moves)||s.moves<0)return false;
  if(!Array.isArray(s.tableau)||s.tableau.length!==10||!s.tableau.every(Array.isArray)||
    !Array.isArray(s.stock)||s.stock.length>50||s.stock.length%10||
    !Array.isArray(s.completed)||s.completed.length!==8||!s.completed.every(p=>Array.isArray(p)&&(p.length===0||p.length===13)))return false;
  const cards=[...s.stock,...s.tableau.flat(),...s.completed.flat()],canonical=deck(s.suits);
  if(cards.length!==104||new Set(cards.map(c=>c?.id)).size!==104)return false;
  if(!cards.every(c=>c&&canonical[c.id]&&typeof c.up==='boolean'&&['id','rank','suit','red'].every(k=>c[k]===canonical[c.id][k])))return false;
  if(s.stock.some(c=>c.up))return false;
  for(const pile of s.tableau) {
    if(pile.length&&!pile.at(-1).up)return false;
    for(let i=1;i<pile.length;i++)if(pile[i-1].up&&!pile[i].up)return false;
  }
  return s.completed.every(p=>!p.length||p[0].rank===13&&isSequence(p));
}
