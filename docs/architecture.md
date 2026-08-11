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

- `Tile`, `Rack`, `Meld`, `TableMeld`, `GameVariant`, `GameState`, `GameCommand`, `GameEvent`, and `RoundSettlement` are immutable serializable types. A completed state records `roundEndReason` as either a legal finish or wall exhaustion; only a legal finish has `winnerId`.
- Commands are validated by one pure reducer. Opening and layoff commands move the exact physical tiles from a rack into owned table melds; terminal commands also attach per-player settlement entries.
- The exact-cover solver discovers a canonical winning partition independent of UI/rack order. The same helper drives the bot and changes the user’s selected-discard action to a legal finish when the remainder is complete.
- Seeded PRNG controls shuffle and bot tie-breaking. Replay is `(initial seed + ordered commands/events)`.
- The deterministic bot-round runner is bounded to 512 commands. Bots attempt legal finish, 101 opening, table layoff, and finish again before choosing a discard. If nobody can finish, the final discard after the last wall draw closes the round as a draw instead of leaving the next player on an empty source.
- Wall-clock time enters only as explicit command metadata; game rules never read ambient time.
- Zustand owns UI preferences/session projection, never authoritative rules or wallet balance.

## Online protocol

- Worker routes local-auth room requests and upgrades WebSockets to a room Durable Object; production Firebase token verification remains gated.
- One SQLite-backed Durable Object is authoritative per room. It stores the latest serializable snapshot and the game state’s bounded processed-command fingerprints.
- Each implemented command includes a command ID, authenticated seat/player ID, expected sequence, and typed payload.
- The object rejects malformed, idempotency-colliding, out-of-turn, stale-sequence, or unauthorized commands; successful state is persisted before broadcast.
- Reconnect currently sends the latest full snapshot. Delta/event-cursor resume is a release-readiness backlog item. A 24-hour alarm expires abandoned rooms and closes sockets.
- Hibernatable WebSockets preserve a minimal user attachment and avoid keeping idle room isolates active.

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
| `AnalyticsService` | typed redacted events | planned mock; no provider SDK |

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
