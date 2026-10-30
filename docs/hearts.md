# Hearts

Open `/#hearts`. Play against West, North and East, using a standard 52-card
deck and no network services. Lowest score wins when any score reaches 100.
The match seed reproduces deals and deterministic computer choices using this
project's shuffle, not Windows deal numbers. Play can continue offline after
the complete app shell has cached.

## Rules and choices

- Each player receives 13 cards; Ace is high. Pass three cards left, right,
  across, then hold, repeating every four hands. All passing is simultaneous.
- The owner of 2♣ after passing must lead it. Play proceeds clockwise; follow
  the led suit whenever possible. Highest card of that suit wins, with no trump.
- On the first trick, a player void in clubs must discard a non-penalty card
  if available. If only penalty cards remain, a penalty discard is permitted.
- Lead hearts only after a heart has been played, or when holding only hearts.
  Q♠ does not break hearts. Rulesets differ here: Bicycle also permits a Q♠
  discard to break hearts; that variation is not used in this implementation.
- Each heart scores 1, Q♠ scores 13. Taking all 26 penalty points shoots the
  moon: the shooter scores zero and every other player adds 26. There is no
  optional subtract-26 variant. Totals update once after the 13th trick.
- The match ends after a hand when anyone reaches/exceeds 100. Lowest score
  wins; tied lowest players share the win. No additional tie-breaking hand.

Sources checked October 30, 2026:
[MobilityWare play/passing rules](https://mobilityware.helpshift.com/hc/en/42-hearts-card-game/faq/2621-how-do-i-play-hearts/),
[MobilityWare breaking hearts](https://mobilityware.helpshift.com/hc/en/42-hearts-card-game/faq/2624-what-does-hearts-broken-mean/),
[Mattel Hearts instructions](https://service.mattel.com/instruction_sheets/I6039.pdf),
and [Bicycle rules/variant](https://bicyclecards.com/how-to-play/hearts).
This is an original implementation with explicit rules, not an exact copy of
Microsoft's code, artwork or every historical Windows rule variation.

## Controls and presentation

Select three cards, then **Pass 3**. During play, white cards are legal; gray
cards are disabled but retain readable ranks and suits. Tap a white card to
select it, then **Play selected card**. Tap again or use **Clear selection**
to deselect. Hints highlight a suggestion; they never commit it.

Computer turns run synchronously until your next decision or a completed
trick. All four played cards and their winner stay visible until **Collect
trick**. No animation timer or background task can race a refresh, Undo or
game switch. The last collected trick remains summarized beneath the table.
Scores show collected hand points (or adjusted final hand points) and match
totals; moon scoring is explicitly announced. Review **Hand score history**
at any time after the first hand. **Next hand** continues the same match.

The hand wraps without overlap, with targets at least 44px in each dimension.
Stock/tableau controls are hidden. Cards reuse `src/board.js` and shared CSS.
The four-card trick fits the phone width; the hand and controls scroll with
the page. The action bar follows the hand in normal flow, with safe-area
padding, so it cannot overlay card ranks. Opponent cards are not rendered, including in attributes.
Only their names, remaining counts, scores and public plays are shown.

## State and computer players

`src/hearts.js` contains immutable rules and deterministic deal progression;
`src/hearts-ui.js` owns selection/rendering. The common app routes `#hearts`,
keeps `classic-win-hearts-v1` separate from every solitaire save, and precaches
both new modules. Saving includes the current hand, partial/complete trick,
passed/received card IDs, completed tricks, score history and current phase.

Validation checks canonical IDs/suits/ranks/colors, all 52 cards, hand counts,
passing metadata, scores and match phases. It reconstructs each post-pass hand
and replays public tricks to reject illegal openings, reneging, invalid heart
leads, impossible turns and incorrect winners. This is corrupt-save recovery,
not tamper-proof competitive storage. Browser developer tools can inspect any
local save, including opponent hands.

Computer passing and play receive only `playerView`: that player's hand,
legal cards and public trick/point information. Strategies shed dangerous high
cards, follow below a winning card when possible, discard penalties when void,
and shed high safe cards when last to a harmless trick. No model, solver, other
player's hidden hand, network service, difficulty setting or team play is used.
The same policy supplies human hints. It is a basic opponent, not expert AI;
it does not plan moon shots or reliably defend against them.

**Undo** restores the state before a human action, including the computer plays
that followed it. Collection and hand transitions can also be undone. History
keeps the last 100 actions in memory and resets on refresh/game switching.
The board and scores persist. Undo cannot make previously seen cards unknown.
**Restart** resets the entire seeded match, including scores. **New game** and
**Match number → Play deal** also start a new match; confirmation explains this.

## Verification

Unit coverage includes deterministic hands, pass direction/ownership and
simultaneity, forced 2♣, follow suit, first-trick restrictions/forced exceptions,
hearts-only leads, Q♠ behavior, Ace-high trick winners, visible trick collection,
normal and moon scoring, match end, Undo snapshots, corrupt saves and hidden
information independence. Thirty seeded complete matches are played through
100 points, validating every intermediate state and card/score conservation.

Browser coverage includes all five viewport sizes in Chromium and WebKit,
passing/deselection, hints without mutation, legal-card disabling, a complete
13-trick hand, moon/match-end screens and Undo, replay/Restart/New, saved games,
other-game isolation, invalid saves, blocked storage and offline progression.
Initial CI passed all 62 unit and 130 browser tests at `829276f9245a7b5f59ff26b88771b7c14fcc7411`.
Screenshot review then exposed a sticky action bar covering a row of passing
cards at 375px. Controls now stay below the hand. Geometry checks include
actual corner hit testing (`elementFromPoint`) to detect overlays, rather
than checking only card bounds. Corrected screenshots and CI are recorded
in the PR before merging.

Physical iPhone Safari, standalone installation and native touch scrolling
remain device checks. The browser suite uses real Linux WebKit, which does
not establish physical-device behavior. There is no multiplayer or ranking.
