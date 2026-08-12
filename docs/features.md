# Features — shipped registry

Only validated implementation enters this table. Planning belongs in `docs/mvp-plan.md`.

| Feature | Screens / routes | Analytics events | Strings | Since |
|---|---|---|---|---|
| App-factory 4.1.0 project foundation | repository/docs | N/A | N/A | bootstrap |
| Original luminous-clay asset system and deterministic development icon | welcome/home/profile | not connected | TR + EN | asset-first |
| Expo mobile shell with responsive light/dark routes | welcome, tabs, rooms, create, safety | not connected | TR + EN parity | mobile shell |
| Deterministic Classic/101 game model with exact-cover winner discovery, legal bot/user finish, authoritative 101 table meld mutation, source-locked settlement, seeded full-round runner, replay and property validation | offline, game | local only | TR + EN | game core |
| Offline four-seat turn loop with v1→v2 validated resume migration, persisted table/settlement state, automatic 101 open/layoff controls, rack reordering, horizontal two-digit tile glyphs, responsive two-shelf rack and safe-area-aware portrait/landscape game reflow | offline, game | local only | TR + EN | offline mode |
| Safe mock auth/chat/voice/music/purchases and append-only chip ledger | store/settings/safety + service tests | local only | TR + EN | provider mocks |
| SQLite-backed per-room Durable Object with sequence/idempotency/seat enforcement, persisted 101 table/settlement state, hibernatable sockets and expiry | Worker contract | structured errors only | protocol | online backend scaffold |
| Discard provenance, four seat-linked latest-discard surfaces, Classic/101 pickup gates, v3 offline migration, fixed/progressive 1–4 round match metadata, automatic +101 opening/take-back/playable-discard penalties and mock-stake settlement | game table + core | local only | TR + EN | full rule pass |
| Exact circular 512px avatar crops, generated responsive two-tier rack, six chip-priced non-transferable gifts, gift flight/win/meld/discard motion, deterministic three-channel audio, sparse speech-free ambience, mock friend search/requests and notification bell | home/profile/settings/game | local only | TR + EN | social polish |
| Deny-by-default Firestore rules, App Check-enforced social/gift callables, modular RN Firebase adapter, allowlisted FCM payload parser, and single-publish Durable Object gift receipt storage | provider boundary + Worker contract | local emulator only | protocol | provider scaffold |
