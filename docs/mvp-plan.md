# MVP Plan — Luma Okey

**Current milestone:** M1 — deterministic game core and offline table

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
- [ ] Responsive table supports phone/tablet, portrait/landscape, drag/reorder/draw/discard, readable tiles, Reduced Motion, and 30 FPS fallback.
- [ ] Home, offline setup, game, daily bonus, settings/music, profile/store/safety mock surfaces are navigable in Turkish and English.

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

- [ ] Cloudflare Worker + room Durable Object validates membership, sequence, idempotency, turns, reconnect/resume, and expiry locally.
- [ ] Four-player protocol tests cover duplicate/out-of-turn commands, reconnect, disconnect, and same-account two-device behavior.
- [ ] Firebase mock adapters cover auth/profile/config/analytics/crash/device and append-only chip ledger.
- [ ] Daily bonus rejects duplicates; wallet rejects negative/unauthorized/replayed writes and reconciles ledger totals.
- [ ] Chat covers filtering, rate limit, mute/block/report, and 24-hour TTL.
- [ ] RealtimeKit mock covers permission denial, push-to-talk, mute, reconnect, and has no recording path.
- [ ] RevenueCat mock exposes three chip packages plus weekly/yearly VIP and idempotent purchase webhooks.
- [ ] Chip rooms remain disabled in production config.

**Done when:** local tests prove protocol/economy/social invariants without requiring any real provider account.

## M3 — Native proof and release readiness

- [ ] Lint, typecheck, game-core/Worker/app tests, translation parity, secret scan, and dependency review pass.
- [ ] iOS and Android development builds run on simulator/emulator; accessibility, orientations, large text, reduced motion, and performance evidence recorded.
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
