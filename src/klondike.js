import {deck,shuffle} from './cards.js';
export function newGame(seed=Date.now(),draw=1){const cards=shuffle(deck(),seed),tableau=Array.from({length:7},()=>[]);for(let i=0;i<7;i++)for(let j=0;j<=i;j++){const c=cards.shift();c.up=j===i;tableau[i].push(c)}return {seed,draw,tableau,stock:cards,waste:[],foundations:Array.from({length:4},()=>[]),passes:0,moves:0}}
export const clone=s=>structuredClone(s);
export function canPlace(card,pile,type){if(type==='foundation')return pile.length?pile.at(-1).suit===card.suit&&pile.at(-1).rank+1===card.rank:card.rank===1;return pile.length?pile.at(-1).up&&pile.at(-1).red!==card.red&&pile.at(-1).rank===card.rank+1:card.rank===13}
export function move(s,from,to,index){const n=clone(s),src=n[from.kind][from.index??0],dst=n[to.kind][to.index??0];if(!src||!dst||from.kind===to.kind&&from.index===to.index||!['tableau','waste','foundations'].includes(from.kind)||!['tableau','foundations'].includes(to.kind))return null;
const start=index??src.length-1;if(start<0||start>=src.length)return null;const group=src.slice(start);if(!group.every(c=>c.up)||from.kind!=='tableau'&&group.length!==1||to.kind==='foundations'&&group.length!==1)return null;
if(from.kind==='tableau')for(let i=1;i<group.length;i++)if(group[i-1].rank!==group[i].rank+1||group[i-1].red===group[i].red)return null;
if(!canPlace(group[0],dst,to.kind==='foundations'?'foundation':'tableau'))return null;
src.splice(start);dst.push(...group);if(from.kind==='tableau'&&src.length)src.at(-1).up=true;n.moves++;return n}
export function drawStock(s){const n=clone(s);if(n.stock.length){for(let i=0;i<n.draw&&n.stock.length;i++){const c=n.stock.pop();c.up=true;n.waste.push(c)}}else if(n.waste.length){n.stock=n.waste.reverse().map(c=>({...c,up:false}));n.waste=[];n.passes++}else return null;n.moves++;return n}
export const won=s=>s.foundations.every(p=>p.length===13);
export function validate(s){const cards=[...s.stock,...s.waste,...s.tableau.flat(),...s.foundations.flat()];return cards.length===52&&new Set(cards.map(c=>c.id)).size===52}
