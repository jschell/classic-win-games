# Hint evaluation across all games

The prior Spider and FreeCell strategies selected the first legal move. Spider
could shuttle J–10–9–8–7 between two Queens without changing the position's
value, as reported in an iPhone screenshot. Klondike searched foundations only,
then displayed a generic instruction with no evaluation of tableau or stock.

All three engines now use `src/hints.js`:

| Strategy | Evidence of progress | Loop handling |
| --- | --- | --- |
| Spider | Complete a run, reveal cards, free a column, join separate sequences | Equivalent supports have equal value; stock is suggested if no improving move/setup is found |
| FreeCell | Build homes, increase temporary space, join alternating sequences | Cell storage or a sequence split needs a measurable payoff within the bounded search |
| Klondike | Build foundations, reveal cards, free space, join sequences | Gives specific tableau/waste moves; stock/recycle fallback cannot revisit a recent position |

Evaluation weights: completed run 3000, foundation card 200, covered card -100,
empty column 40, empty cell 12, valid adjacent face-up pair 6. These are local
heuristics, not a proof that a deal can be won. Immediate improvements take
priority. If none exists, a three-move beam search (width 12, at most 25 expanded
positions) can suggest a temporary setup with a higher-valued endpoint. It
does not exhaust every possible move sequence, inspect stock to choose a move,
or guarantee the optimal move. A useful longer plan may be missed. No-result
messages acknowledge the search limit rather than claiming the game is lost.

Recent-position keys ignore move/pass counters, slot/column permutations,
and interchangeable Spider copy IDs, retaining rank, suit, orientation and
stock/waste order. Hints reject visited results and search paths. The last 128
positions are stored separately for each game, survive refresh/game switching,
and reset on a new/restarted deal or Klondike draw-mode change. Undo truncates
the abandoned branch so its move can be tried again. This bounds storage;
positions older than the trail can eventually be revisited. Normal legal moves
remain available even if the hint evaluator declines to recommend them.

## Verification

- 39 Node tests pass, including equivalent Queen supports in both directions,
  canonical-equivalent boards, completion/reveal priorities, setup/storage,
  visited outcomes for every engine, and Draw 1/Draw 3 stock recycling.
- 20 deterministic deals per game, up to 100 consecutive hints each: 3,682
  legal actions, all canonical decks valid, no repeated positions. These are
  regression walks, not a win-rate or solve-rate claim.
- Local timing for those walks: Spider mean 5.3 ms / max 162 ms, FreeCell
  mean 7.8 ms / max 94 ms, Klondike mean 0.4 ms / max 6 ms. This is container
  timing, not physical iPhone performance.
- Browser suite includes 14 new Chromium/WebKit checks: screenshot-equivalent
  supports at 375×667, repeated Hint taps without mutation, touch-followed
  hint walks for all games, saved trail/Undo/refresh/game switching/Restart.
  Browser execution results are recorded in the PR after CI completes.
- The new evaluator is included in the complete versioned offline shell.

The screenshot fixture reproduces the reported equivalent supports with all
104 canonical cards and two stock rows. Cards obscured by the Safari toolbar
are not known; this is an isolated reproduction, not a reconstruction of that
entire saved deal. Physical iPhone Safari remains unverified.
