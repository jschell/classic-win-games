export const HISTORY_LIMIT = 100;

export function appendHistory(history, state) {
  return [...history, state].slice(-HISTORY_LIMIT);
}

// Keep the existing board key compatible. Writing history first means an
// interrupted save cannot attach an old Undo chain to a newly saved board.
export function saveGame(storage, key, state, history) {
  const current = JSON.stringify(state);
  let historyError;
  try {
    storage.setItem(
      `${key}-undo`,
      JSON.stringify({ current, states: history.slice(-HISTORY_LIMIT) }),
    );
  } catch (error) {
    historyError = error;
  }
  // Even if Undo exceeds the browser's quota, try to retain the current board.
  storage.setItem(key, current);
  if (historyError) throw historyError;
}

export function loadHistory(storage, key, state, validate) {
  try {
    const saved = JSON.parse(storage.getItem(`${key}-undo`));
    if (
      saved?.current !== JSON.stringify(state) ||
      !Array.isArray(saved.states) ||
      saved.states.length > HISTORY_LIMIT
    )
      return [];
    return saved.states.every(
      (previous) =>
        validate(previous) &&
        previous.seed === state.seed &&
        previous.draw === state.draw &&
        previous.suits === state.suits,
    )
      ? saved.states
      : [];
  } catch {
    return [];
  }
}
