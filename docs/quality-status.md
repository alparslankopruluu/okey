# Quality status — 2026-08-11

## Verified locally

- Expo Doctor: 20/20 checks passed on Expo SDK 57.
- Translation schema: 99 keys match across Turkish and English.
- ESLint: app, shared source, game core, and Worker source/tests pass with zero warnings.
- TypeScript: root app, `@luma/game-core`, and `@luma/room-service` pass strict type checks.
- Tests: 14 app/core/service tests and 2 Workers-runtime Durable Object tests pass.
- Game-core coverage includes 106-tile conservation, false-joker semantics, high-ace Classic runs, 101 opening threshold, duplicate/collision behavior, stale sequence, seeded replay, and property-based seed checks.
- Worker coverage includes room isolation, four-seat capacity, Classic/101 initialization, seat ownership, sequence progression, command replay, idempotency collision, and unauthorized-command rejection.

## Open gates

- Native iOS/Android development-build and physical-device evidence are not yet available. Factory Doctor records the local tool/disk blockers.
- Firebase, Cloudflare deploy, RealtimeKit, RevenueCat/store catalogs, signing, licensed music, and store uploads remain explicit human/provider TODOs.
- Production online auth is disabled until Firebase ID-token verification replaces the local test identity header.
- Full tournament-grade Classic/101 scoring/table mutation and delta reconnect remain backlog items.

## Dependency audit

`npm audit --omit=dev` currently reports 22 advisories (7 moderate, 15 high, 0 critical) through the Expo/React Native/Metro build graph. Expo Doctor requires the installed SDK-compatible versions; npm’s suggested automatic remediation downgrades Expo/React Native across incompatible majors. No `npm audit fix --force` was run. Re-evaluate against upstream Expo/React Native releases before any release build.
