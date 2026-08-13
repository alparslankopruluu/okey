# Quality status — 2026-08-13

## Verified locally

- Expo Doctor: 20/20 checks passed on Expo SDK 57.
- Translation schema: Turkish and English remain mechanically key-equal; the latest count is recorded by `npm run lint:translations` at each checkpoint.
- ESLint: app, shared source, game core, and Worker source/tests pass with zero warnings.
- TypeScript: root app, `@luma/game-core`, and `@luma/room-service` pass strict type checks.
- Tests: current suites cover game core, app/services, Worker runtime, Firebase Functions, and Firestore rules; exact counts are reported by the final validation checkpoint rather than frozen here.
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
  The final interaction checkpoint hashes are iOS
  `cd42e7adfd6abc730ec14b97259b0269ae9e5cfac23f2351a9faa22c68d6357d`
  and Android `b1f4da1198cabec54a7dea1ef4d781b1e1901f10be2320c4ad3a8402369a296e`.
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
- The 2026-08-13 interaction checkpoint passes 178-key TR/EN parity, zero-warning
  lint and strict app/core/Worker typecheck. The final run passes 74 root
  app/core/service tests, 7 Worker runtime tests, 9 Functions tests and 4 Firestore emulator
  rules tests, including exact 100/500/1,000 mock-room settlement and remount-resistant
  gift cooldown/block enforcement. Expo Doctor passes 20/20.
- Settlement review proves multi-round totals consume authoritative deltas, accumulated
  `+101` penalties enter once, Classic mock rooms rank the highest cumulative score, and
  101 rooms rank the lowest penalty. Settlement receipts reject duplicate/missing players
  and cross-variant profiles; direct-hand 101 winners remain economy-eligible, while 101
  wall-exhaustion single/tied winners propagate to localized result and haptic surfaces.
- Offline persistence v4 stores the immutable match config, cumulative authoritative totals,
  successful 101 opening evidence, and current round together. Tests prove dealer rotation,
  same-round progressive threshold mutation plus 101/5 next-round reset, v3 one-round migration, and rejection of tampered
  totals/config/dealer state. A terminal playable-discard +101 now also emits exactly one
  warning event before wall-exhaustion settlement.
- A regenerated native iOS Debug build succeeds under Xcode 26.6 and launches on the
  iPhone 16 Pro iOS 18.3 simulator. The same live match was observed in portrait and both
  landscape directions with the Kahvehane rack, white deterministic tile faces, four
  seat-linked last discards, real 101 table melds, all six gift cards, authoritative gift
  balance/cooldown, and readable staged bot turns. The Android Debug development build
  launches on the tablet emulator without the formerly observed unconfigured-Firebase crash.
- Largest iOS accessibility text was enabled on the iPhone 16 Pro simulator. Screen
  headings, table status, player names, tile glyphs, rack actions and chat remain inside
  their surfaces; gameplay tile digits deliberately keep deterministic geometry while
  their VoiceOver labels remain semantic. See
  [`ios-largest-text-settings-fixed.png`](../evidence/simulator-2026-08-13/ios-largest-text-settings-fixed.png)
  and [`ios-largest-text-game-fixed-final.png`](../evidence/simulator-2026-08-13/ios-largest-text-game-fixed-final.png).
- Android development-build orientation is verified on the Pixel 8 Pro API 31 emulator
  in portrait and both landscape directions. The warm Kahvehane table, two-shelf walnut
  rack, ivory deterministic tile faces, four seats, wall/indicator, and draw/discard/chat/
  voice controls remain visible in each direction. See
  [`android-phone-portrait-kahvehane.png`](../evidence/simulator-2026-08-13/android-phone-portrait-kahvehane.png),
  [`android-phone-landscape-left-kahvehane.png`](../evidence/simulator-2026-08-13/android-phone-landscape-left-kahvehane.png), and
  [`android-phone-landscape-right-kahvehane.png`](../evidence/simulator-2026-08-13/android-phone-landscape-right-kahvehane.png).
- Current Simulator evidence is recorded in
  [`ios-kahvehane-table-landscape.png`](evidence/simulator-2026-08-13/ios-kahvehane-table-landscape.png),
  [`ios-kahvehane-gift-landscape.png`](evidence/simulator-2026-08-13/ios-kahvehane-gift-landscape.png),
  [`ios-rooms-level-chip.png`](evidence/simulator-2026-08-13/ios-rooms-level-chip.png),
  [`ios-reduced-motion-enabled.png`](evidence/simulator-2026-08-13/ios-reduced-motion-enabled.png),
  [`ios-reduced-motion-draw-fixed.png`](evidence/simulator-2026-08-13/ios-reduced-motion-draw-fixed.png),
  [`ios-landscape-opposite-table.png`](evidence/simulator-2026-08-12/ios-landscape-opposite-table.png),
  and [`android-tablet-development-build.png`](evidence/simulator-2026-08-13/android-tablet-development-build.png).
- The same iOS development build now exposes complete local request/friend actions. A live
  request acceptance moved Ada into the friend list with invite/remove/block controls, and
  the settings screen changed effects from 32% to 40% while enabling the independent
  ambience control. See
  [`profile-friends-accepted.png`](evidence/simulator-2026-08-13/profile-friends-accepted.png) and
  [`settings-volume-controls.png`](evidence/simulator-2026-08-13/settings-volume-controls.png).
- Offline setup now exposes 1–4 rounds plus 101 fixed/progressive and assisted/unassisted
  choices; a live three-round progressive unassisted match launched with the correct 22/21
  opening racks and no assisted auto-action surface. See
  [`offline-multiround-progressive.png`](evidence/simulator-2026-08-13/offline-multiround-progressive.png).
- Native artifact proof: the iOS simulator executable SHA-256 is
  `3778c47bdeeeb00510e8e797ffa08982a138f98269fd258753848ffbf4dd0fce`.
  Android package/version/SDK and APK integrity remain recorded from the successful
  regenerated build; neither artifact is signed or suitable for store upload.

## Open gates

- iOS/Android physical-device, Maestro, interrupted/repeated drag-gesture, and performance
  profiling remain open. Android orientation and iOS largest-text layout are now simulator/
  emulator verified. Reduced Motion was enabled in the iOS simulator and a full
  discard → three readable bot turns → wall draw cycle completed with positional motion
  suppressed; the run caught and then verified the fix for a remount-derived command-ID
  collision (wall 45→44, rack 14→15). Native iOS and
  Android development builds themselves now pass; the iOS build contains upstream script/
  Swift warnings but no project compile error.
- Firebase, Cloudflare deploy, RealtimeKit, RevenueCat/store catalogs, signing, licensed music, and store uploads remain explicit human/provider TODOs.
- Foreground/background/terminated FCM delivery, token refresh readback, and notification
  deep-link acceptance remain on the approved dev-Firebase/device gate; the current mock
  build intentionally does not import unconfigured native Firebase modules.
- Android native smoke testing caught an unconfigured App Check startup crash before handoff.
  Mock builds now exclude RN Firebase native autolinking until the approved dev Firebase
  config gate supplies and verifies both platform config files.
- Production online auth is disabled until Firebase ID-token verification replaces the local test identity header.
- Tournament/house-rule profile selection, manual meld composition, claimed playable-discard penalties, table-joker retrieval, and delta reconnect remain backlog items. Progressive/fixed thresholds, 1–4 round authoritative totals, assisted/unassisted metadata, and mock-stake settlement are implemented.

## Dependency audit

`npm audit --omit=dev` currently reports 22 advisories (7 moderate, 15 high, 0 critical) through the Expo/React Native/Metro build graph. Expo Doctor requires the installed SDK-compatible versions; npm’s suggested automatic remediation downgrades Expo/React Native across incompatible majors. No `npm audit fix --force` was run. Re-evaluate against upstream Expo/React Native releases before any release build.
