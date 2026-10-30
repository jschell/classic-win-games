# Classic Win Games

Offline-first, desktop- and mobile-friendly recreations of four classic Windows card games: Klondike, FreeCell, Spider, and Hearts.

Built with vanilla JavaScript, HTML, and CSS. No backend or runtime CDN.

## Development

Serve the repository root with a local static HTTP server. Run tests with `node --test`.

## Roadmap

1. Klondike (Draw 1 and Draw 3)
2. FreeCell
3. Spider Solitaire
4. Hearts with local computer opponents

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
