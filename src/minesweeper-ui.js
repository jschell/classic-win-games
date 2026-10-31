import * as mines from "./minesweeper.js";

export function createMinesweeperView({ root, onCommit, onTimerSave }) {
  let state,
    active = false,
    startedAt = null,
    interval,
    flagMode = false;
  let focusIndex = 0,
    held = new Set(),
    chordIndex = null,
    suppressClick = false;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const liveTime = () =>
    state.elapsedMs +
    (startedAt === null ? 0 : Math.max(0, Date.now() - startedAt));
  const snapshot = () => ({ ...state, elapsedMs: Math.floor(liveTime()) });
  function act(next) {
    if (!next) return;
    // New/replayed games pass through reset(), so only ongoing actions accrue time.
    onCommit({ ...next, elapsedMs: Math.floor(liveTime()) });
  }
  function stop() {
    active = false;
    clearInterval(interval);
    interval = undefined;
    startedAt = null;
    held.clear();
    chordIndex = null;
    suppressClick = false;
  }
  function reset(next) {
    focusIndex = 0;
    flagMode = false;
    onCommit(next);
  }
  function newBoard(difficulty = state.difficulty) {
    if (state.status === "playing" && !confirm("Start a new minefield?"))
      return false;
    reset(mines.newGame(undefined, difficulty, state.questions));
    return true;
  }
  document.addEventListener("visibilitychange", () => {
    if (!active) return;
    state = snapshot();
    startedAt =
      state.status === "playing" && !document.hidden ? Date.now() : null;
    if (state.status === "playing")
      root.querySelector("#mine-status").textContent = document.hidden
        ? "Paused while hidden."
        : "Reveal every safe square to win.";
    onTimerSave();
  });
  window.addEventListener("blur", () => {
    held.clear();
    chordIndex = null;
    suppressClick = false;
  });
  window.addEventListener("keydown", (event) => {
    if (active && event.key === "F2") {
      event.preventDefault();
      newBoard();
    }
  });
  window.addEventListener("pointerup", (event) => {
    held.delete(event.button);
    if (!root.contains(event.target)) {
      chordIndex = null;
      suppressClick = false;
    }
  });
  function render(next) {
    stop();
    state = next;
    active = true;
    if (state.status === "playing" && !document.hidden) startedAt = Date.now();
    const scroll = root.querySelector(".mine-scroll"),
      scrollLeft = scroll?.scrollLeft || 0,
      scrollTop = scroll?.scrollTop || 0;
    const focusedControl = root.contains(document.activeElement)
      ? document.activeElement.id
      : "";
    const focused = root.contains(document.activeElement)
      ? document.activeElement.dataset.cell
      : undefined;
    root.replaceChildren();
    const controls = el("div", undefined, "toolbar");
    const label = el("label", "Difficulty "),
      select = el("select");
    select.id = "mine-difficulty";
    for (const [id, level] of Object.entries(mines.LEVELS)) {
      const option = el(
        "option",
        `${id[0].toUpperCase() + id.slice(1)} · ${level.width}×${level.height} · ${level.mines} mines`,
      );
      option.value = id;
      select.append(option);
    }
    select.value = state.difficulty;
    select.onchange = () => {
      if (!newBoard(select.value)) select.value = state.difficulty;
    };
    label.append(select);
    controls.append(label);
    const fresh = el("button", "New minefield");
    fresh.id = "mine-new";
    fresh.onclick = () => newBoard();
    controls.append(fresh);
    const replay = el("button", "Replay minefield");
    replay.id = "mine-replay";
    replay.disabled = !state.mines;
    replay.onclick = () => {
      if (confirm("Replay the same mines? The first reveal can lose."))
        reset(mines.restart(state));
    };
    controls.append(replay);
    const mode = el("button", flagMode ? "Flag mode: on" : "Flag mode: off");
    mode.id = "mine-flag-mode";
    mode.setAttribute("aria-pressed", String(flagMode));
    mode.onclick = () => {
      flagMode = !flagMode;
      render(snapshot());
    };
    controls.append(mode);
    const questions = el("label"),
      check = el("input");
    check.type = "checkbox";
    check.id = "mine-questions";
    check.checked = state.questions;
    check.onchange = () => act(mines.setQuestions(state, check.checked));
    questions.append(check, " Question marks");
    controls.append(questions);
    root.append(controls);
    const counters = el("p", undefined, "mine-counters");
    const remaining =
      mines.LEVELS[state.difficulty].mines -
      state.marks.filter((m) => m === 1).length;
    counters.append(el("span", `Mines remaining: ${remaining}`));
    const timer = el("span");
    timer.id = "mine-time";
    const tick = () => {
      timer.textContent = `Time: ${Math.floor(liveTime() / 1000)} s`;
    };
    tick();
    interval = setInterval(tick, 1000);
    counters.append(timer);
    root.append(counters);
    const status = el(
      "p",
      state.status === "won"
        ? "You won!"
        : state.status === "lost"
          ? "Mine hit. Game over."
          : state.status === "ready"
            ? state.mines
              ? "Same minefield: the first reveal can lose."
              : "Reveal a square to start. The opening will be clear."
            : document.hidden
              ? "Paused while hidden."
              : "Reveal every safe square to win.",
    );
    status.id = "mine-status";
    status.setAttribute("role", "status");
    root.append(status);
    const { width, height } = mines.LEVELS[state.difficulty],
      values = mines.clues(state);
    const area = el("div", undefined, "mine-scroll");
    area.tabIndex = 0;
    area.setAttribute("role", "region");
    area.setAttribute("aria-label", "Minefield scrolling area");
    const grid = el("div", undefined, "mine-grid");
    grid.style.setProperty("--mine-columns", String(width));
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", `${width} by ${height} minefield`);
    for (let i = 0; i < values.length; i++) {
      const ended = ["won", "lost"].includes(state.status),
        open = state.revealed[i];
      const visibleMine = ended && values[i] === -1;
      const wrong =
        state.status === "lost" && state.marks[i] === 1 && values[i] !== -1;
      const text = wrong
        ? "×"
        : visibleMine
          ? state.status === "won"
            ? "⚑"
            : "✹"
          : open
            ? values[i] || ""
            : ["", "⚑", "?"][state.marks[i]];
      const button = el("button", String(text), "mine-cell");
      button.dataset.cell = String(i);
      button.tabIndex = i === focusIndex ? 0 : -1;
      button.classList.toggle("open", open);
      button.classList.toggle("exploded", i === state.exploded);
      button.classList.toggle("wrong", wrong);
      button.dataset.clue = open && values[i] > 0 ? String(values[i]) : "";
      const description = wrong
        ? "incorrect flag"
        : visibleMine
          ? "mine"
          : open
            ? `${values[i]} adjacent mines`
            : ["covered", "flagged", "question mark"][state.marks[i]];
      button.setAttribute(
        "aria-label",
        `Row ${Math.floor(i / width) + 1}, column ${(i % width) + 1}: ${description}`,
      );
      button.setAttribute("aria-disabled", String(ended));
      button.onfocus = () => {
        grid.querySelector('[tabindex="0"]')?.setAttribute("tabindex", "-1");
        focusIndex = i;
        button.tabIndex = 0;
      };
      button.onclick = () => {
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        act(
          flagMode
            ? mines.mark(state, i)
            : open
              ? mines.chord(state, i)
              : mines.reveal(state, i),
        );
      };
      button.oncontextmenu = (event) => {
        event.preventDefault();
        act(mines.mark(state, i));
      };
      button.onpointerdown = (event) => {
        if (event.pointerType !== "mouse") return;
        if (!held.size) suppressClick = false;
        held.add(event.button);
        if (event.button === 1 || (held.has(0) && held.has(2))) {
          event.preventDefault();
          chordIndex = i;
          suppressClick = true;
        }
      };
      button.onpointerup = (event) => {
        held.delete(event.button);
        if (chordIndex !== null) {
          const target = chordIndex;
          chordIndex = null;
          if (target === i) act(mines.chord(state, target));
        }
      };
      button.onpointercancel = () => {
        held.clear();
        chordIndex = null;
        suppressClick = false;
      };
      button.onkeydown = (event) => {
        if (event.shiftKey && ["Enter", " "].includes(event.key)) {
          event.preventDefault();
          act(mines.chord(state, i));
          return;
        }
        const offsets = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -width,
          ArrowDown: width,
        };
        if (Object.hasOwn(offsets, event.key)) {
          event.preventDefault();
          const target = i + offsets[event.key];
          if (
            target >= 0 &&
            target < width * height &&
            (!(event.key === "ArrowLeft" || event.key === "ArrowRight") ||
              Math.floor(target / width) === Math.floor(i / width))
          )
            grid.querySelector(`[data-cell="${target}"]`).focus();
        } else if (event.key.toLowerCase() === "f") {
          event.preventDefault();
          act(mines.mark(state, i));
        } else if (event.key.toLowerCase() === "c") {
          event.preventDefault();
          act(mines.chord(state, i));
        }
      };
      grid.append(button);
    }
    area.append(grid);
    root.append(area);
    area.scrollLeft = scrollLeft;
    area.scrollTop = scrollTop;
    if (focused !== undefined)
      grid
        .querySelector(`[data-cell="${focusIndex}"]`)
        ?.focus({ preventScroll: true });
    else if (focusedControl)
      root.querySelector(`#${focusedControl}`)?.focus({ preventScroll: true });
  }
  return { render, snapshot, stop };
}
