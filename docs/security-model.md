# Security Model — Luma Okey

## Risk profile

- **Flags:** 18+ social game, UGC/chat, voice, virtual currency, digital goods, third-party auth/analytics.
- **Highest harm:** harassment or unsafe voice/chat; wallet manipulation; perceived/actual unfair dealing; account/session takeover; purchased-chip stake classification.
- **Review-sensitive flows:** consumable chips/VIP, daily bonus, account deletion, microphone permission, UGC reporting, age position, and disabled stake-room configuration.

## Data and SDK inventory

| Data / SDK | Class | Purpose / owner | Retention/deletion | Client access / disclosure |
|---|---|---|---|---|
| anonymous/linked UID, provider tokens | account/secret | Firebase Auth | account lifetime; provider revocation + deletion | client receives scoped session only; never logged |
| profile, locale, avatar, cosmetics | account/private | Firestore/profile adapter | until account deletion | owner read/write through rules |
| room snapshot/events | private | Durable Object | active room + short reconnect window, then expiry | room members only |
| room text chat | UGC/private | Durable Object/chat adapter | 24 hours | current room members; muted/blocked filtered |
| voice media | sensitive ephemeral | RealtimeKit | no recording by Luma Okey | live room participants only; mic permission disclosed |
| reports/blocks/mutes | private/safety | Firebase moderation boundary | policy-defined, minimal | reporter and moderators by role; no public exposure |
| chip ledger/purchase transaction IDs | account/financial-adjacent | Firebase/RevenueCat server boundary | accounting/fraud window + deletion-policy exceptions | read-only derived balance on client |
| analytics/crash/performance | pseudonymous | Firebase | configured retention, consent/privacy labels | no chat/voice content, tile rack, token, or raw provider error |
| friends, requests, room invites, gift receipts | account/private | Firebase social adapter | account lifetime or short invite expiry | participants only; blocked pairs mutually hidden |
| FCM token metadata | secret/device | Firebase device subcollection | refreshed and stale tokens removed | owner/server only; never payload/log/UI |

## Trust boundaries and controls

| Boundary / abuse | Prevent | Detect | Recovery / test |
|---|---|---|---|
| Client → room | auth/member/schema/turn/sequence checks; stable command IDs | rejected-command metrics without payload | reconnect snapshot; duplicate/out-of-turn tests |
| Client → wallet | no balance writes; server ledger only; idempotency and nonnegative invariant | reconciliation and duplicate-grant alerts | freeze chip rooms; replay/negative/unauthorized tests |
| Firebase gift receipt → room DO | private bridge verifies receipt, room membership and catalog cost; SQLite receipt ID is unique | collision rejection and receipt audit row | identical replay is a no-op; Worker runtime tests |
| Purchase webhook | signature verification in real adapter, transaction ID uniqueness | duplicate/invalid webhook metric | no grant on failure; replay test |
| Daily bonus | server calendar day + per-day idempotency key | duplicate claim counter | derived ledger reconciliation test |
| Chat/voice | 18+, rate limits, filter, mute/block/report, PTT and permission | privacy-safe abuse counts | immediate local mute/block; report queue; no recording path test |
| Identity/device | anonymous first, secure linking, one player seat per account/room; validated devices share that seat | concurrent-device session signal | full-snapshot reconnect and two-device Worker test |
| Remote Config | signed/provider fetch through façade, safe defaults | config version/parse failure | stake rooms default OFF; disable voice/store remotely |
| Admin/provider | root/human only, least privilege, App Check/claims | provider audit logs/readback | revoke/rotate; never expose general user browser in V1 |

## Category rules

- Chips have no transfer, cash-out, prize, exchange, or real-world value.
- VIP cannot improve tile distribution, rule access, score, matchmaking priority, or bot difficulty.
- Purchased-chip stake rooms are compile/runtime feature-flagged OFF for production until documented legal and store classification approval.
- Mock chip rooms settle completed local rounds only; they do not reserve entry chips on join. Any production stake-like room requires a server-authoritative reservation/refund lifecycle, reconnect handling, ledger idempotency, and a separate approval gate.
- Random paid items are excluded from V1.
- Gifts debit the sender through an idempotent `gift_spend` ledger entry and provide the recipient only animation/collection history. Cooldown, hourly/daily caps, block policy, and nonnegative balance are enforced at the authority boundary.
- Local mock gift receipts and settled-match IDs persist only as non-cash demo state so
  remount/replay cannot reset rate limits or double-apply a result. Connected balances and
  blocks remain server-authoritative; local state never authorizes a production wallet write.
- Push payloads may contain only notification type, notification ID, and safe deep-link identifiers; no chat text, rack, balance, or token.
- Marketing never claims guaranteed winnings, favorable odds, income, or gambling equivalence.

## Incident and review readiness

- **Rotation:** provider dashboards/secret stores by the human owner; update local secure config, redeploy only with approval, then read back.
- **Kill switches:** online rooms, chat, voice, store, daily bonus, chip rooms, and social login fail closed to casual offline mode.
- **Deletion:** provider-backed delete job must remove/link-delete account data while retaining only legally required transaction proof; currently a human/provider TODO.
- **Reviewer path:** anonymous → offline casual Classic → settings/safety; store/voice mock states are clearly labelled until real sandbox setup.
- **Privacy evidence:** generated from exact installed SDKs/permissions and verified native build, not this plan.
- **History scan:** required before each release; current repo begins secret-free.

## Current local boundary

The committed Worker is intentionally non-production: `X-Luma-User` is a local test identity, provider feature flags default OFF, and no Cloudflare deployment exists. A production adapter must verify a Firebase ID token at the Worker boundary, derive the user ID from verified claims, reject the client-provided identity header, and pass the verified identity to the room object. This is a release blocker, not optional hardening.

The table chat, voice, purchase and device-policy acceptance proofs are provider-shaped local mocks. They prove filtering/rate/mute/block/report/TTL, permission/PTT/mute/reconnect/no-recording, transaction replay/collision/VIP restore, and one-seat/two-socket reconnect semantics. They do not prove RealtimeKit media, RevenueCat signatures, FCM delivery, or production identity until the separately approved dev projects are connected.
