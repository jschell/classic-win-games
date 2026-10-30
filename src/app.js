import * as klondike from './klondike.js';
import * as freecell from './freecell.js';
import * as spider from './spider.js';
import {renderBoard,pileCards} from './board.js';
import {label} from './cards.js';
import {positionKey} from './hints.js';

const $=id=>document.getElementById(id);
const games={klondike,freecell,spider};
const names={klondike:'Klondike',freecell:'FreeCell',spider:'Spider'};
let game,engine,key,spiderSuits=1;
let state, history=[], selected=null, recent=[];
function remember() {
  const fingerprint=positionKey(state);
  if(recent.at(-1)!==fingerprint)recent.push(fingerprint);
  recent=recent.slice(-128);
  try{localStorage.setItem(`${key}-hint-trail`,JSON.stringify(recent));}catch{}
}
function loadGame(mode) {
  game=Object.hasOwn(games,location.hash.slice(1))?location.hash.slice(1):'klondike';engine=games[game];
  try{spiderSuits=Number(localStorage.getItem('classic-win-spider-suits-v1'));}catch{spiderSuits=1;}
  if(spider.SUIT_MODES.includes(mode))spiderSuits=mode;
  if(!spider.SUIT_MODES.includes(spiderSuits))spiderSuits=1;
  // Keep the original one-suit key; existing boards need no migration.
  key=game==='spider'&&spiderSuits!==1?`classic-win-spider-${spiderSuits}-v1`:`classic-win-${game}-v1`;
  history=[];selected=null;
  const fresh=()=>game==='spider'?spider.newGame(undefined,spiderSuits):engine.newGame();
  try {const saved=JSON.parse(localStorage.getItem(key));state=engine.validate(saved)&&(game!=='spider'||saved.suits===spiderSuits)?saved:fresh();}
  catch {state=fresh();}
  try{recent=JSON.parse(localStorage.getItem(`${key}-hint-trail`));}catch{recent=[];}
  if(!Array.isArray(recent)||recent.some(p=>typeof p!=='string')||recent.at(-1)!==positionKey(state))recent=[];
  remember();
  document.querySelector('main').dataset.game=game;
  for(const link of document.querySelectorAll('nav a')) {
    if(link.hash===`#${game}`)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  $('draw-control').hidden=game!=='klondike';$('deal-form').hidden=game==='klondike';
  $('spider-controls').hidden=game!=='spider';$('spider-suits').value=String(spiderSuits);
  let layout='fit';try{layout=localStorage.getItem('classic-win-spider-layout-v1')==='large'?'large':'fit';}catch{}
  $('spider-layout').value=layout;document.querySelector('main').dataset.layout=layout;
  $('deal-number').value=String(state.seed);
  $('board').setAttribute('aria-label',`${names[game]} game board`);
  $('help').textContent=game==='spider'
    ?`Spider · ${spiderSuits} ${spiderSuits===1?'suit':'suits'}. Build down by rank regardless of suit. Only descending same-suit sequences move together; a mixed-suit stack must be separated. Any card or movable sequence can fill an empty column. Complete same-suit King-to-Ace runs are removed automatically. Fill every column before dealing a row. Each suit mode keeps its own saved deal. Tap again to cancel selection. Larger cards scroll sideways; long columns scroll down.`
    :game==='freecell'
    ?'Build columns down in alternating colors. Any card can fill an empty column. Each cell holds one card. Build homes from Ace to King by suit. Tap an exposed card or sequence, then its destination; tap again to cancel. Sequence moves require enough empty cells and columns.'
    :'Column labels show covered-card counts (↓). Tap or click a face-up card, then its destination. Tap the selected card again to cancel. Tap stock to draw; only the top waste card is playable. Select a card and tap a foundation to move it.';
  render();
}
window.addEventListener('hashchange',()=>{persist();loadGame();});
function persist() {
  try { localStorage.setItem(key,JSON.stringify(state)); }
  catch { $('storage-note').hidden=false; }
}
function commit(next) {
  if(!next)return;
  history.push(state);state=next;selected=null;remember();persist();render();
}
function clickPile(kind,index,start) {
  if(kind==='stock'){
    if(game==='spider') {
      const next=spider.dealRow(state);
      if(next)commit(next);else render(state.stock.length?'Fill every empty column before dealing a row.':'No stock rows remain.');
    } else commit(klondike.drawStock(state));
    return;
  }
  if(selected?.kind===kind&&selected.index===index&&selected.start===start) {
    selected=null;render();return;
  }
  if(selected) {
    const next=engine.move(state,{kind:selected.kind,index:selected.index},{kind,index},selected.start);
    if(next){commit(next);return;}
    if(game!=='klondike'){render(game==='spider'?'Move unavailable. Use a descending same-suit sequence and place it on the next higher rank or an empty column.':'Move unavailable. Check descending colors, empty cells and sequence capacity.');return;}
  }
  const src=pileCards(state,kind,index);
  if(game!=='klondike'&&(kind==='foundations'||kind==='tableau'&&!engine.isSequence(src.slice(start)))) {selected=null;render(game==='spider'?'Select an exposed card or descending same-suit sequence.':'Select an exposed card or a descending sequence of alternating colors.');return;}
  selected=src?.[start]?.up?{kind,index,start}:null;
  render();
}
function render(message='') {
  renderBoard({state,selected,onPile:clickPile,game,top:$('top'),tableau:$('tableau')});
  $('status').textContent=engine.won(state)?'You won!':`Moves: ${state.moves} · Deal: ${state.seed}`+(game==='spider'?` · ${state.suits} ${state.suits===1?'suit':'suits'} · Runs: ${state.completed.filter(p=>p.length).length}/8`:'');
  const chosen=selected?pileCards(state,selected.kind,selected.index)[selected.start]:null;
  const capacity=game==='freecell'?` Empty cells: ${state.cells.filter(p=>!p.length).length}.` : '';
  $('selection').textContent=message||(chosen?'Selected '+label(chosen)+chosen.suit+' — tap a destination or tap again to cancel.'+capacity:'');
  if(game==='klondike')$('draw').value=String(state.draw);
  $('undo').disabled=!history.length;
}
function deal(seed) {
  history=[];state=game==='klondike'?engine.newGame(seed,Number($('draw').value)):game==='spider'?spider.newGame(seed,spiderSuits):engine.newGame(seed);selected=null;
  $('deal-number').value=String(state.seed);recent=[];remember();persist();render();
}
$('new').onclick=()=>{
  if(!confirm('Start a new deal?'))return;
  deal(game==='klondike'?Date.now():undefined);
};
// Draw mode is a preference, not a move; retain it when undoing earlier moves.
$('draw').onchange=()=>{state={...state,draw:Number($('draw').value)};selected=null;recent=[];remember();persist();render();};
$('restart').onclick=()=>{if(confirm('Restart this deal?'))deal(state.seed);};
$('deal-form').onsubmit=e=>{e.preventDefault();if($('deal-number').reportValidity()&&confirm('Play this numbered deal?'))deal(Number($('deal-number').value));};
$('undo').onclick=()=>{
  if(history.length){state=game==='klondike'?{...history.pop(),draw:state.draw}:history.pop();selected=null;const i=recent.lastIndexOf(positionKey(state));recent=i<0?[]:recent.slice(0,i+1);remember();persist();render();}
};
$('spider-suits').onchange=()=>{
  persist();
  spiderSuits=Number($('spider-suits').value);
  try{localStorage.setItem('classic-win-spider-suits-v1',String(spiderSuits));}catch{}
  loadGame(spiderSuits);
};
$('spider-layout').onchange=()=>{
  document.querySelector('main').dataset.layout=$('spider-layout').value;
  try{localStorage.setItem('classic-win-spider-layout-v1',$('spider-layout').value);}catch{}
};
$('hint').onclick=()=>{
  selected=null;
  const hint=engine.hint(state,recent);
  if(hint?.type==='move') {
    selected={...hint.from,start:hint.start};
    const card=pileCards(state,hint.from.kind,hint.from.index)[hint.start];
    const destination=hint.to.kind==='tableau'?'column':hint.to.kind==='cells'?'cell':'foundation';
    render(`Try moving ${label(card)}${card.suit} to ${destination} ${hint.to.index+1}. ${hint.reason}`);
  } else if(hint?.type==='deal')render('Try dealing a new row from stock. '+hint.reason);
  else if(hint?.type==='draw')render(hint.reason);
  else render('No improving hint found within three moves. You can try another move, Undo, or restart.');
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
    window.addEventListener('focus',check);
    window.setInterval(check,60*60*1000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
    check();
  }).catch(()=>{});
}
loadGame();
