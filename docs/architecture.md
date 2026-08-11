# Architecture — Luma Okey

## Repository map

```text
app/                         # Expo Router screens
src/
  components/               # shared visual primitives, table HUD, cards
  features/                 # lobby, game, economy, social, settings
  services/                 # strict mock/provider façades
  stores/                   # Zustand view/session preferences
  translations/            # en.json schema + tr.json parity
  theme/                    # semantic color/type/space/radius/motion tokens
  utils/                    # pure helpers only
packages/
  game-core/                # deterministic Okey/101 engine, bots, replay, tests
workers/
  room-service/             # Cloudflare Worker + per-room Durable Object
assets/
  concepts/                 # generated concept explorations
  game/                     # curated production candidates; deterministic tile glyphs excluded
docs/                       # product memory, asset bible, contracts, evidence
.factory/                    # ignored local run/capsules/evidence state
```

V2 may add `apps/web` using Vite/React/Three.js while importing `packages/game-core` and the same protocol types.

## Dependency direction

```text
Expo views → feature intents/stores → game-core + service façades
Cloudflare room Durable Object → game-core + protocol
provider adapters → Firebase / RealtimeKit / RevenueCat (mock by default)
game-core → TypeScript standard runtime only (no React Native, network, clock, or provider SDK)
```

## Domain and state

- `Tile`, `Rack`, `Meld`, `GameVariant`, `GameState`, `GameCommand`, and `GameEvent` are immutable serializable types.
- Commands are validated and reduced to events; state changes only by applying events.
- Seeded PRNG controls shuffle and bot tie-breaking. Replay is `(initial seed + ordered commands/events)`.
- Wall-clock time enters only as explicit command metadata; game rules never read ambient time.
- Zustand owns UI preferences/session projection, never authoritative rules or wallet balance.

## Online protocol

- Worker routes auth/room requests and upgrades WebSockets to a room Durable Object.
- One Durable Object is authoritative per room. It stores the latest snapshot, bounded event log, connected player sessions, and processed command IDs.
- Each client command includes protocol version, room ID, actor/account/device IDs, command ID, expected sequence, and payload.
- The object rejects malformed, duplicate, out-of-turn, stale-sequence, wrong-room, or unauthorized commands; successful state is committed before broadcast.
- Reconnect sends a snapshot and events after the client resume cursor. Alarm-based expiry closes abandoned rooms.

## Services

| Service | Responsibility | Current implementation |
|---|---|---|
| `AuthService` | anonymous session, later Apple/Google link | mock-first |
| `ProfileService` | profile/device/cosmetic ownership | local mock |
| `RoomService` | create/join/resume/send command | offline + Worker contract |
| `LedgerService` | append-only chips, bonus and purchase grants | in-memory/mock with idempotency tests |
| `PurchasesService` | offerings, purchase, restore | RevenueCat mock |
| `VoiceService` | PTT, mute, permission, reconnect | RealtimeKit mock |
| `ChatService` | TTL messages, filter/rate/mute/block/report | local/room mock |
| `MusicService` | local play/pause/track/volume | silent mock until licensed assets |
| `AnalyticsService` | typed redacted events | console-free memory mock |

## Deployment boundaries

- Provider SDKs never appear in screens or game core.
- No client can author wallet totals; only idempotent ledger grants/spends produce a derived balance.
- Cloudflare and Firebase production writes require separate approval, dry-run/audit, and readback.
- `.env*`, Firebase native config, signing files, API keys, and provider payloads remain ignored and never enter evidence/commits.
- GitHub `main` pushes are allowed by the user’s explicit plan; store upload and production deployment are not.

## Performance and motion

- Reanimated worklets own gestures/short state transitions; Skia draws the 2.5D table and deterministic tile faces.
- React state does not update per animation frame. Asset textures are bounded and preloaded.
- Standard target is 60 FPS; device heuristics can select controlled 30 FPS, fewer particles, simpler shadows, and no parallax.
- Reduced Motion replaces deal/discard travel and depth/parallax with short fades/state snaps while preserving turn feedback.
