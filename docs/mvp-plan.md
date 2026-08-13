# MVP Plan — Luma Okey

**Current milestone:** M3 — native proof and provider approval gates

## M0 — Blueprint, assets, and scaffold

- [x] app-factory 4.1.0 installed from `db96b8675920681bb81734be2526ea67927100f4`.
- [x] Public research, clone screen, name screen, and deterministic Opportunity Score = `go` (80/100).
- [x] `PRODUCT.md`, product map, blueprint, architecture, security, and backlog aligned.
- [x] Generate and curate five original concept sets before feature code; prompts, origin, hashes, selections, and deterministic-glyph boundary are recorded in `docs/design-asset-bible.md`.
- [x] Expo SDK 57 workspace boots; strict TypeScript, lint, tests, and Expo doctor pass.
- [x] Turkish/English key-parity skeleton and design tokens exist from day one.
- [x] Provider boundaries default to mocks; no credentials/config binaries are committed.
- [x] Release-only preflight TODOs remain explicit: supported `asc`, Maestro, ≥30 GiB free disk.

**Done when:** approved concept assets and the mobile workspace are committed, tests are green, and provider/store work remains clearly mocked or waiting-human.

## M1 — Deterministic game core and offline table

- [x] `packages/game-core` models tiles/racks/melds/state/commands/events without UI imports.
- [x] Classic and 101 rules/scoring cover false joker, automatic winning partitions, opening/table mutation, legal finish, settlement, invalid moves, and replay.
- [x] Seeded shuffle/bots produce identical results and a full offline match can finish.
- [x] Offline match persists and resumes after app restart.
- [x] Responsive table supports phone/tablet layout rules, portrait/landscape, reorder/draw/discard, readable tiles, Reduced Motion, and low-performance fallback.
- [x] Bot turns pause for a readable human beat; rack reorder and wall draw support drag-and-drop while labelled tap actions remain available.
- [x] Original Luma and optional Kahvehane table themes share deterministic horizontal tile glyphs; the Kahvehane set uses a generated transparent walnut rack and realistic ivory material reference.
- [x] Home, offline setup, game, daily bonus, settings/music, profile/store/safety/social mock surfaces are navigable in Turkish and English.

**Current acceptance evidence:** iOS 18.3 iPhone 16 Pro simulator runs the native Debug
build. Welcome, offline setup, seeded Classic table, one user discard, three bot turns,
turn handoff back to the user, and versioned/validated AsyncStorage resume at the same wall
count are verified. iPhone portrait, both landscape directions, Classic/101 two-column
reflow, and the landscape chat panel are also verified. Tablet, Android orientation,
accessibility, and a user-completed winning round remain open. Exact-cover winner discovery
now allows bots to submit legal finish commands before stock exhaustion. The same deterministic
runner covers both finish and draw outcomes, preserves all 106 tiles including 101 table melds,
replays to the identical final state, and terminates across 40 property-generated seed/variant
cases. On the native simulator, 101 seed 2 found a 104-point opening; tapping the localized
action atomically moved 13 physical tiles into four table melds and reflowed the remaining
nine-tile rack in portrait and landscape.

**Done when:** a new user completes a deterministic Classic or 101 bot round and understands every core action unaided.

## M2 — Online/social/economy boundaries

- [x] Cloudflare Worker + room Durable Object validates membership, sequence, idempotency, turns, reconnect/resume, expiry, snapshot conservation, and verified gift receipt replay locally.
- [x] Four-player protocol tests cover duplicate/out-of-turn commands, reconnect, disconnect, and same-account two-device behavior.
- [x] Firebase modular mobile adapter and local Functions/Rules cover anonymous auth, App Check, FCM device registration, profiles, friendships, notifications, and append-only gift spend; real configs remain gated.
- [x] Daily bonus rejects duplicates; mock wallet/gift authority rejects negative and replayed spend, enforces cooldown/hour/day caps, and records append-only ledger entries. Connected wallet authority remains provider-gated.
- [x] Chat covers filtering, rate limit, mute/block/report, and 24-hour TTL.
- [x] RealtimeKit-shaped local mock covers permission denial, push-to-talk, mute, reconnect, and has no recording path; real microphone permission/media-token proof remains in M3.
- [x] RevenueCat mock exposes three chip packages plus weekly/yearly VIP and idempotent purchase webhooks.
- [x] Level/chip room catalog exposes casual and clearly labelled mock-stake tiers; purchased-chip production stakes remain disabled by feature flag.
- [x] In-room gift sheet exposes recipient avatar, authoritative mock balance, affordability, explicit confirmation, and five-second cooldown in portrait and landscape.
- [x] Mock gift cooldown/hour/day history persists across route remounts; exact room entry tiers propagate into 100/500/1,000-chip mock settlement without changing production stake gates.
- [x] Profile exposes incoming-request accept/reject, friend list, private-room invite, remove, block, and unblock actions; a chat block updates the same persisted policy read by in-room gift authority before every send.
- [x] Settings exposes independent accessible music, effects, and ambience volume controls using the existing three-channel audio state.
- [x] Offline v4 persists authoritative `MatchState` with the active round, validates cumulative totals/config/dealer/rule thresholds, migrates v1–v3 into a safe one-round session, and resumes fixed/progressive 1–4 round play.

**Done when:** local tests prove protocol/economy/social invariants without requiring any real provider account.

## M3 — Native proof and release readiness

- [x] Lint, typecheck, game-core/Worker/app tests, translation parity, Expo Doctor and local Firebase rules/policy tests pass; dependency audit risk is documented pending upstream-compatible fixes.
- [x] iOS and Android development builds run on simulator/emulator; iOS portrait/both landscape directions, VoiceOver labels, gifts, bot pacing, rooms, and Kahvehane layout are recorded.
- [x] Large text and Android portrait/both-landscape orientation evidence recorded. Reduced Motion is enabled and a full discard → three bot turns → draw cycle is captured on the iOS simulator.
- [x] iOS Simulator proves request acceptance updates the friend list and effect/ambience volume controls mutate and enable correctly; screenshots and accessibility-tree readback are recorded.
- [ ] Physical-device performance, interrupted/repeated drag gestures, and Maestro evidence recorded.
- [ ] Real-device voice and purchase sandbox acceptance completed after human provider setup.
- [ ] Firebase/Cloudflare/RealtimeKit/RevenueCat dev resources created only after separate approval and verified by readback.
- [ ] Store metadata/icon/screenshots reflect the real accepted build.
- [ ] TestFlight/Play internal upload occurs only after the user separately approves the exact artifact/group/track.

## Scope fence

1. Playable web/browser client (V2; reuse game core/protocol).
2. Full Three.js mobile table.
3. Cash prizes, withdrawals, transfers, gifts with real value, or gambling.
4. Production chip-stake rooms before legal/store review.
5. Public voice discovery, voice recording, direct messages, clubs, tournaments, or leagues.
6. More than Turkish and English in V1.
7. Production provider deploys, store products/prices, signing, or uploads without separate approval/readback.
8. AI-generated tile numbers/symbols; gameplay glyphs stay deterministic SVG/Skia.
