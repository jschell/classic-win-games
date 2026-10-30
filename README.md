# Classic Win Games

Offline-first, desktop- and mobile-friendly recreations of four classic Windows card games: Klondike, FreeCell, Spider, and Hearts.

Built with vanilla JavaScript, HTML, and CSS. No backend or runtime CDN.

## Roadmap

1. Klondike (Draw 1 and Draw 3) — implemented
2. FreeCell — implemented
3. Spider Solitaire — planned
4. Hearts with local computer opponents — planned

The games use original browser-rendered cards rather than Microsoft artwork.

## Development and verification

Use Node.js 22+: `npm ci`, then `npm test` for deterministic rules, saved-state
validation, and worker lifecycle checks. After changing any offline shell asset,
run `npm run build:sw` and commit the regenerated `sw.js`; tests reject stale hashes.

For browser verification, run `npx playwright install --with-deps chromium webkit`
and `npm run test:browser`. CI runs both engines and retains the HTML report,
viewport screenshots and failure traces in the `browser-evidence` artifact.
Tests cover five viewport sizes, touch gameplay and offline/updated deployments.
See [the engineering report](docs/mobile-verification.md) for findings and limits.

## Games

- **Klondike:** Draw 1/3, hints, Undo and saved games.
- **FreeCell:** eight face-up columns, four cells, capacity-limited sequence moves,
  numbered deals, Restart, hints, Undo and its own saved game. Open `/#freecell`.
  Numbers use our own shuffle and do not match Windows deals. See [rules and
  verification](docs/freecell.md).

Both games work offline after the app shell has cached. Spider and Hearts are
still planned.
