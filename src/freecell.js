import {deck,shuffle} from './cards.js';
import {chooseHint} from './hints.js';

export const MAX_SEED=2147483647;
export function newGame(seed=(Date.now()%MAX_SEED)||1) {
  if(!Number.isInteger(seed)||seed<1||seed>MAX_SEED)throw new RangeError('Deal number must be 1–2147483647');
  const tableau=Array.from({length:8},()=>[]);
  shuffle(deck(),seed).forEach((card,i)=>tableau[i%8].push({...card,up:true}));
  return {game:'freecell',version:1,seed,moves:0,tableau,cells:Array.from({length:4},()=>[]),foundations:Array.from({length:4},()=>[])};
}
export function isSequence(cards) {
  return cards.length>0&&cards.every((c,i)=>c.up&&(!i||(cards[i-1].rank===c.rank+1&&cards[i-1].red!==c.red)));
}
export function moveCapacity(s,destination) {
  const cells=s.cells.filter(p=>!p.length).length;
  const columns=s.tableau.filter((p,i)=>!p.length&&i!==destination).length;
  return (cells+1)*2**columns;
}
export function move(s,from,to,start) {
  if(!['tableau','cells'].includes(from?.kind)||!['tableau','cells','foundations'].includes(to?.kind))return null;
  if(!Number.isInteger(from.index)||!Number.isInteger(to.index)||from.kind===to.kind&&from.index===to.index)return null;
  const src=s[from.kind]?.[from.index],dst=s[to.kind]?.[to.index];
  if(!src||!dst)return null;
  const index=start??src.length-1;
  if(!Number.isInteger(index)||index<0||index>=src.length)return null;
  const group=src.slice(index);
  if(!isSequence(group)||from.kind==='cells'&&group.length!==1)return null;
  const card=group[0],last=dst.at(-1);
  if(to.kind==='cells'&&(dst.length||group.length!==1))return null;
  if(to.kind==='foundations'&&(group.length!==1||(last?card.suit!==last.suit||card.rank!==last.rank+1:card.rank!==1)))return null;
  if(to.kind==='tableau') {
    if(last&&(last.rank!==card.rank+1||last.red===card.red))return null;
    // Destination space is unavailable as temporary storage. A source column
    // that this move empties is not counted, since it is occupied beforehand.
    if(group.length>moveCapacity(s,to.index))return null;
  }
  const next=structuredClone(s);
  next[from.kind][from.index].splice(index);
  next[to.kind][to.index].push(...group.map(c=>({...c})));
  next.moves++;return next;
}
export const won=s=>s.foundations.every(p=>p.length===13);
export function hint(s,recent=[]) {
  return chooseHint(s,move,recent);
}
export function validate(s) {
  if(!s||s.game!=='freecell'||s.version!==1||!Number.isInteger(s.seed)||s.seed<1||s.seed>MAX_SEED||!Number.isInteger(s.moves)||s.moves<0)return false;
  for(const [kind,count] of [['tableau',8],['cells',4],['foundations',4]])if(!Array.isArray(s[kind])||s[kind].length!==count||!s[kind].every(Array.isArray))return false;
  if(s.cells.some(p=>p.length>1))return false;
  const cards=[...s.tableau.flat(),...s.cells.flat(),...s.foundations.flat()],canonical=deck();
  if(cards.length!==52||new Set(cards.map(c=>c?.id)).size!==52)return false;
  if(!cards.every(c=>c&&c.up===true&&canonical[c.id]&&['id','rank','suit','red'].every(k=>c[k]===canonical[c.id][k])))return false;
  return s.foundations.every(p=>p.every((c,i)=>c.rank===i+1&&c.suit===p[0].suit));
}
