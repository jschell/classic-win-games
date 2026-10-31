// Pure rules. Clues are derived from mine positions, never trusted from a save.
export const LEVELS = Object.freeze({
  beginner: Object.freeze({ width: 9, height: 9, mines: 10 }),
  intermediate: Object.freeze({ width: 16, height: 16, mines: 40 }),
  expert: Object.freeze({ width: 30, height: 16, mines: 99 }),
});
export function newGame(
  seed = Date.now(),
  difficulty = "beginner",
  questions = true,
) {
  if (!Object.hasOwn(LEVELS, difficulty)) throw Error("Unknown difficulty");
  const { width, height } = LEVELS[difficulty];
  return {
    version: 1,
    game: "minesweeper",
    seed: (Number(seed) >>> 0) % 2147483647 || 1,
    difficulty,
    questions: Boolean(questions),
    mines: null,
    revealed: Array(width * height).fill(false),
    marks: Array(width * height).fill(0),
    status: "ready",
    exploded: null,
    elapsedMs: 0,
  };
}
export function neighbors(state, index) {
  const { width, height } = LEVELS[state.difficulty],
    result = [];
  const row = Math.floor(index / width),
    column = index % width;
  for (let y = Math.max(0, row - 1); y <= Math.min(height - 1, row + 1); y++)
    for (
      let x = Math.max(0, column - 1);
      x <= Math.min(width - 1, column + 1);
      x++
    )
      if (y * width + x !== index) result.push(y * width + x);
  return result;
}
export function clues(state) {
  const values = state.revealed.map(() => 0);
  for (const index of state.mines || []) values[index] = -1;
  for (const index of state.mines || [])
    for (const near of neighbors(state, index))
      if (values[near] !== -1) values[near]++;
  return values;
}
function place(state, first) {
  const excluded = new Set([first, ...neighbors(state, first)]);
  const candidates = state.revealed
    .map((_, i) => i)
    .filter((i) => !excluded.has(i));
  let random = state.seed;
  for (let i = candidates.length - 1; i > 0; i--) {
    random ^= random << 13;
    random ^= random >>> 17;
    random ^= random << 5;
    const j = (random >>> 0) % (i + 1);
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return candidates
    .slice(0, LEVELS[state.difficulty].mines)
    .sort((a, b) => a - b);
}
const available = (s, i) =>
  ["ready", "playing"].includes(s.status) &&
  Number.isInteger(i) &&
  i >= 0 &&
  i < s.revealed.length &&
  !s.revealed[i];
function uncover(state, targets) {
  const values = clues(state),
    next = {
      ...state,
      status: "playing",
      revealed: [...state.revealed],
      marks: [...state.marks],
    };
  const queue = [...new Set(targets)],
    queued = new Set(queue);
  let changed = false;
  while (queue.length) {
    const index = queue.pop();
    if (next.revealed[index] || next.marks[index] === 1) continue;
    changed = true;
    next.revealed[index] = true;
    next.marks[index] = 0;
    if (values[index] === -1) {
      next.status = "lost";
      next.exploded = index;
      return next;
    }
    if (values[index] === 0)
      for (const near of neighbors(state, index))
        if (!queued.has(near)) {
          queued.add(near);
          queue.push(near);
        }
  }
  if (!changed) return null;
  if (
    next.revealed.filter(Boolean).length ===
    next.revealed.length - next.mines.length
  ) {
    next.status = "won";
    for (const index of next.mines) next.marks[index] = 1;
  }
  return next;
}
export function reveal(state, index) {
  if (!available(state, index) || state.marks[index] === 1) return null;
  // Replays retain the exact minefield, including a potentially fatal first move.
  return uncover(
    state.mines ? state : { ...state, mines: place(state, index) },
    [index],
  );
}
export function mark(state, index) {
  if (!available(state, index)) return null;
  const marks = [...state.marks];
  marks[index] = state.questions
    ? (marks[index] + 1) % 3
    : marks[index] === 1
      ? 0
      : 1;
  return { ...state, marks };
}
export function setQuestions(state, enabled) {
  return {
    ...state,
    questions: Boolean(enabled),
    marks: state.marks.map((m) => (!enabled && m === 2 ? 0 : m)),
  };
}
export function chord(state, index) {
  if (
    state.status !== "playing" ||
    !Number.isInteger(index) ||
    !state.revealed[index]
  )
    return null;
  const around = neighbors(state, index),
    number = clues(state)[index];
  if (
    number <= 0 ||
    around.filter((i) => state.marks[i] === 1).length !== number
  )
    return null;
  // Matching flag counts are not proof: an incorrectly flagged chord can explode.
  return uncover(
    state,
    around.filter((i) => !state.revealed[i] && state.marks[i] !== 1),
  );
}
export function restart(state) {
  return {
    ...newGame(state.seed, state.difficulty, state.questions),
    mines: state.mines ? [...state.mines] : null,
  };
}
export function validate(s) {
  if (
    !s ||
    s.game !== "minesweeper" ||
    s.version !== 1 ||
    !Object.hasOwn(LEVELS, s.difficulty) ||
    !Number.isInteger(s.seed) ||
    s.seed < 1 ||
    s.seed > 2147483647 ||
    typeof s.questions !== "boolean" ||
    !Number.isSafeInteger(s.elapsedMs) ||
    s.elapsedMs < 0 ||
    !["ready", "playing", "won", "lost"].includes(s.status)
  )
    return false;
  const { width, height, mines } = LEVELS[s.difficulty],
    size = width * height;
  if (
    !Array.isArray(s.revealed) ||
    s.revealed.length !== size ||
    s.revealed.some((v) => typeof v !== "boolean") ||
    !Array.isArray(s.marks) ||
    s.marks.length !== size ||
    s.marks.some(
      (m, i) =>
        ![0, 1, 2].includes(m) ||
        (!s.questions && m === 2) ||
        (s.revealed[i] && m !== 0),
    )
  )
    return false;
  if (
    s.mines !== null &&
    (!Array.isArray(s.mines) ||
      s.mines.length !== mines ||
      s.mines.some(
        (m, i) =>
          !Number.isInteger(m) ||
          m < 0 ||
          m >= size ||
          (i > 0 && m <= s.mines[i - 1]),
      ))
  )
    return false;
  if (s.status === "ready")
    return (
      s.exploded === null && s.elapsedMs === 0 && s.revealed.every((v) => !v)
    );
  if (!s.mines) return false;
  const exposedMines = s.mines.filter((i) => s.revealed[i]);
  const safe = s.revealed.filter((v, i) => v && !s.mines.includes(i)).length;
  if (s.status === "lost")
    return exposedMines.length === 1 && exposedMines[0] === s.exploded;
  if (s.exploded !== null || exposedMines.length) return false;
  return s.status === "won"
    ? safe === size - mines
    : safe > 0 && safe < size - mines;
}
