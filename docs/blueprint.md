# Approved local blueprint — Luma Okey

**Blueprint date:** 2026-08-11

**Kit source:** app-factory `4.1.0` at `db96b8675920681bb81734be2526ea67927100f4`

**Authority:** the user explicitly approved the implementation plan and GitHub pushes. Provider creation, deploys, paid actions, signing, store catalog changes, and uploads are excluded and remain human TODOs.

## Product

- **Pitch:** A calm, luminous Okey room for trustworthy Classic and 101 matches with friends or deterministic offline bots.
- **Target:** Turkish- and English-speaking adults (18+) who want a polished, social tabletop session without aggressive casino-like noise.
- **Core action:** enter a table, understand the current turn instantly, arrange/draw/discard tactile tiles, and finish a valid Classic or 101 round.
- **Gotcha moment:** one silent five-second view shows a soft-lit table dealing readable tiles into a tactile rack while the active player halo and discard arc explain the game state.
- **Billboard screen:** `/game/[roomId]`.
- **Three-second proof:** drag one tile, see the rack reorganize, discard it, and watch the turn halo pass without a modal or confusing chrome.
- **Original wedge:** fairness/replay and reliable social rooms expressed through a quiet premium table; monetization never changes deal or bot behavior.
- **Design:** luminous calm, tactile, sociable; pearl and midnight themes, pastel-neon rim light, clay-like avatars, rounded translucent panels, aqua CTA. Supplied references influence only these generic qualities.
- **Declared V1 screen count:** 11 route-level screens.
- **Opportunity:** 80/100, `go`; evidence is moderate and public-only.
- **Go/kill:** continue while offline seeded matches are deterministic, usability tests understand turn state unaided, reconnect recovers correctly, and D7 room return reaches 15% after launch. Reposition if fairness distrust or room reliability persists after two measured iterations.

## Scope and navigation

1. `/` launch/session restore.
2. `/welcome` optional value intro and language/theme choice.
3. `/(tabs)/home` lobby, daily bonus, quick play.
4. `/rooms` room browser/invite join.
5. `/create-room` Classic/101, casual/chip-flag, privacy.
6. `/offline` variant/bot setup and resume.
7. `/game/[roomId]` responsive portrait/landscape table (gotcha screen).
8. `/profile` avatar, level, stats, cosmetics.
9. `/store` chips/VIP catalog through mock RevenueCat.
10. `/settings` music, voice, motion, language, account.
11. `/safety` block/mute/report and policy explanations.

V2 adds a Vite/React/Three.js playable browser client that imports `packages/game-core`; V1 contains no browser gameplay route.

## Stack and identifiers

- Expo SDK 57 / React Native 0.86 era, New Architecture, Expo Router, strict TypeScript.
- Reanimated 4 and Skia 2 for UI-thread motion and deterministic 2.5D drawing.
- Zustand for local/session state; provider adapters are strict typed functions.
- Workspace: mobile root + `packages/game-core` + `workers/room-service`.
- Bundle/application ID: `com.alparslankopruluu.lumaokey`.
- Slug: `luma-okey`; version/build: `1.0.0` / `1`.
- Languages: `tr` primary, `en` complete. RTL is not in V1.

## Core/domain contract

`packages/game-core` owns `Tile`, `Rack`, `Meld`, `GameVariant`, `GameState`, `GameCommand`, and `GameEvent`; Classic and 101 rules/scoring; seeded shuffle/bot decisions; invariant validation; serialization; and replay. UI and providers cannot mutate domain state directly.

Online rooms use a Worker router and one Durable Object per room. Messages include protocol version, room ID, sequence number, command ID, actor ID, and resume cursor. The Durable Object validates auth claims, membership, turn, command schema, idempotency, and sequence; commits state before broadcast; and provides reconnect snapshots. No client-authoritative wallet mutation exists.

## Social/audio/economy

- Chat: profanity/filter adapter, per-user and per-room rate limits, mute/block/report, 24-hour TTL, no direct message in V1.
- Voice: RealtimeKit push-to-talk adapter, explicit microphone permission, mute/block/report, reconnect; no recording by this product.
- Music: device-local controller with play/pause/track/volume; mock silent catalog until licensed tracks are supplied.
- Starter balance: 5,000. Daily streak: 250/300/350/400/500/750/1,000; missed calendar day resets streak.
- Casual rooms are free. Chip rooms are disabled by default and separately gated.
- RevenueCat mock catalog: `chips_small`, `chips_medium`, `chips_large`, `vip_weekly`, `vip_yearly`; `vip` entitlement. Final product IDs/prices remain human TODOs.
- Chip ledger is append-only and idempotent; no transfer, prize, cash-out, or real-world value.

## Provider and release boundary

| Surface | Local implementation now | Human/provider action later |
|---|---|---|
| Firebase | typed mock auth/profile/config/analytics/crash/ledger adapters and emulator-ready contracts | create `luma-okey-dev/prod`, register apps, native configs, auth providers, rules/deploy/readback |
| Cloudflare | Worker/Durable Object code, local tests, checked-in Wrangler config without secrets | account selection, migrations/routes, deploy/readback |
| RealtimeKit | mock push-to-talk state machine and provider interface | account, keys, room policy, device/privacy acceptance |
| RevenueCat | mock offerings/purchase/restore and webhook/idempotency tests | ASC/Play products, prices, app links, entitlement/offering, webhook secret |
| Stores | metadata/TODO scaffolding only | app records, agreements, signing, catalog, screenshots, TestFlight/Play upload |
| Music | playback state and royalty-free placeholder contract | licensed masters, attribution/territory review |

No provider mutation or production deploy is approved by this blueprint. Git pushes to the named Okey repository are approved by the user’s implementation request.

## Acceptance and quality

- Rules: example games, false joker, opening/finish, 101 scoring, invalid moves, property tests, seeded replay.
- Offline: complete bot match, same seed/same result, persisted resume.
- Online: four players, reconnect, duplicate command, out-of-turn rejection, disconnect, room expiry, same account/two devices.
- Economy: duplicate daily bonus, replayed purchase webhook, negative balance rejection, reconciliation, unauthorized wallet write.
- Social: chat rate limit, mute/block/report, denied microphone, voice reconnect, no recording path.
- UI: small/large phone, tablet, both orientations, font scaling, screen reader, reduced motion, low-performance mode; target 60 FPS with controlled 30 FPS fallback.
- Release truth: lint, typecheck, tests, Expo doctor, Worker tests, and relevant native dev-build evidence. Missing device/store/provider evidence remains incomplete, never inferred.
