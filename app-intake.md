# App Intake — Luma Okey

## Product request

- Build a premium social Okey game for iOS and Android with Expo/React Native.
- V1 is mobile-first. A playable browser client is deferred to V2, while the game engine and wire protocol remain portable TypeScript.
- V1 supports Classic Okey and 101 Okey, four-player online rooms, and offline matches against deterministic bots.
- Preserve a calm, responsive UI across phones/tablets and portrait/landscape. Use generous space, rounded cards, soft glass, pastel-neon light, clay/soft-3D objects, aqua primary actions, and restrained typography.
- Use the supplied screenshots only as broad visual-language references. Do not copy brands, layouts, characters, wording, icons, or trade dress.
- Motion should be plentiful but purposeful: tactile tiles, rack reordering, turn focus, deal/discard arcs, bonus reveals, room transitions, and ambient particles. Reduced Motion and a controlled low-performance fallback are required.

## Locked V1 behavior

- Game variants: Classic Okey and 101 Okey.
- Modes: offline bots and authoritative online four-player rooms.
- Social: room text chat, push-to-talk voice, mute, block, report, and rate limits.
- Music: personal device playback only; play/pause, track change, and volume. Music is never synchronized to the room and must be bundled/licensed before production.
- Economy: 5,000 starter chips; daily streak rewards of 250/300/350/400/500/750/1,000; free casual rooms; chip rooms behind a production-off feature flag.
- Purchases: three consumable chip packages plus weekly/yearly VIP. VIP is cosmetic/ad-free/convenience only and grants no gameplay advantage.
- Purchased-chip stake rooms remain production-disabled until store classification and legal review are complete. No transfers, cash-out, prizes, or real-world value.
- Age position: 18+ social game. Full V1 UI languages: Turkish and English.

## Architecture choices

- Expo SDK 57, React Native New Architecture, TypeScript strict, Expo Router.
- Reanimated + Skia for the mobile 2.5D table; no full Three.js mobile scene.
- `packages/game-core` owns deterministic rules, commands, events, bots, and replay.
- Cloudflare Worker + one Durable Object per room is the online authority over WebSockets.
- Firebase boundaries cover anonymous/Apple/Google auth, profiles/devices, Remote Config, Analytics, Crashlytics, and an append-only chip ledger.
- RealtimeKit is the voice boundary. RevenueCat is the purchase boundary.
- Every external provider starts behind a working mock adapter and a precise human TODO. No provider project, catalog, deploy, store upload, or production release is part of the initial implementation.

## Brand and design decision

- Candidate directions: **Luma Okey** (luminous calm), **Niva Okey** (soft social lounge), **Masa Nova** (modern table-night energy).
- Recommended/approved working name: **Luma Okey**.
- Basic App Store search on 2026-08-11 found no exact `Luma Okey` result. This is a collision screen, not legal trademark clearance.
- Working bundle identifiers: `com.alparslankopruluu.lumaokey` (iOS) and the same reverse-DNS application ID on Android.

## Human-only TODO boundary

- Upgrade `asc` to the kit-supported 3.x range; install Maestro; free at least 2 GiB before native release builds (60 GiB recommended).
- Create Firebase dev/prod projects, download native config files locally, configure Apple/Google auth, and approve privacy disclosures.
- Create/approve Cloudflare namespaces, routes, Durable Object migration, and deployment.
- Create RealtimeKit account/config and confirm voice privacy/retention settings.
- Create RevenueCat project/apps, App Store/Play products, prices, offerings, entitlement, and webhook secrets.
- Supply licensed/bundled music, store agreements, tax/banking, signing credentials, App Store/Play records, and production feature-flag approval.
- Run real-device voice/purchase testing and separately approve any TestFlight/Play upload or production deploy.

## Delivery order

1. Install app-factory 4.1.0 from source SHA `db96b8675920681bb81734be2526ea67927100f4`.
2. Prepare and lock the blueprint/memory bank.
3. Generate and curate five original asset concept sets.
4. Build deterministic game core and offline vertical slice.
5. Build the responsive animated mobile shell and mock social/economy/audio flows.
6. Add the Cloudflare room-service scaffold and provider adapters.
7. Validate, review, commit, and push narrow milestones; keep external/provider work as human TODOs.
