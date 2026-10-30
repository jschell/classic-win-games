# Gameplay review follow-up

The supplied review examined `ad4afb2`. This follow-up starts from `28d090e`,
which also includes Hearts and updated four-game/Spider-mode documentation.

| Finding | Result |
| --- | --- |
| Draw can change within the same deal | A confirmed change starts a fresh deal and clears Undo; cancellation restores the selector and retains play. |
| Hints do not guide deals to a win | The interface explicitly describes local nudges and the three-move limit. The algorithm is unchanged; winning-plan search remains separate work. |
| Desktop interaction gaps | Native drag/drop uses the existing move engines. Double-click sends an exposed top card home in Klondike/FreeCell. Finish requires no covered cards or remaining stock and a complete foundation-only winning path; one Undo restores the pre-finish board. |
| Unbounded, session-only Undo | Last 100 actions persist per game and Spider suit mode. History is validated and tied to the exact current saved board, seed and rule mode. Existing board keys remain compatible. |
| Dense source and unexplained weights | Source JavaScript is formatted with pinned Prettier; format/check scripts and CI checking are added. Hint priorities have named weights and a rationale. |
| README drift | Four-game and suit-mode descriptions were already corrected upstream. Current control and persistence documentation is updated here. |
| Empty-column errors with no selection | Empty columns clear selection quietly. Illegal attempted moves still report errors. |

No native wrapper is included. A Tauri wrapper still needs its own packaging,
service-worker gating, storage/export decisions and Windows verification.

## Validation

- All 69 Node tests passed locally, including bounded/persisted Undo, corrupt
  history rejection, board-save fallback and foundation-only finishing.
- Source formatting, generated worker hash and whitespace checks passed.
- Playwright discovers 150 Chromium/WebKit tests, including desktop shortcuts,
  empty-column taps, Finish/Undo, Draw confirmation and persisted Undo checks.
  Browser validation is **pending**: Chromium downloads returned invalid archives.
  WebKit downloaded, but launch was blocked by missing system libraries and its
  GTK dependency download was truncated. No browser assertion ran successfully.
  Run the existing two-engine CI suite before merge; desktop drag/drop and
  double-click remain unverified until then.
