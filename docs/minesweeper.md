# Minesweeper mechanics and verification

Target: the ordinary Windows 7 game, with documented adaptations for browsers,
touch and accessibility. Complete VM comparison is follow-up evidence, not a
prerequisite for implementing the supported mechanics. This is an original
implementation, not a pixel-identical or binary-compatible Microsoft port.

## Evidence and decisions

| Mechanic | Evidence / confidence | Implementation |
| --- | --- | --- |
| Eight neighboring cells, numbered clues, automatic empty-area opening | Microsoft KB Q66352; original publisher documentation, earlier Windows version | Derived clues, iterative flood reveal; no row wrapping |
| Intermediate 16×16 / 40, Expert 30×16 / 99 | Microsoft KB Q66352; preset sizes documented | Those sizes/counts |
| Beginner 9×9 / 10 | Reported later-Windows preset; KB's earlier 8×8 is explicitly a different version | 9×9 / 10; direct Windows 7 options-dialog comparison remains open |
| Fresh first click is safe and opens an empty region | Version-specific Windows Vista/7 reports, including original-game observations on Arqade | Defer placement and exclude clicked cell plus its neighbors; no guaranteed-solvable/no-guess board generation |
| Replay keeps the same mine positions; first click can lose | Arqade first-hand account reproduces the original game's warning | Preserve exact mine array, clear progress and clock, warn before replay |
| Right-click flag/question/clear; matching flags allow neighboring reveal | Documented historical controls; exact Windows 7 question-mark default still unverified | Optional question marks (initially on); simultaneous left+right and middle mouse chord; wrong flags can lose |
| Reveal every non-mine square to win | Core Minesweeper objective, also documented in Simon Tatham's primary manual | Flags not required; finish auto-marks remaining mines |
| Win/loss is terminal | Core game behavior | Further reveals/marks/chords have no effect |
| Timer starts on first reveal | Conventional behavior; exact Windows 7 rounding/cap/pause behavior not fully verified | Integer displayed seconds; marks alone do not start it; save elapsed time, pause while page hidden or app closed |
| New game, statistics/options/appearance keyboard menu commands | Period screenshots and resource listing in AskVG (2011) | F2 starts new field; statistics, appearance and custom sizes deferred |

Sources:

- [Microsoft KB Q66352, preserved by PCjs](https://jeffpar.github.io/kbarchive/kb/066/Q66352/)
- [Arqade first-click experiments and Windows 7 replay warning](https://gaming.stackexchange.com/questions/315335/is-it-possible-to-hit-a-mine-on-first-click/315396)
- [Arqade XP versus Windows 7 first-opening comparison](https://gaming.stackexchange.com/questions/11885/what-are-the-differences-between-minesweeper-for-windows-xp-and-for-windows-7)
- [AskVG's 2011 original menus, screenshots and resource listing](https://www.askvg.com/enable-hidden-secret-debug-menu-in-microsoft-minesweeper-game-in-windows-7/)
- [Simon Tatham's Mines manual](https://www.chiark.greenend.org.uk/~sgtatham/puzzles/doc/mines.html): precise basic mechanics; its documented Undo and guaranteed-solvable defaults are different features and are not adopted here.
- [Historical Microsoft Windows 7 help URL](http://windows.microsoft.com/en-us/windows/minesweeper-how-to#1TC=windows-7): located, but current/archived content could not be retrieved in this session.

Treat period articles, forum reports and other implementations as supporting
sources. They do not replace direct observation for unresolved version details.
The engine's reproducible seed is our testing tool, not Microsoft's board ID.

## Controls and browser adaptations

Open `/#minesweeper`. Mouse: reveal with left click, cycle marks with right click,
and chord an open number with simultaneous left+right or the middle button.
Clicking/tapping an open number is an additional shortcut with the same rule.
On touch use the visible Flag mode toggle; ordinary taps then cycle marks.
There is no long-press gesture to interfere with scrolling.

Keyboard: arrow keys move between cells; Enter/Space activate; F cycles a mark;
C or Shift+Enter/Space chords; F2 starts a new minefield. F and C are explicit
accessibility shortcuts. The exact full Windows 7 keyboard map remains a
follow-up comparison. Large boards scroll inside the board, with 44px cells on
coarse pointers and 32px cells on desktop. Native card-game controls are hidden.

New field/difficulty changes ask before discarding an active game. Replay always
warns about keeping mines and losing on its first reveal. Difficulty and the
question-mark setting travel with the saved board. Flag mode resets when the
app reloads; its visible toggle always shows the current input mode.

The canonical save is `classic-win-minesweeper-v1`, independent of all card-game
saves. Loading validates preset, seed, exact mine count, distinct in-bounds mine
positions, array sizes, marks, revealed cells, clock and terminal conditions.
Clues are recomputed, so corrupt saved clue numbers cannot alter the rules.
No Undo or hints are offered. Statistics, custom dimensions, sound and original
artwork are outside this initial implementation.

## Historical XYZZY sequence

The [Jargon File's XYZZY entry](https://www.catb.org/esr/jargon/html/X/xyzzy.html)
documents the early Windows Easter egg as `xyzzy`, Enter, right Shift. A pixel at
the top left of the screen indicates whether the pointer is over a mine. The
entry notes that availability differed between Windows versions. Other period
guides give different Enter/Shift sequences. This is historical documentation,
not evidence that the Windows 7 game supported the same shortcut. It is not
part of the current Windows 7 mechanics baseline and is not implemented here.

## Verification

Node tests cover all preset sizes at corner/edge/center openings, seeded
reproducibility, immutable inputs, all eight neighbors, flood reveal, flags and
question marks, correct and incorrect chords, winning without manual flags,
terminal behavior, replay first-click loss, malformed saves and mixed actions
across many seeds. Browser checks cover five viewports, mouse, touch, keyboard,
contained scrolling, game switching, reload and offline recovery. The Windows
native smoke test exercises opening/flagging and restores Minesweeper's mines,
revealed cells, marks and elapsed time after closing and restarting the process.

Remaining comparisons: original Windows 7 question-mark defaults, full keyboard
semantics, custom-board limits, timer rounding/cap/minimize behavior, detailed
loss/win presentation and replay statistics. These are recorded uncertainties,
not claims of completed VM verification.
