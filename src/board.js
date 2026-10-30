import {label} from './cards.js';
export const pileCards=(s,kind,index)=>kind==='stock'?s.stock:kind==='waste'?s.waste:s[kind][index];
function card(c) {
  const el=document.createElement('button');
  el.type='button';el.dataset.cardId=String(c.id);
  el.className='card '+(c.up?(c.red?'red':'black'):'back');
  if(c.up) {
    const mark=document.createElement('span');mark.className='card-corner';
    mark.textContent=label(c)+c.suit;el.append(mark);
  } else el.textContent='✦';
  el.setAttribute('aria-label',c.up?label(c)+' of '+({'♠':'spades','♥':'hearts','♣':'clubs','♦':'diamonds'}[c.suit]):'Face down card');
  return el;
}
export function renderBoard({state,selected,onPile,game,top,tableau}) {
  function pile(kind,index,container) {
    const cards=pileCards(state,kind,index);
    const slot=document.createElement('div');slot.className='pile-slot';
    slot.dataset.kind=kind;slot.dataset.index=String(index??0);
    const name=kind==='tableau'?`Column ${index+1}`:kind==='foundations'?`Foundation ${index+1}`:kind==='cells'?`Cell ${index+1}`:kind==='stock'?'Stock':'Waste';
    const caption=document.createElement('span');caption.className='pile-caption';
    caption.textContent=kind==='stock'&&game==='spider'?`Stock · ${cards.length/10} rows`:kind==='foundations'?`Home ${index+1}`:kind==='tableau'?(game==='freecell'?String(index+1):`${index+1} · ${cards.filter(c=>!c.up).length}↓`):`${name} · ${cards.length}`;
    if(kind==='tableau'&&game!=='freecell')caption.setAttribute('aria-label',`${name}: ${cards.filter(c=>!c.up).length} covered cards`);
    slot.append(caption);
    const box=document.createElement('div');box.className='pile'+(kind==='tableau'?' stack':'');
    box.setAttribute('role','group');box.setAttribute('aria-label',name);
    // Fixed exposed strips, then a natural-height last row. The grid reserves the
    // entire column height, including its bottom card, without absolute offsets.
    if(kind==='tableau'&&cards.length)box.style.gridTemplateRows=cards.map((c,i)=>i===cards.length-1?'max-content':c.up?'var(--face-step)':'var(--covered-step)').join(' ');
    if(!cards.length) {
      const empty=document.createElement('button');empty.type='button';empty.className='empty';
      empty.textContent=kind==='stock'?(game==='spider'?'—':'↻'):kind==='foundations'?'A':'';
      empty.setAttribute('aria-label',kind==='stock'?(game==='spider'?'Stock exhausted':'Recycle waste'):`Empty ${name.toLowerCase()}`);
      box.append(empty);
    }
    cards.forEach((c,i)=>{
      if(kind!=='tableau'&&i!==cards.length-1)return;
      const el=card(c);
      if(kind==='stock')el.setAttribute('aria-label',game==='spider'?`Deal row (${cards.length/10} remaining)`:`Draw ${state.draw} (${cards.length} remaining)`);
      if(!c.up&&kind==='tableau')el.disabled=true;
      if(c.up)el.setAttribute('aria-pressed',String(selected?.kind===kind&&selected.index===index&&selected.start===i));
      if(selected?.kind===kind&&selected.index===index&&i>=selected.start)el.classList.add('selected');
      box.append(el);
      el.addEventListener('click',e=>{e.stopPropagation();onPile(kind,index,i);});
    });
    box.addEventListener('click',()=>onPile(kind,index,cards.length-1));
    slot.append(box);container.append(slot);
  }
  top.replaceChildren();tableau.replaceChildren();
  if(game==='spider') {
    pile('stock',null,top);
    state.completed.forEach((run,i)=>{
      const slot=document.createElement('div');slot.className='pile-slot';slot.dataset.kind='completed';
      const caption=document.createElement('span');caption.className='pile-caption';caption.textContent=`Run ${i+1}`;
      const marker=document.createElement('span');marker.className='run-marker'+(run.length?' complete':'');
      marker.setAttribute('role','img');marker.setAttribute('aria-label',`Run ${i+1} ${run.length?'complete':'empty'}`);
      marker.textContent=run.length?run[0].suit:'—';slot.append(caption,marker);top.append(slot);
    });
  } else {
    if(game==='freecell'){for(let i=0;i<4;i++)pile('cells',i,top);}
    else {pile('stock',null,top);pile('waste',0,top);}
    for(let i=0;i<4;i++)pile('foundations',i,top);
  }
  for(let i=0;i<({klondike:7,freecell:8,spider:10}[game]);i++)pile('tableau',i,tableau);
}
