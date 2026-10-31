# Classic Win Games

Offline-first, desktop- and mobile-friendly recreations of four classic Windows card games: Klondike, FreeCell, Spider, and Hearts.

Built with vanilla JavaScript, HTML, and CSS. No backend or runtime CDN.

## Roadmap

1. Klondike (Draw 1 and Draw 3) — implemented
2. FreeCell — implemented
3. Spider Solitaire (one, two and four suits) — implemented
4. Hearts with local computer opponents — implemented

The games use original browser-rendered cards rather than Microsoft artwork.

## Development and verification

Use Node.js 22+: `npm ci`, then `npm test` for deterministic rules, saved-state
validation, and worker lifecycle checks. After changing any offline shell asset,
  run `npm run build:sw` and commit the regenerated `sw.js`; tests reject stale hashes.

Run `npm run format` after editing source JavaScript and `npm run format:check`
to check it. Prettier is a pinned development dependency; the app still has no
runtime dependencies.

For browser verification, run `npx playwright install --with-deps chromium webkit`
and `npm run test:browser`. CI runs both engines and retains the HTML report,
viewport screenshots and failure traces in the `browser-evidence` artifact.
Tests cover five viewport sizes, touch gameplay and offline/updated deployments.
See [the engineering report](docs/mobile-verification.md) for findings and limits.

## Games

- **Klondike:** Draw 1/3, hints, Undo and saved games. Changing Draw asks to
  start a new deal; cancelling keeps the current deal and its Undo history.
- **FreeCell:** eight face-up columns, four cells, capacity-limited sequence moves,
  numbered deals, Restart, hints, Undo and its own saved game. Open `/#freecell`.
  Numbers use our own shuffle and do not match Windows deals. See [rules and
  verification](docs/freecell.md).

- **Spider:** one, two or four suits, ten columns, five stock rows, automatic run removal,
  numbered replay, Restart, Undo and independent saves for each suit mode. Open `/#spider`.
  Choose Fit columns or Larger cards (horizontal scrolling). See [rules and
  verification](docs/spider.md).

- **Hearts:** play against three computer opponents, with passing, legal-card
  selection, visible trick review, moon scoring, matches to 100, Undo and saved
  matches. Open `/#hearts`. See [rules and verification](docs/hearts.md).

All four games work offline after the app shell has cached.

## Windows executable

A Tauri wrapper builds the shared game into a Windows x64 executable. Run
`npm run build:windows` on Windows with the documented prerequisites. The
Windows workflow tests the packaged app and produces an executable, optional
ZIP and checksums. Version tags create draft releases; normal merges continue
deploying only the web/PWA edition. See [Windows instructions](docs/windows.md)
for WebView2 requirements, save locations, release procedure and remaining
manual verification. The executable does not bundle the full WebView2 runtime.

Desktop users can drag cards and sequences to a destination. Klondike and
FreeCell also support double-clicking an exposed top card to send it to a legal
foundation. Tap-to-select/tap-to-place remains available on phones and desktop.
**Finish game** enables only when foundation moves alone can complete a
Klondike or FreeCell deal. The entire finish is one Undo action.

Undo keeps the last 100 actions per saved game, including across refreshes and
game switches; starting or restarting a deal clears that game's history.
Existing saved boards remain compatible. Hints are bounded local nudges,
searching up to three moves; they do not solve deals or guarantee a winning
line. See [hint limits](docs/hints.md).
