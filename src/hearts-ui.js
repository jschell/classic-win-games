import * as hearts from "./hearts.js";
import { card as cardElement } from "./board.js";
import { deck, label } from "./cards.js";
const textCard = (c) => label(c) + c.suit;
function element(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
export function createHeartsView({ root, onCommit, onMessage }) {
  let state,
    selected = new Set();
  function hint() {
    if (state.phase === "pass") {
      selected = new Set(hearts.choosePass(hearts.playerView(state, 0)));
      onMessage(
        "Suggested pass: shed high spades and high hearts. Review the three highlighted cards before passing.",
      );
    } else if (state.phase === "play" && state.turn === 0) {
      const id = hearts.chooseCard(hearts.playerView(state, 0));
      selected = new Set(id === null ? [] : [id]);
      onMessage(
        id === null
          ? "No card available."
          : `Suggested ${textCard(state.hands[0].find((c) => c.id === id))}. Follow suit, avoid penalties, and shed a high card when safe. Review before playing.`,
      );
    } else
      onMessage(
        state.phase === "trick"
          ? "Review the completed trick, then collect it."
          : state.phase === "handOver"
            ? "Review the scores, then start the next hand."
            : "The match is complete. Start a new game to play again.",
      );
  }
  function render(s, message = "") {
    if (s !== state) selected = new Set();
    state = s;
    root.replaceChildren();
    const over = ["handOver", "gameOver"].includes(s.phase),
      raw = hearts.handPoints(s),
      points = over ? s.rounds.at(-1).points : raw;
    const summary = element("p", "", "hearts-summary");
    summary.id = "hearts-summary";
    summary.setAttribute("role", "status");
    summary.setAttribute("aria-live", "polite");
    if (s.phase === "pass")
      summary.textContent = `Pass three cards ${hearts.passName(s)}. Selected ${selected.size}/3.`;
    else if (s.phase === "play")
      summary.textContent = `Your turn · ${s.trick.length ? "Follow " + s.trick[0].card.suit + " if possible." : "Lead a card."} ${s.broken ? "Hearts are broken." : "Hearts are not broken."}`;
    else if (s.phase === "trick")
      summary.textContent = `${hearts.NAMES[hearts.trickWinner(s.trick)]} won this trick · ${s.trick.reduce((n, e) => n + hearts.penalty(e.card), 0)} penalty points. Review, then collect.`;
    else if (s.phase === "handOver")
      summary.textContent = "Hand complete. Review the scores, then continue.";
    else
      summary.textContent = `Match complete. ${hearts.winners(s).length > 1 ? "Joint winners" : "Winner"}: ${hearts
        .winners(s)
        .map((i) => hearts.NAMES[i])
        .join(" and ")}. Lowest score wins.`;
    root.append(summary);
    const table = element("table", undefined, "hearts-scores");
    table.setAttribute("aria-label", "Hearts scores");
    const head = element("tr");
    for (const name of ["Player", "Cards", "Hand", "Total"]) {
      const th = element("th", name);
      th.scope = "col";
      head.append(th);
    }
    const thead = element("thead");
    thead.append(head);
    table.append(thead);
    const body = element("tbody");
    for (let i = 0; i < 4; i++) {
      const row = element("tr");
      row.dataset.player = String(i);
      const th = element("th", hearts.NAMES[i]);
      th.scope = "row";
      row.append(th);
      for (const n of [s.hands[i].length, points[i], s.scores[i]])
        row.append(element("td", String(n)));
      body.append(row);
    }
    table.append(body);
    root.append(table);
    if (over && s.rounds.at(-1).moon !== null)
      root.append(
        element(
          "p",
          `${hearts.NAMES[s.rounds.at(-1).moon]} shot the moon: 26 points to every other player.`,
        ),
      );
    if (s.sent.length) {
      const cards = deck();
      root.append(
        element(
          "p",
          `Passed: ${s.sent.map((id) => textCard(cards[id])).join(" ")} · Received: ${s.received.map((id) => textCard(cards[id])).join(" ")}`,
          "deal-note",
        ),
      );
    }
    if (s.phase !== "pass") {
      const trick = element("section", undefined, "hearts-trick");
      trick.setAttribute("aria-label", "Current trick");
      for (let i = 0; i < 4; i++) {
        const player = (s.leader + i) % 4,
          entry = s.trick.find((e) => e.player === player),
          slot = element("div");
        slot.append(element("span", hearts.NAMES[player], "pile-caption"));
        if (entry) {
          const c = cardElement(entry.card);
          c.disabled = true;
          slot.append(c);
        } else {
          const blank = element("div", "—", "hearts-trick-empty");
          blank.setAttribute(
            "aria-label",
            hearts.NAMES[player] + " has not played",
          );
          slot.append(blank);
        }
        trick.append(slot);
      }
      root.append(trick);
      const last = s.tricks.at(-1);
      if (last)
        root.append(
          element(
            "p",
            `Last trick: ${hearts.NAMES[last.winner]} took ${last.cards.map((e) => textCard(e.card)).join(" ")} (${last.cards.reduce((n, e) => n + hearts.penalty(e.card), 0)} points).`,
            "deal-note",
          ),
        );
    }
    if (!over) {
      const hand = element("section", undefined, "hearts-hand");
      hand.id = "hearts-hand";
      hand.setAttribute("aria-label", "Your hand");
      const legal = new Set(hearts.legalCards(s, 0).map((c) => c.id));
      for (const c of s.hands[0]) {
        const el = cardElement(c);
        el.disabled = s.phase !== "pass" && !legal.has(c.id);
        el.setAttribute("aria-pressed", String(selected.has(c.id)));
        if (selected.has(c.id)) el.classList.add("selected");
        el.onclick = () => {
          if (selected.has(c.id)) selected.delete(c.id);
          else if (s.phase === "pass") {
            if (selected.size === 3) {
              onMessage(
                "Select exactly three cards. Tap a highlighted card to replace it.",
              );
              return;
            }
            selected.add(c.id);
          } else selected = new Set([c.id]);
          onMessage("");
        };
        hand.append(el);
      }
      root.append(element("h2", "Your hand"), hand);
    }
    const bar = element("div", undefined, "toolbar hearts-actions"),
      action = element("button");
    action.id = "hearts-action";
    action.type = "button";
    if (s.phase === "pass") {
      action.textContent = `Pass 3 ${hearts.passName(s)}`;
      action.disabled = selected.size !== 3;
      action.onclick = () => {
        if (state !== s || selected.size !== 3) return;
        const choices = s.hands.map((_, i) =>
          i === 0 ? [...selected] : hearts.choosePass(hearts.playerView(s, i)),
        );
        const n = hearts.passCards(s, choices);
        if (n) onCommit(hearts.advanceComputers(n));
      };
    } else if (s.phase === "play") {
      action.textContent = "Play selected card";
      action.disabled = selected.size !== 1 || s.turn !== 0;
      action.onclick = () => {
        if (state !== s) return;
        const n = hearts.play(s, 0, [...selected][0]);
        if (n) onCommit(hearts.advanceComputers(n));
      };
    } else if (s.phase === "trick") {
      action.textContent = "Collect trick";
      action.onclick = () => {
        if (state === s) {
          const n = hearts.collect(s);
          if (n) onCommit(hearts.advanceComputers(n));
        }
      };
    } else if (s.phase === "handOver") {
      action.textContent = "Next hand";
      action.onclick = () => {
        if (state === s) {
          const n = hearts.nextHand(s);
          if (n) onCommit(hearts.advanceComputers(n));
        }
      };
    } else {
      action.textContent = "Match finished";
      action.disabled = true;
    }
    bar.append(action);
    if (["pass", "play"].includes(s.phase)) {
      const clear = element("button", "Clear selection");
      clear.type = "button";
      clear.disabled = !selected.size;
      clear.onclick = () => {
        selected.clear();
        onMessage("");
      };
      bar.append(clear);
    }
    root.append(bar);
    if (s.rounds.length) {
      const details = element("details"),
        heading = element("summary", "Hand score history");
      details.append(heading);
      s.rounds.forEach((r, i) =>
        details.append(
          element(
            "p",
            `Hand ${i + 1}: ${r.points.map((n, p) => `${hearts.NAMES[p]} ${n}`).join(" · ")}${r.moon !== null ? " · Moon" : ""}`,
          ),
        ),
      );
      root.append(details);
    }
    return message;
  }
  return { render, hint };
}
