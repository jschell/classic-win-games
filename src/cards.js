export const suits = ['♠','♥','♣','♦'];
export function deck(){return suits.flatMap((suit,s)=>Array.from({length:13},(_,i)=>({id:s*13+i,suit,rank:i+1,red:s===1||s===3,up:false})))}
export function shuffle(cards,seed){let x=(seed>>>0)||1;const a=cards.map(c=>({...c}));for(let i=a.length-1;i>0;i--){x^=x<<13;x^=x>>>17;x^=x<<5;const j=(x>>>0)%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
export const label=c=>['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][c.rank];
