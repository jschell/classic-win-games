# Spider Solitaire — one suit

Open `/#spider` under the project's Pages path or choose Spider in navigation.
The first version offers one-suit Spider only. All 104 cards have distinct IDs,
including eight copies of each spade rank. A seed reproduces the same deal using
our own shuffle; numbers do not match Windows and solvability is not guaranteed.

## Rules

- Ten columns receive 54 cards: six in the first four, five in the remaining six.
  Only the last card in each starts face up; 50 cards remain in stock.
- Build columns down by rank. An exposed descending same-suit sequence moves
  together with no FreeCell-style capacity limit. Any card or valid sequence
  may fill an empty column. Suit checks are explicit for later difficulty modes.
- Stock deals one face-up card onto each column, in order, for five rows. Every
  column must contain a card before a row can be dealt. No unrestricted-deal rule.
- A complete same-suit King-to-Ace run is removed automatically. Exposed covered
  cards flip face up, including after removal; newly exposed full runs also clear.
  All eight completed runs win. Completed runs are display-only.
- Undo reverses an entire action, including a stock row, run removal and reveals.
  History is session-only and resets when refreshing or switching games. Each
  game's current board persists independently.
- Restart and numbered replay use the same deterministic seed. Hints suggest
  a legal local move (preferring reveals), or a stock deal; they are not a solver.

Rule references checked October 30, 2026:
[MobilityWare rules](https://mobilityware.helpshift.com/hc/en/11-spider/faq/586-how-do-i-play-spider-solitaire/)
and [Arkadium rules](https://support.arkadium.com/en/support/solutions/articles/44001813711--spider-solitaire-how-to-play-tips-settings-scoring).
Artwork is original; no Microsoft code or assets are included.

## Mobile presentation

Ten 44px cards cannot all fit across a 375px viewport. Spider has two explicit
views, remembered independently of game state:

- **Fit columns:** shows all ten columns; phone cards are narrower than 44px,
  while exposed face-up strips remain 44px high and corner ranks/suits stay visible.
- **Larger cards:** minimum 52px-wide cards in a horizontally scrollable board
  on phones. Selection remains active while scrolling to a destination. The page
  itself does not overflow horizontally. Long columns grow vertically with the page.

Both views reuse the shared natural-height card grid. Stock and completed-run
markers remain above the scrolling columns. Covered strips/counts stay distinct.

## Implementation and verification

`src/spider.js` provides immutable rules, seed handling, local hints and strict
104-card save validation. `src/board.js` reuses card rendering and adds completed
run markers. `src/app.js` routes `#spider`, keeps independent saves, and reuses
New deal, Restart, Undo and numbered replay. The existing content-versioned worker
precaches the Spider module and supports fragment navigation offline.

`npm test` runs rule/worker checks; `npm run test:browser` runs Chromium and WebKit.
Spider tests cover initial 54/50 deals, duplicate ranks with unique IDs, legal and
illegal sequences, reveals, stock row order/exhaustion/empty-column blocking,
completed runs and cascades, eighth-run win/Undo, corrupt saves, hints, seed replay,
state isolation, both card views, horizontal selection and offline reconnection.
Initial and long columns are exercised at 375×667, 390×844, 430×932, 768×1024 and
1440×900. Existing Klondike, FreeCell and worker-update tests remain in the suite.

Browser results and screenshot review will be recorded after CI. Native iPhone
Safari, standalone installation and real touch scrolling remain device checks;
Linux WebKit results do not establish physical-device behavior. Two/four-suit UI,
a solver, a timer and additional scoring are outside this version.
