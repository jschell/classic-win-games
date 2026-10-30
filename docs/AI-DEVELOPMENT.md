# AI-assisted game development

Inspired by Simon Willison's October 2026 game-development writeups: ship a playable slice, critique whether it is enjoyable, and test the real experience.

For each game: (1) research and specify traditional rules; (2) implement a complete playable loop; (3) run deterministic rule tests and browser tests; (4) identify the five largest interaction frustrations; (5) verify offline desktop and mobile behavior.

Do not change traditional rules to make a game seem more fun. Use HTML/CSS and vanilla JavaScript for 2D cards; Three.js is not required. Avoid Microsoft-owned art assets.

## Implemented games and remaining acceptance work

All four games have playable, tested loops: [Klondike](mobile-verification.md),
[FreeCell](freecell.md), [Spider in one/two/four suits](spider.md), and
[Hearts against three computer players](hearts.md). Hint evaluation is described
[in its report](hints.md). The shared PWA includes icons, offline asset caching,
update/reload handling and automated Chromium/WebKit checks.

Remaining work is physical iPhone Safari and standalone-install verification,
native panning, keyboard/assistive-technology review, stronger Hearts strategy,
and ongoing regression maintenance. Undo is session-only; saved boards and
scores survive refresh. Optional enhancements include persisted Undo and
Klondike auto-foundation/stock-rule variants. These are follow-up work, not
additional games or changes to the documented traditional rules.
