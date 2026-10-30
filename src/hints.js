// Bounded, deterministic position evaluation shared by all games. This is a
// local aid, not a solver: a legal move alone is not evidence of progress.
const gameOf=s=>s.game||'klondike';
export function positionKey(s) {
  // Columns, cells and home slots are interchangeable. Spider copies of the
  // same rank/suit are interchangeable too. Counters do not change a position.
  const pile=p=>p.map(c=>`${c.rank}${c.suit}${c.up?'+':'-'}`).join(',');
  const group=ps=>(ps||[]).map(pile).sort();
  return JSON.stringify([gameOf(s),s.draw,s.suits,group(s.tableau),group(s.cells),
    group(s.foundations),group(s.completed),pile(s.stock||[]),pile(s.waste||[])]);
}
function features(s) {
  const spider=gameOf(s)==='spider';
  return {
    home:(s.foundations||[]).flat().length,
    runs:(s.completed||[]).filter(p=>p.length).length,
    covered:s.tableau.flat().filter(c=>!c.up).length,
    empty:s.tableau.filter(p=>!p.length).length,
    cells:(s.cells||[]).filter(p=>!p.length).length,
    joins:s.tableau.reduce((n,p)=>n+p.filter((c,i)=>i&&c.up&&p[i-1].up&&p[i-1].rank===c.rank+1&&
      (spider?p[i-1].suit===c.suit:p[i-1].red!==c.red)).length,0)
  };
}
export function evaluate(s) {
  const f=features(s);
  return f.runs*3000+f.home*200-f.covered*100+f.empty*40+f.cells*12+f.joins*6;
}
function reason(before,after) {
  const a=features(before),b=features(after);
  if(b.runs>a.runs)return 'Completes a run.';
  if(b.home>a.home)return 'Builds a foundation.';
  if(b.covered<a.covered)return 'Reveals a covered card.';
  if(b.empty>a.empty)return 'Frees a column.';
  if(b.cells>a.cells)return 'Frees a cell.';
  return gameOf(before)==='spider'?'Joins same-suit sequences.':'Joins separated sequences.';
}
export function candidates(s,move) {
  const spider=gameOf(s)==='spider',result=[];
  const fromKinds=spider?['tableau']:s.cells?['cells','tableau']:['waste','tableau'];
  const toKinds=spider?['tableau']:s.cells?['foundations','tableau','cells']:['foundations','tableau'];
  for(const kind of fromKinds)for(const [index,src] of (kind==='waste'?[s.waste]:s[kind]).entries()) {
    for(let start=src.length-1;start>=0;start--) {
      const card=src[start],group=src.slice(start);
      if(!group.every((c,i)=>c.up&&(!i||group[i-1].rank===c.rank+1&&
        (spider?group[i-1].suit===c.suit:group[i-1].red!==c.red))))break;
      if(kind!=='tableau'&&start!==src.length-1)break;
      for(const toKind of toKinds)for(const [j,dst] of s[toKind].entries()) {
        if(kind===toKind&&index===j||kind==='cells'&&toKind==='cells')continue;
        if(toKind!=='tableau'&&group.length!==1)continue;
        // Moving a whole column into another empty slot merely renames it.
        if(toKind==='tableau'&&!dst.length&&kind==='tableau'&&start===0)continue;
        const last=dst.at(-1);
        if(toKind==='tableau'&&last&&(last.rank!==card.rank+1||!spider&&last.red===card.red))continue;
        if(toKind==='tableau'&&!last&&!spider&&!s.cells&&card.rank!==13)continue;
        if(toKind==='cells'&&dst.length)continue;
        if(toKind==='foundations'&&(last?last.suit!==card.suit||last.rank+1!==card.rank:card.rank!==1))continue;
        const from={kind,index},to={kind:toKind,index:j},next=move(s,from,to,start);
        if(next)result.push({action:{type:'move',from,to,start},state:next});
      }
    }
  }
  return result;
}
export function chooseHint(s,move,recent=[]) {
  const initial=evaluate(s),seen=new Set(recent.map(p=>typeof p==='string'?p:positionKey(p)));
  seen.add(positionKey(s));
  let frontier=[{state:s}],best=null;
  // Search only when no immediate improvement exists. At most 25 positions
  // are expanded (root + 12 + 12), and never beyond three moves.
  for(let depth=1;depth<=3;depth++) {
    const next=[];
    for(const node of frontier)for(const candidate of candidates(node.state,move)) {
      const key=positionKey(candidate.state);if(seen.has(key))continue;seen.add(key);
      const score=evaluate(candidate.state),first=node.first||candidate.action;
      const entry={state:candidate.state,first,score};next.push(entry);
      if(score>initial&&(!best||score>best.score))best={...entry,
        reason:depth===1?reason(s,candidate.state):`Sets up progress within ${depth} moves.`};
    }
    if(best)return {...best.first,reason:best.reason};
    frontier=next.sort((a,b)=>b.score-a.score).slice(0,12);
    if(!frontier.length)break;
  }
  return null;
}
export function unseen(s,recent=[]) {
  const key=positionKey(s);
  return !recent.some(p=>(typeof p==='string'?p:positionKey(p))===key);
}
