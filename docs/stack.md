# Stack — Luma Okey

This file owns the observed application toolchain. Product scope belongs in
`PRODUCT.md`; architecture decisions and provider boundaries belong in
`docs/architecture.md` and `docs/decisions.md`.

## Mobile client

- Expo SDK `57.0.12`, React Native `0.86.2`, React `19.2.3`, and Expo Router
  `57.0.12`.
- TypeScript `~6.0.3` with `strict`, `noUncheckedIndexedAccess`, and
  `exactOptionalPropertyTypes` enabled.
- iOS and Android are the V1 targets. Phone/tablet and both orientations are enabled;
  the browser client remains V2.
- Local native acceptance uses `npx expo run:ios` / `npx expo run:android`. Store or
  provider builds require a separately approved EAS/signing workflow.

## UI, state, and localization

- Expo Router owns navigation; Zustand owns local application state.
- Reanimated, Gesture Handler, Skia, SVG, Linear Gradient, Blur, and Haptics provide
  the responsive 2.5D table and motion layer.
- `i18next` and `react-i18next` provide complete Turkish and English key parity.
- AsyncStorage persists resumable offline state. Game rules never depend on UI state.

## Domain and backend boundaries

- `packages/game-core` is a pure TypeScript deterministic rules, replay, and seeded-bot
  package shared independently of the mobile UI.
- `workers/room-service` is a Cloudflare Worker with one SQLite-backed Durable Object
  authority per room. It remains local-only until an exact deploy approval.
- Firebase, RealtimeKit, RevenueCat, chat, voice, music, feature flags, and wallet access
  are reached through typed service facades. React Native Firebase `26.2.0` supplies
  app/auth/firestore/functions/App Check/messaging in development builds; the committed
  adapter uses the modular API and does not add `expo-notifications`. Provider credentials,
  native Firebase config files, and production mutations remain human-gated.
- `firebase/` contains deny-by-default Firestore rules, App Check-enforced callable
  Functions, and tests under the non-remote `demo-luma-okey` emulator namespace.

## Package and quality commands

- Package manager: npm workspaces with committed `package-lock.json`.
- `npm run lint:translations` — Turkish/English key parity.
- `npm run lint` — Expo ESLint configuration with zero-warning policy.
- `npm run typecheck` — mobile, game-core, and Worker strict type checks.
- `npm test` — Vitest application/core/service tests plus Worker runtime tests.
- `npm run test:firebase` — selects a local JDK 21+ and runs real Firestore Rules tests
  against the demo-project emulator (attempts to reach non-emulated services fail).
- `npm run validate` — all local static and test gates.
- `npx expo-doctor` — Expo dependency/configuration compatibility.
- `npm run bundle:ios` / `npm run bundle:android` — production JavaScript export proof.

## Observed workstation baseline

- Node.js `24.7.0`, npm workspaces, Xcode `26.6` (`17F113`).
- Expo Doctor passed 20/20 on 2026-08-11.
- Expo Doctor passed 20/20 after RN Firebase integration on 2026-08-12. Production npm
  audit currently reports 7 moderate and 15 high transitive advisories; npm's suggested
  direct fixes are incompatible major downgrades, so release stays gated on upstream-compatible fixes.
- Native device, voice, purchase sandbox, signing, deployment, and store upload remain
  separate acceptance gates and are never implied by JavaScript bundle success.
