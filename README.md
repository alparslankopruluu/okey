# Luma Okey

Luma Okey is a mobile-first, calm social implementation of Classic Okey and 101 Okey for iOS and Android. It is being built with Expo/React Native, a deterministic portable TypeScript game engine, and mock-first provider boundaries.

## Current status

- Blueprint and public competitor evidence: complete.
- app-factory source: version 4.1.0, commit `db96b8675920681bb81734be2526ea67927100f4`.
- Current gate: finish physical-device/accessibility performance evidence and explicitly approved dev-provider setup. Native iOS and Android development builds run locally; deterministic Classic/101, responsive portrait/both-landscape table, directional drag/tap interaction, readable bots, exact mock room tiers, social gifts, luminous assets, optional Kahvehane theme set, and provider source scaffolds are implemented.
- Real Firebase, Cloudflare deploy, RealtimeKit, RevenueCat/store catalogs, signing, and uploads: human TODOs; not provisioned by the initial implementation.

## Intended workspace

```text
app/                       Expo Router mobile routes
src/                       UI, feature modules, services, stores, translations
packages/game-core/        deterministic Classic/101 rules, bots, replay
workers/room-service/      Cloudflare Worker + room Durable Object
assets/concepts/           generated visual explorations
assets/game/               curated production candidates
```

Product truth lives in [PRODUCT.md](PRODUCT.md), the exact local authority boundary in [docs/blueprint.md](docs/blueprint.md), and the active scope in [docs/mvp-plan.md](docs/mvp-plan.md).
