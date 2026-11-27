import { label } from "./cards.js";
// Win celebration: finished cards leave their piles one at a time, fall under
// gravity, bounce along the bottom of the window and paint a trail because the
// canvas is never cleared. Purely decorative: the status text announces the win.

const GRAVITY = 0.5,
  RESTITUTION = 0.72,
  FRAME_MS = 1000 / 60,
  LINGER_MS = 4000;

// Highest remaining card of each pile in turn: every King, then every Queen...
export function launchOrder(piles) {
  const stacks = piles.map((p) => [...p].sort((a, b) => a.rank - b.rank));
  const order = [];
  for (let left = true; left; ) {
    left = false;
    stacks.forEach((stack, pile) => {
      const card = stack.pop();
      if (!card) return;
      order.push({ card, pile });
      left = true;
    });
  }
  return order;
}

// Velocities are CSS pixels per 60 Hz frame, scaled so narrow phones and wide
// desktops both take a second or two for each card to cross the screen.
export function launch(origin, width, random = Math.random) {
  const speed = Math.max(0.6, Math.min(1.6, width / 900));
  return {
    ...origin,
    vx: (random() < 0.5 ? -1 : 1) * (2.5 + random() * 4.5) * speed,
    vy: -random() * 9 * speed,
  };
}

// Advance one frame. The bottom edge bounces; leaving either side finishes.
export function step(p, width, height) {
  const n = { ...p, vy: p.vy + GRAVITY, x: p.x + p.vx };
  n.y = p.y + n.vy;
  if (n.y + n.h > height) {
    n.y = height - n.h;
    n.vy = -n.vy * RESTITUTION;
  }
  n.done = n.x + n.w < 0 || n.x > width;
  return n;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Same face as the board: white card, grey edge, corner index and suit colour.
function drawCard(ctx, { x, y, w, h, card }) {
  roundRect(ctx, x, y, w, h, Math.min(6, w / 8));
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.strokeStyle = "#c9d0ce";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = card.red ? "#b62332" : "#171e24";
  const corner = Math.max(10, Math.min(22, w * 0.28));
  ctx.font = `700 ${corner}px system-ui, sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText(label(card) + card.suit, x + 4, y + 4);
  ctx.font = `${Math.max(14, w * 0.5)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(card.suit, x + w / 2, y + h * 0.58);
}

// origins: one {x, y, w, h} per pile (viewport coordinates); piles: the cards
// in each. Returns stop(), which is safe to call more than once.
export function celebrate({ origins, piles, onDone }) {
  if (
    !origins.length ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    onDone?.();
    return () => {};
  }
  const canvas = document.createElement("canvas");
  canvas.className = "celebration";
  canvas.setAttribute("aria-hidden", "true");
  const width = innerWidth,
    height = innerHeight,
    ratio = devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.scale(ratio, ratio);
  document.body.append(canvas);

  const queue = launchOrder(piles);
  let current = null,
    raf = 0,
    linger = 0,
    last = performance.now(),
    stopped = false;
  function next() {
    const item = queue.shift();
    current = item && {
      ...launch(origins[item.pile], width),
      card: item.card,
    };
  }
  function frame(now) {
    // Hold a constant speed on 120 Hz screens; skip, not race, after a stall.
    let frames = Math.min(4, Math.round((now - last) / FRAME_MS));
    if (frames > 0) last = now;
    while (frames-- > 0 && current) {
      current = step(current, width, height);
      drawCard(ctx, current);
      if (current.done) next();
    }
    if (current) raf = requestAnimationFrame(frame);
    else linger = setTimeout(stop, LINGER_MS);
  }
  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    clearTimeout(linger);
    canvas.remove();
    removeEventListener("keydown", dismiss, true);
    removeEventListener("pointerdown", dismiss, true);
    removeEventListener("resize", dismiss);
    onDone?.();
  }
  // The canvas ignores input, so any tap, click or key both dismisses it and
  // still reaches its target: one tap on Undo or New deal works as usual.
  // Events stamped before the start (the input that won) never dismiss it.
  const started = performance.now();
  function dismiss(e) {
    if (e.type === "resize" || e.timeStamp >= started) stop();
  }
  addEventListener("keydown", dismiss, true);
  addEventListener("pointerdown", dismiss, true);
  addEventListener("resize", dismiss);
  raf = requestAnimationFrame((now) => {
    last = now;
    next();
    raf = requestAnimationFrame(frame);
  });
  return stop;
}
