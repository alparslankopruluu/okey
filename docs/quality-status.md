# Quality status — 2026-08-11

## Verified locally

- Expo Doctor: 20/20 checks passed on Expo SDK 57.
- Translation schema: 110 keys match across Turkish and English.
- ESLint: app, shared source, game core, and Worker source/tests pass with zero warnings.
- TypeScript: root app, `@luma/game-core`, and `@luma/room-service` pass strict type checks.
- Tests: 35 app/core/service tests and 3 Workers-runtime Durable Object tests pass.
- Native iOS Debug development build succeeded with Xcode 26.6 and was installed on an
  iPhone 16 Pro simulator running iOS 18.3. The welcome screen, offline setup, seeded
  Classic table, one user discard, three deterministic bot turns, return of control to
  the user, and reopening the same persisted match were observed. The wall advanced from
  48 to 45 tiles and remained at 45 after leaving and reopening the route.
- Game-core coverage includes 106-tile conservation, false-joker semantics, high-ace Classic runs, 101 opening threshold, duplicate/collision behavior, stale sequence, seeded replay, and property-based seed checks.
- Full-round coverage drives four deterministic bots through Classic and 101 legal finish
  or stock-exhaustion outcomes, records settlement, conserves all 106 unique tiles across
  racks/table/wall/discards, replays to the identical state, and terminates across 40
  property-generated seed/variant cases.
- Exact-cover/property coverage proves rack-order-independent automatic winning partitions.
  Legal-finish coverage accepts complete Classic and direct-finish 101 racks, lets bots
  submit the discovered finish, and rejects incomplete meld collections.
- 101 mutation/scoring coverage proves ≥101 atomic opening, rack-to-table ownership, legal
  layoff, mandatory final discard, actual-joker deadwood, Classic ordinary/okey/seven-pairs
  deductions, 101 ordinary/pairs/hand multipliers, terminal score persistence, corrupt
  settlement rejection, unopened v1 active-snapshot migration, and fail-closed ambiguous
  legacy openings.
- Worker coverage includes room isolation, four-seat capacity, Classic/101 initialization,
  seat ownership, sequence progression, command replay, idempotency collision,
  unauthorized-command rejection, and a complete authenticated 101 round whose table melds
  and settlement survive the SQLite snapshot.
- Expo production exports pass for both iOS and Android. Hermes bundles are generated under ignored `dist/expo-ios` and `dist/expo-android`; this proves JavaScript/assets bundleability, not native signing or device behavior.
- Simulator evidence: [`ios-simulator-home-2026-08-11.png`](evidence/ios-simulator-home-2026-08-11.png),
  [`ios-simulator-offline-2026-08-11.png`](evidence/ios-simulator-offline-2026-08-11.png), and
  [`ios-simulator-offline-game-2026-08-11.png`](evidence/ios-simulator-offline-game-2026-08-11.png).
- Responsive rack evidence: both Classic and 101 were opened through the installed iOS
  development build. Values `10`–`13` remained horizontal and the complete hand rendered
  on two visible shelves; Classic fit the phone width while 101 preserved readable tile
  width with horizontal rack scrolling. See
  [`ios-simulator-rack-classic-2026-08-11.png`](evidence/ios-simulator-rack-classic-2026-08-11.png)
  and [`ios-simulator-rack-101-2026-08-11.png`](evidence/ios-simulator-rack-101-2026-08-11.png).
- iPhone landscape evidence: rotating the running development build reflows the game into
  a safe-area-aware two-column layout with the table on the left and status, complete rack,
  draw/discard, chat, and voice controls on the right. Classic, 101, the landscape chat
  panel, return to portrait, and both landscape directions were observed. See
  [`ios-simulator-landscape-classic-2026-08-11.jpeg`](evidence/ios-simulator-landscape-classic-2026-08-11.jpeg)
  and [`ios-simulator-landscape-101-2026-08-11.jpeg`](evidence/ios-simulator-landscape-101-2026-08-11.jpeg).
- 101 table-mutation evidence: the rebuilt native Debug app opened seed 2 in landscape,
  exposed a localized 104-point automatic opening, and accepted the real Simulator tap. The
  authoritative state moved 13 tiles from the user rack into four table melds, displayed
  `Masada 4 per`, and retained the nine remaining tiles on two shelves in both orientations.
  See [`ios-simulator-101-table-melds-landscape-2026-08-11.png`](evidence/ios-simulator-101-table-melds-landscape-2026-08-11.png)
  and [`ios-simulator-101-table-melds-portrait-2026-08-11.png`](evidence/ios-simulator-101-table-melds-portrait-2026-08-11.png).
- The first native attempt exposed an incompletely extracted local `node_modules` tree
  (missing Skia simulator and Workerd binaries). A lockfile-exact `npm ci` restored both;
  the Worker typecheck and second native build then passed without source-version changes.

## Open gates

- Android development-build, iOS/Android physical-device, tablet/Android orientation,
  large-text, Reduced Motion, and Maestro evidence remain open. The latest iOS simulator
  rebuild completed with zero errors and zero warnings.
- Firebase, Cloudflare deploy, RealtimeKit, RevenueCat/store catalogs, signing, licensed music, and store uploads remain explicit human/provider TODOs.
- Production online auth is disabled until Firebase ID-token verification replaces the local test identity header.
- Tournament/house-rule profile selection, multi-round totals, manual meld composition,
  playable-discard penalties, table-joker retrieval, and delta reconnect remain backlog items.

## Dependency audit

`npm audit --omit=dev` currently reports 22 advisories (7 moderate, 15 high, 0 critical) through the Expo/React Native/Metro build graph. Expo Doctor requires the installed SDK-compatible versions; npm’s suggested automatic remediation downgrades Expo/React Native across incompatible majors. No `npm audit fix --force` was run. Re-evaluate against upstream Expo/React Native releases before any release build.
