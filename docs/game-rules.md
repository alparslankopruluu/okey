# Game rules contract — Classic Okey and 101 Okey

This document is the product-facing rule profile for the deterministic engine. It synthesizes two independent read-only reviews run under `.factory/workflows/game-rules-v1.json` on 2026-08-11. Sources disagree on several 101 house rules, so Luma Okey uses named immutable profiles plus room-visible flags rather than a silent hybrid.

Sources: [Pagat Classic Okey](https://www.pagat.com/rummy/okey.html), [Pagat Okey 101](https://www.pagat.com/rummy/okey101.html), [Türkiye Barolar Birliği-hosted tournament PDF](https://medya.barobirlik.org.tr/barowebsite/uploads/52/kural1.pdf), [Altinstar 101 rules](https://www.altinstar.com/en/how-to-play-okey/okey-101-rules), [Okey Evi rules](https://www.okeyevi.com.tr/OyunKurallari.aspx), and [okey.gg 101 rules](https://okey.gg/101/rules/). Commercial implementations are behavior references, not authorities over house-rule disputes.

## Shared physical model

- Exactly 106 unique physical tiles: two copies of each 1–13 face in four colors plus two false jokers.
- Every physical tile keeps a stable ID. Equal faces are never interchangeable in conservation, pairs, commands, replay, or idempotency.
- The face-up normal tile is the indicator. The same-color successor (13 wraps to 1) is the actual wild-joker face; both physical copies are wild.
- A false joker is not wild. It acts as an ordinary tile of the current actual-joker face.
- A set is 3–4 equal numbers with distinct colors. A run is at least three consecutive values of one color.
- Every turn, including a winning turn, ends with one dedicated discard.

## `classic-standard-v1`

- Dealer/starting player receives 15 tiles and starts by discarding; others receive 14.
- A player may draw from the wall or take only the immediately preceding top discard.
- Melds remain concealed until the winning 14-tile rack is declared.
- Winning rack: complete sets/runs or seven exact physical pairs.
- High ace is allowed only at the end: `12-13-1` (and the longer preceding run) is valid; `13-1-2` is invalid.
- Actual-joker winning discard is distinct from an ordinary actual-joker discard and from a false-joker discard.
- Baseline stock exhaustion ends without a winner. Score presentation stays a separate room profile.

## `101-fixed-open-v1`

- Starting player receives 22 tiles and starts by discarding; others receive 21.
- Runs do not wrap: `12-13-1` is invalid.
- First opening is either sets/runs totaling at least 101 face points in one atomic command or at least five exact physical pairs. The two opening forms cannot be mixed.
- Layoffs on existing table melds do not count toward the initial 101.
- Only a player whose hand is already open may take the previous player's top discard. An unopened player draws from the wall. This is the approved Luma room profile; the immediate-opening exception remains a deferred named variant.
- After opening, the player may extend legal table melds; all turns still end in a discard.
- During one turn a player may add at most two tiles to the same table meld. A third tile waits for that player's next turn.
- A direct 21-tile finish without layoffs may bypass the 101 threshold when the room profile enables it.
- Baseline scoring: normal winner −101; unopened loser 202; opened loser remaining face total; pair opener remaining total ×2. Joker finish and hand finish multipliers are computed by the scoring profile, not UI.

## Deterministic solver and table mutation

- `findWinningMelds` and `findWinningDiscard` use deterministic exact-cover search. Caller rack order never changes the selected partition; identical state yields identical meld IDs and discard.
- Runs longer than five are represented as adjacent legal 3–5 tile runs, so candidate enumeration stays bounded without changing whether a rack can finish.
- Classic searches sets/runs first and the seven-exact-pairs alternative separately; it never accepts a mixed pair/run partition.
- The 101 auto-opening helper selects disjoint sets/runs worth at least 101 while leaving the mandatory discard, then falls back to five exact pairs when enabled.
- `open_melds` atomically removes physical tiles from the rack and creates owned `TableMeld` records. `extend_meld` revalidates the complete target meld and cannot consume the final discard tile. Pair melds cannot be extended.
- A sets/runs opener can finish only with new sets/runs; a pairs opener can place new pairs and may lay tiles off on existing sets/runs. Every accepted table mutation is sequence-checked, idempotent, replayable, and included in 106-tile conservation.

## `RoundSettlement v1`

- Every terminal state carries the immutable scoring profile, terminal reason, optional finish style, winner, per-player deadwood, and score delta. `PlayerState.roundScore` must equal its settlement entry.
- Classic starts from the traditional 20-point room score outside the round reducer. This reducer emits `0` for the winner and `−2` for each opponent on an ordinary finish; an actual-joker discard or seven-pairs finish emits `−4`. Stock exhaustion emits zero.
- 101 ordinary sets/runs finish: winner `−101`; unopened loser `202`; opened loser remaining face total; pair opener remaining total ×2.
- Actual-joker finish doubles the applicable winner and opened-player values. Pair-winning and direct-hand finishes use the documented doubled profile; a direct hand plus actual-joker finish is `−404` for the winner and `808` for unopened opponents.
- An actual joker left in a 101 rack is worth 101 deadwood. On stock exhaustion, players who opened are ranked by remaining penalty total; the lowest total wins and equal totals create joint winners. Unopened players receive the fixed 202 profile. If nobody opened, the mock stake is refunded.
- The physical false joker is scored as the represented ordinary joker-face number, never as a wild actual joker.

## Explicit configuration (never hidden)

| Flag | Default | Why explicit |
|---|---|---|
| `classicHighAceRun` | `true` | Classic and 101 differ |
| `allowSevenPairsClassic` | `true` | Standard alternative finish |
| `openingThresholdMode` | `fixed` | Progressive “beat previous by one” is a room-visible 101 mode |
| `allowPairsOpening101` / count | `true` / `5` | Sources agree on common pair opening, rooms may exclude it |
| `allowDirectFinishBelowThreshold101` | `true` | Direct-hand finish exception |
| `discardProbePolicy` | `allow_return` | Tournament rules may require commit-or-penalty |
| `tableJokerRetrieval` | `locked` | Sources disagree on replacement/retrieval |
| `playableDiscardPenalty` | `automatic` | Tournament rules may require an opponent claim |

Partnership, Çanak, indicator bonuses, and alternative score formats are not part of these two V1 profiles. Progressive opening, one-to-four round matches, the two-tile-per-meld turn cap, automatic +101 rule penalties, assistance mode, and casual/mock-stake mode are explicit `MatchConfig`/rule fields rather than hidden behavior.

## Required invariants/tests

1. Indicator red 13 makes both red 1 copies wild; both false jokers act as ordinary red 1.
2. A set cannot use both physical copies of the same color/number; a pair must use those two exact copies.
3. Classic accepts `12-13-1` and rejects `13-1-2`; 101 rejects both wraps.
4. Opening total 100 rejects atomically; layoffs cannot inflate the first 101; four pairs reject.
5. Out-of-turn, stale-sequence, double-draw, missing-tile, reused-tile, invalid-meld, and no-discard finish commands do not mutate state or consume RNG.
6. Same command ID/same payload is idempotent; same ID/different payload is a conflict.
7. Indicator + wall + racks + discards + table always conserve 106 unique physical IDs.
8. Same seed and accepted command log yields the same deal, events, bot choices, score, and state hash.
9. Snapshot-plus-tail replay equals full replay; reconnect never reshuffles or advances RNG.
10. Actual-joker winning discard, ordinary actual-joker discard, and false-joker discard are three separate cases.
11. Opening/layoff/finish moves transfer every used physical tile to exactly one table meld; persistence and Worker snapshots retain the same 106 IDs.
12. Settlement is deterministic under replay, score deltas match `PlayerState.roundScore`, and corrupt/missing terminal settlement snapshots are rejected.
13. Ambiguous joker sequences use the highest legal represented range for opening points; representation is deterministic under replay.
