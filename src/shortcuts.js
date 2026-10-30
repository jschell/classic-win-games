// These shortcuts use the same rule engines as manual moves.
export function toFoundation(state, move, from, start) {
  if (!["tableau", "cells", "waste"].includes(from.kind)) return null;
  const source =
    from.kind === "waste" ? state.waste : state[from.kind]?.[from.index];
  if (!source?.length || start !== source.length - 1) return null;
  for (let index = 0; index < 4; index++) {
    const next = move(state, from, { kind: "foundations", index }, start);
    if (next) return next;
  }
  return null;
}

// Offer Finish only when foundation moves alone provably complete this board.
// This is bounded by the deck size and never exposes a partial automatic plan.
export function finishGame(state, move, won) {
  if (
    !state.foundations ||
    won(state) ||
    state.stock?.length ||
    state.tableau.some((pile) => pile.some((card) => !card.up))
  )
    return null;
  let next = state;
  for (let step = 0; step < 52; step++) {
    let advanced = null;
    for (const kind of ["tableau", "cells", "waste"]) {
      const piles = kind === "waste" ? [next.waste || []] : next[kind] || [];
      for (const [index, pile] of piles.entries()) {
        advanced = toFoundation(next, move, { kind, index }, pile.length - 1);
        if (advanced) break;
      }
      if (advanced) break;
    }
    if (!advanced) return null;
    next = advanced;
    if (won(next)) return next;
  }
  return null;
}
