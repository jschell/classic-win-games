import * as klondike from './klondike.js';
import * as freecell from './freecell.js';
import {renderBoard,pileCards} from './board.js';
import {label} from './cards.js';

const $=id=>document.getElementById(id);
const games={klondike,freecell};
let game,engine,key;
let state, history=[], selected=null;
function loadGame() {
  game=location.hash==='#freecell'?'freecell':'klondike';engine=games[game];
  key=`classic-win-${game}-v1`;history=[];selected=null;
  try {const saved=JSON.parse(localStorage.getItem(key));state=engine.validate(saved)?saved:engine.newGame();}
  catch {state=engine.newGame();}
  document.querySelector('main').dataset.game=game;
  for(const link of document.querySelectorAll('nav a')) {
    if(link.hash===`#${game}`)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  $('draw-control').hidden=game==='freecell';$('deal-form').hidden=game!=='freecell';
  $('deal-number').value=String(state.seed);
  $('board').setAttribute('aria-label',game==='freecell'?'FreeCell game board':'Klondike game board');
  $('help').textContent=game==='freecell'
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
  history.push(state);state=next;selected=null;persist();render();
}
function clickPile(kind,index,start) {
  if(kind==='stock'){commit(klondike.drawStock(state));return;}
  if(selected?.kind===kind&&selected.index===index&&selected.start===start) {
    selected=null;render();return;
  }
  if(selected) {
    const next=engine.move(state,{kind:selected.kind,index:selected.index},{kind,index},selected.start);
    if(next){commit(next);return;}
    if(game==='freecell'){render('Move unavailable. Check descending colors, empty cells and sequence capacity.');return;}
  }
  const src=pileCards(state,kind,index);
  if(game==='freecell'&&(kind==='foundations'||kind==='tableau'&&!freecell.isSequence(src.slice(start)))) {selected=null;render('Select an exposed card or a descending sequence of alternating colors.');return;}
  selected=src?.[start]?.up?{kind,index,start}:null;
  render();
}
function render(message='') {
  renderBoard({state,selected,onPile:clickPile,game,top:$('top'),tableau:$('tableau')});
  $('status').textContent=engine.won(state)?'You won!':`Moves: ${state.moves} · Deal: ${state.seed}`;
  const chosen=selected?pileCards(state,selected.kind,selected.index)[selected.start]:null;
  const capacity=game==='freecell'?` Empty cells: ${state.cells.filter(p=>!p.length).length}.` : '';
  $('selection').textContent=message||(chosen?'Selected '+label(chosen)+chosen.suit+' — tap a destination or tap again to cancel.'+capacity:'');
  if(game==='klondike')$('draw').value=String(state.draw);
  $('undo').disabled=!history.length;
}
function deal(seed) {
  history=[];state=engine.newGame(seed,Number($('draw').value));selected=null;
  $('deal-number').value=String(state.seed);persist();render();
}
$('new').onclick=()=>{
  if(!confirm('Start a new deal?'))return;
  deal(game==='freecell'?undefined:Date.now());
};
// Draw mode is a preference, not a move; retain it when undoing earlier moves.
$('draw').onchange=()=>{state={...state,draw:Number($('draw').value)};selected=null;persist();render();};
$('restart').onclick=()=>{if(confirm('Restart this deal?'))deal(state.seed);};
$('deal-form').onsubmit=e=>{e.preventDefault();if($('deal-number').reportValidity()&&confirm('Play this numbered deal?'))deal(Number($('deal-number').value));};
$('undo').onclick=()=>{
  if(history.length){state=game==='klondike'?{...history.pop(),draw:state.draw}:history.pop();selected=null;persist();render();}
};
$('hint').onclick=()=>{
  if(game==='freecell') {
    const hint=freecell.hint(state);
    if(hint){selected={...hint.from,start:hint.start};render(`Try moving ${label(pileCards(state,hint.from.kind,hint.from.index)[hint.start])} to ${hint.to.kind==='tableau'?'column':hint.to.kind==='cells'?'cell':'home'} ${hint.to.index+1}.`);}
    else render('No useful move found. Try Undo or restart this deal.');
    return;
  }
  for(const kind of ['waste','tableau']) {
    const piles=kind==='waste'?[state.waste]:state.tableau;
    for(let i=0;i<piles.length;i++)for(let j=0;j<piles[i].length;j++) {
      if(!piles[i][j].up)continue;
      for(let f=0;f<4;f++)if(klondike.move(state,{kind,index:i},{kind:'foundations',index:f},j)) {
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
    window.addEventListener('focus',check);
    window.setInterval(check,60*60*1000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
    check();
  }).catch(()=>{});
}
loadGame();
