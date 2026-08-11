# Features — shipped registry

Only validated implementation enters this table. Planning belongs in `docs/mvp-plan.md`.

| Feature | Screens / routes | Analytics events | Strings | Since |
|---|---|---|---|---|
| App-factory 4.1.0 project foundation | repository/docs | N/A | N/A | bootstrap |
| Original luminous-clay asset system and deterministic development icon | welcome/home/profile | not connected | TR + EN | asset-first |
| Expo mobile shell with responsive light/dark routes | welcome, tabs, rooms, create, safety | not connected | TR + EN parity | mobile shell |
| Deterministic Classic/101 game model, seeded shuffle/bot, full wall-exhaustion round runner, replay and core rule validation | offline, game | local only | TR + EN | game core |
| Offline four-seat turn loop with validated/versioned resume snapshot, rack reordering, horizontal two-digit tile glyphs, responsive two-shelf rack and safe-area-aware portrait/landscape game reflow | offline, game | local only | TR + EN | offline mode |
| Safe mock auth/chat/voice/music/purchases and append-only chip ledger | store/settings/safety + service tests | local only | TR + EN | provider mocks |
| SQLite-backed per-room Durable Object with sequence/idempotency/seat enforcement, hibernatable sockets and expiry | Worker contract | structured errors only | protocol | online backend scaffold |
