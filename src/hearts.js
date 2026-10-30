import { deck, shuffle, suits } from "./cards.js";
export const MAX_SEED = 2147483647;
export const TARGET = 100;
export const NAMES = ["You", "West", "North", "East"];
export const value = (c) => (c.rank === 1 ? 14 : c.rank);
export const penalty = (c) =>
  c.suit === "♥" ? 1 : c.suit === "♠" && c.rank === 12 ? 13 : 0;
export const passOffset = (s) => [1, 3, 2, 0][s.handNumber % 4];
export const passName = (s) =>
  ["left", "right", "across", "hold"][s.handNumber % 4];
const sort = (cards) =>
  cards.sort(
    (a, b) =>
      suits.indexOf(a.suit) - suits.indexOf(b.suit) || value(a) - value(b),
  );
const opener = (hands) =>
  hands.findIndex((p) => p.some((c) => c.suit === "♣" && c.rank === 2));
function hand(seed, handNumber) {
  const hands = Array.from({ length: 4 }, () => []);
  shuffle(
    deck(),
    (seed + Math.imul(handNumber, 0x9e3779b9)) >>> 0 || 1,
  ).forEach((c, i) => hands[i % 4].push({ ...c, up: true }));
  hands.forEach(sort);
  const leader = opener(hands);
  return {
    hands,
    handNumber,
    leader,
    turn: leader,
    broken: false,
    trick: [],
    tricks: [],
    sent: [],
    received: [],
    phase: handNumber % 4 === 3 ? "play" : "pass",
  };
}
export function newGame(seed = Date.now() % MAX_SEED || 1) {
  if (!Number.isInteger(seed) || seed < 1 || seed > MAX_SEED)
    throw new RangeError("Match number must be 1–2147483647");
  return {
    game: "hearts",
    version: 1,
    seed,
    moves: 0,
    scores: [0, 0, 0, 0],
    rounds: [],
    ...hand(seed, 0),
  };
}
export function passCards(s, choices) {
  if (s.phase !== "pass" || !Array.isArray(choices) || choices.length !== 4)
    return null;
  if (
    choices.some(
      (ids, p) =>
        !Array.isArray(ids) ||
        ids.length !== 3 ||
        new Set(ids).size !== 3 ||
        ids.some((id) => !s.hands[p].some((c) => c.id === id)),
    )
  )
    return null;
  const n = structuredClone(s),
    offset = passOffset(s);
  const packets = n.hands.map((p, i) =>
    p.filter((c) => choices[i].includes(c.id)),
  );
  n.hands = n.hands.map((p, i) => p.filter((c) => !choices[i].includes(c.id)));
  packets.forEach((cards, i) => n.hands[(i + offset) % 4].push(...cards));
  n.hands.forEach(sort);
  n.sent = packets[0].map((c) => c.id);
  n.received = packets[(4 - offset) % 4].map((c) => c.id);
  n.leader = n.turn = opener(n.hands);
  n.phase = "play";
  n.moves++;
  return n;
}
export function legalCards(s, player = s.turn) {
  if (s.phase !== "play" || player !== s.turn || !s.hands[player]) return [];
  const cards = s.hands[player];
  if (!s.tricks.length && !s.trick.length)
    return cards.filter((c) => c.suit === "♣" && c.rank === 2);
  if (s.trick.length) {
    const follow = cards.filter((c) => c.suit === s.trick[0].card.suit);
    if (follow.length) return follow;
    if (!s.tricks.length) {
      const safe = cards.filter((c) => !penalty(c));
      if (safe.length) return safe;
    }
    return cards;
  }
  if (!s.broken) {
    const other = cards.filter((c) => c.suit !== "♥");
    if (other.length) return other;
  }
  return cards;
}
export function play(s, player, id) {
  if (!legalCards(s, player).some((c) => c.id === id)) return null;
  const n = structuredClone(s),
    i = n.hands[player].findIndex((c) => c.id === id),
    card = n.hands[player].splice(i, 1)[0];
  n.trick.push({ player, card });
  n.broken ||= card.suit === "♥";
  n.moves++;
  if (n.trick.length === 4) n.phase = "trick";
  else n.turn = (player + 1) % 4;
  return n;
}
export function trickWinner(trick) {
  const lead = trick[0]?.card.suit;
  return trick
    .filter((e) => e.card.suit === lead)
    .reduce((a, b) => (value(a.card) > value(b.card) ? a : b)).player;
}
export function handPoints(s) {
  const points = [0, 0, 0, 0];
  for (const t of s.tricks)
    points[t.winner] += t.cards.reduce((sum, e) => sum + penalty(e.card), 0);
  return points;
}
export function scoreHand(raw) {
  const moon = raw.findIndex((p) => p === 26);
  return {
    raw: [...raw],
    moon: moon < 0 ? null : moon,
    points: moon < 0 ? [...raw] : raw.map((_, p) => (p === moon ? 0 : 26)),
  };
}
export function collect(s) {
  if (s.phase !== "trick" || s.trick.length !== 4) return null;
  const n = structuredClone(s),
    winner = trickWinner(n.trick);
  n.tricks.push({ cards: n.trick, winner });
  n.trick = [];
  n.turn = n.leader = winner;
  n.phase = "play";
  n.moves++;
  if (n.tricks.length === 13) {
    const result = scoreHand(handPoints(n));
    n.rounds.push(result);
    n.scores = n.scores.map((p, i) => p + result.points[i]);
    n.phase = n.scores.some((p) => p >= TARGET) ? "gameOver" : "handOver";
  }
  return n;
}
export function nextHand(s) {
  return s.phase === "handOver"
    ? {
        ...structuredClone(s),
        ...hand(s.seed, s.handNumber + 1),
        moves: s.moves + 1,
      }
    : null;
}
export const winners = (s) =>
  s.phase === "gameOver"
    ? s.scores.flatMap((n, i) => (n === Math.min(...s.scores) ? [i] : []))
    : [];
// Computer strategy and human hints receive only this public/own-hand view.
export function playerView(s, player) {
  return {
    hand: structuredClone(s.hands[player]),
    legal: structuredClone(legalCards(s, player)),
    trick: structuredClone(s.trick),
    broken: s.broken,
    points: handPoints(s),
  };
}
export function choosePass(view) {
  const danger = (c) =>
    (c.suit === "♠" && c.rank === 12
      ? 100
      : c.suit === "♠" && value(c) > 12
        ? 80
        : 0) +
    (c.suit === "♥" ? 20 : 0) +
    value(c);
  return [...view.hand]
    .sort((a, b) => danger(b) - danger(a) || a.id - b.id)
    .slice(0, 3)
    .map((c) => c.id);
}
export function chooseCard(view) {
  const cards = [...view.legal];
  if (!cards.length) return null;
  const low = (a, b) => value(a) - value(b) || a.id - b.id;
  if (!view.trick.length)
    return cards.sort((a, b) => penalty(a) - penalty(b) || low(a, b))[0].id;
  const suit = view.trick[0].card.suit;
  if (cards.every((c) => c.suit !== suit))
    return cards.sort((a, b) => penalty(b) - penalty(a) || low(b, a))[0].id;
  const high = Math.max(
    ...view.trick.filter((e) => e.card.suit === suit).map((e) => value(e.card)),
  );
  const under = cards.filter((c) => value(c) < high);
  if (under.length) return under.sort((a, b) => low(b, a))[0].id;
  // Last to play: shed a high non-penalty card when the trick is harmless.
  if (view.trick.length === 3 && !view.trick.some((e) => penalty(e.card))) {
    const safe = cards.filter((c) => !penalty(c));
    if (safe.length) return safe.sort((a, b) => low(b, a))[0].id;
  }
  return cards.sort(low)[0].id;
}
export function advanceComputers(s) {
  let n = s;
  // No timers: stop at the human decision or a visible completed trick.
  for (let i = 0; i < 3 && n.phase === "play" && n.turn !== 0; i++)
    n = play(n, n.turn, chooseCard(playerView(n, n.turn)));
  return n;
}
export function validate(s) {
  try {
    if (
      !s ||
      s.game !== "hearts" ||
      s.version !== 1 ||
      !Number.isInteger(s.seed) ||
      s.seed < 1 ||
      s.seed > MAX_SEED ||
      !Number.isInteger(s.handNumber) ||
      s.handNumber < 0 ||
      s.handNumber > 100 ||
      !Number.isInteger(s.moves) ||
      s.moves < 0 ||
      typeof s.broken !== "boolean" ||
      !["pass", "play", "trick", "handOver", "gameOver"].includes(s.phase)
    )
      return false;
    if (
      !Array.isArray(s.hands) ||
      s.hands.length !== 4 ||
      !s.hands.every(Array.isArray) ||
      !Array.isArray(s.trick) ||
      s.trick.length > 4 ||
      !Array.isArray(s.tricks) ||
      s.tricks.length > 13 ||
      !Array.isArray(s.rounds) ||
      !Array.isArray(s.scores) ||
      s.scores.length !== 4 ||
      !Array.isArray(s.sent) ||
      !Array.isArray(s.received)
    )
      return false;
    const entries = [...s.tricks.flatMap((t) => t.cards), ...s.trick];
    if (
      entries.some(
        (e) => !Number.isInteger(e.player) || e.player < 0 || e.player > 3,
      )
    )
      return false;
    const cards = [...s.hands.flat(), ...entries.map((e) => e.card)],
      canonical = deck();
    if (
      cards.length !== 52 ||
      new Set(cards.map((c) => c?.id)).size !== 52 ||
      cards.some(
        (c) =>
          !c ||
          c.up !== true ||
          !canonical[c.id] ||
          ["id", "rank", "suit", "red"].some(
            (k) => c[k] !== canonical[c.id][k],
          ),
      )
    )
      return false;
    const finished = ["handOver", "gameOver"].includes(s.phase);
    if (s.rounds.length !== s.handNumber + (finished ? 1 : 0)) return false;
    const totals = [0, 0, 0, 0];
    for (const r of s.rounds) {
      if (
        !Array.isArray(r.raw) ||
        r.raw.length !== 4 ||
        r.raw.some((n) => !Number.isInteger(n) || n < 0 || n > 26) ||
        r.raw.reduce((a, b) => a + b, 0) !== 26
      )
        return false;
      const expected = scoreHand(r.raw);
      if (
        JSON.stringify(r.points) !== JSON.stringify(expected.points) ||
        r.moon !== expected.moon
      )
        return false;
      if (totals.some((n) => n >= TARGET)) return false;
      r.points.forEach((n, i) => (totals[i] += n));
    }
    if (
      JSON.stringify(totals) !== JSON.stringify(s.scores) ||
      (s.phase === "gameOver") !== s.scores.some((n) => n >= TARGET)
    )
      return false;
    const initial = s.hands.map((p, i) => [
      ...p,
      ...entries.filter((e) => e.player === i).map((e) => e.card),
    ]);
    if (initial.some((p) => p.length !== 13)) return false;
    const metadataLength = s.phase === "pass" || !passOffset(s) ? 0 : 3;
    for (const ids of [s.sent, s.received])
      if (
        ids.length !== metadataLength ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => !canonical[id])
      )
        return false;
    if (
      s.received.some((id) => !initial[0].some((c) => c.id === id)) ||
      s.sent.some((id) => !initial[passOffset(s)].some((c) => c.id === id))
    )
      return false;
    const leader = opener(initial);
    if (s.phase === "pass")
      return (
        passOffset(s) !== 0 &&
        !entries.length &&
        s.turn === leader &&
        s.leader === leader &&
        !s.broken
      );
    // Replay only public plays against reconstructed post-pass hands. This
    // catches reneging, invalid opening/heart leads, turns and trick winners.
    const check = {
      hands: initial.map((p) => [...p]),
      turn: leader,
      leader,
      broken: false,
      phase: "play",
      trick: [],
      tricks: [],
    };
    function replay(e) {
      if (!legalCards(check, e.player).some((c) => c.id === e.card.id))
        return false;
      check.hands[e.player] = check.hands[e.player].filter(
        (c) => c.id !== e.card.id,
      );
      check.trick.push(e);
      check.broken ||= e.card.suit === "♥";
      if (check.trick.length === 4) check.phase = "trick";
      else check.turn = (e.player + 1) % 4;
      return true;
    }
    for (const t of s.tricks) {
      if (
        !Array.isArray(t.cards) ||
        t.cards.length !== 4 ||
        !t.cards.every(replay) ||
        t.winner !== trickWinner(t.cards)
      )
        return false;
      check.turn = check.leader = t.winner;
      check.trick = [];
      check.tricks.push(t);
      check.phase = "play";
    }
    if (
      !s.trick.every(replay) ||
      s.turn !== check.turn ||
      s.leader !== check.leader ||
      s.broken !== check.broken
    )
      return false;
    if (finished)
      return (
        s.tricks.length === 13 &&
        !s.trick.length &&
        JSON.stringify(s.rounds.at(-1).raw) === JSON.stringify(handPoints(s))
      );
    return s.tricks.length < 13 && s.phase === check.phase;
  } catch {
    return false;
  }
}
