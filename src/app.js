import {newGame,move,drawStock,won,validate} from './klondike.js';
import {label} from './cards.js';

const $=id=>document.getElementById(id), key='classic-win-klondike-v1';
let state, history=[], selected=null;
try {
  const saved=JSON.parse(localStorage.getItem(key));
  state=validate(saved)?saved:newGame();
} catch { state=newGame(); }
$('draw').value=String(state.draw);
function persist() {
  try { localStorage.setItem(key,JSON.stringify(state)); }
  catch { $('storage-note').hidden=false; }
}
function commit(next) {
  if(!next)return;
  history.push(state);state=next;selected=null;persist();render();
}
function card(c) {
  const el=document.createElement('button');
  el.type='button';
  el.className='card '+(c.up?(c.red?'red':'black'):'back');
  if(c.up) {
    const mark=document.createElement('span');mark.className='card-corner';
    mark.textContent=label(c)+c.suit;el.append(mark);
  } else el.textContent='✦';
  el.setAttribute('aria-label',c.up?label(c)+' of '+({'♠':'spades','♥':'hearts','♣':'clubs','♦':'diamonds'}[c.suit]):'Face down card');
  return el;
}
function pile(kind,index,container) {
  const cards=kind==='stock'?state.stock:kind==='waste'?state.waste:state[kind][index];
  const slot=document.createElement('div');slot.className='pile-slot';
  slot.dataset.kind=kind;slot.dataset.index=String(index??0);
  const name=kind==='tableau'?`Column ${index+1}`:kind==='foundations'?`Foundation ${index+1}`:kind==='stock'?'Stock':'Waste';
  const caption=document.createElement('span');caption.className='pile-caption';
  caption.textContent=kind==='foundations'?`Home ${index+1}`:kind==='tableau'?`${index+1} · ${cards.filter(c=>!c.up).length} covered`:`${name} · ${cards.length}`;
  slot.append(caption);
  const box=document.createElement('div');box.className='pile'+(kind==='tableau'?' stack':'');
  box.setAttribute('role','group');box.setAttribute('aria-label',name);
  // Fixed exposed strips, then a natural-height last row. The grid reserves the
  // entire column height, including its bottom card, without absolute offsets.
  if(kind==='tableau'&&cards.length)box.style.gridTemplateRows=cards.map((c,i)=>i===cards.length-1?'max-content':c.up?'var(--face-step)':'var(--covered-step)').join(' ');
  if(!cards.length) {
    const empty=document.createElement('button');empty.type='button';empty.className='empty';
    empty.textContent=kind==='stock'?'↻':kind==='foundations'?'A':'';
    empty.setAttribute('aria-label',kind==='stock'?'Recycle waste':`Empty ${name.toLowerCase()}`);
    box.append(empty);
  }
  cards.forEach((c,i)=>{
    if(kind!=='tableau'&&i!==cards.length-1)return;
    const el=card(c);
    if(kind==='stock')el.setAttribute('aria-label',`Draw ${state.draw} (${cards.length} remaining)`);
    if(!c.up&&kind==='tableau')el.disabled=true;
    if(c.up)el.setAttribute('aria-pressed',String(selected?.kind===kind&&selected.index===index&&selected.start===i));
    if(selected?.kind===kind&&selected.index===index&&i>=selected.start)el.classList.add('selected');
    box.append(el);
    el.addEventListener('click',e=>{e.stopPropagation();clickPile(kind,index,i);});
  });
  box.addEventListener('click',()=>clickPile(kind,index,cards.length-1));
  slot.append(box);container.append(slot);
}
function clickPile(kind,index,start) {
  if(kind==='stock'){commit(drawStock(state));return;}
  if(selected?.kind===kind&&selected.index===index&&selected.start===start) {
    selected=null;render();return;
  }
  if(selected) {
    const next=move(state,{kind:selected.kind,index:selected.index},{kind,index},selected.start);
    if(next){commit(next);return;}
  }
  const src=kind==='waste'?state.waste:state[kind]?.[index];
  selected=src?.[start]?.up?{kind,index,start}:null;
  render();
}
function render() {
  const top=$('top'),tableau=$('tableau');top.replaceChildren();tableau.replaceChildren();
  pile('stock',null,top);pile('waste',0,top);
  for(let i=0;i<4;i++)pile('foundations',i,top);
  for(let i=0;i<7;i++)pile('tableau',i,tableau);
  $('status').textContent=won(state)?'You won!':`Moves: ${state.moves} · Deal: ${state.seed}`;
  $('selection').textContent=selected?'Selected '+label((selected.kind==='waste'?state.waste:state[selected.kind][selected.index])[selected.start])+' — tap a destination or tap again to cancel.':'';
  $('draw').value=String(state.draw);$('undo').disabled=!history.length;
}
$('new').onclick=()=>{
  if(!confirm('Start a new deal?'))return;
  history=[];state=newGame(Date.now(),Number($('draw').value));selected=null;persist();render();
};
// Draw mode is a preference, not a move; retain it when undoing earlier moves.
$('draw').onchange=()=>{state={...state,draw:Number($('draw').value)};selected=null;persist();render();};
$('undo').onclick=()=>{
  if(history.length){state={...history.pop(),draw:state.draw};selected=null;persist();render();}
};
$('hint').onclick=()=>{
  for(const kind of ['waste','tableau']) {
    const piles=kind==='waste'?[state.waste]:state.tableau;
    for(let i=0;i<piles.length;i++)for(let j=0;j<piles[i].length;j++) {
      if(!piles[i][j].up)continue;
      for(let f=0;f<4;f++)if(move(state,{kind,index:i},{kind:'foundations',index:f},j)) {
        $('status').textContent='Try moving '+label(piles[i][j])+piles[i][j].suit+' to a foundation';return;
      }
    }
  }
  $('status').textContent='Try moving cards between columns or drawing from stock';
};
if('serviceWorker' in navigator) {
  // A worker update is activated only after its complete shell has cached.
  // Reload once on replacement so old JS cannot keep running with new assets.
  let controlled=Boolean(navigator.serviceWorker.controller),reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(controlled&&!reloading){reloading=true;location.reload();}
    controlled=true;
  });
  navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
    const check=()=>reg.update().catch(()=>{});
    window.addEventListener('online',check);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
    check();
  }).catch(()=>{});
}
render();
