# Data model — Firestore

*Living doc. Every collection, its access rules in one line, and its indexes. Update with EVERY schema/rules/index change, then deploy (`docs/playbooks/firebase.md`).*

## Collections

| Collection | Doc shape (key fields) | Client access | Written by |
|---|---|---|---|
| `users/{uid}` | displayName, username, usernameNormalized, avatarId, visibility, timestamps | own read; safe profile-field create/update only | client + callable |
| `usernames/{normalized}` | uid, createdAt | none | `reserveUsername` transaction |
| `friendships/{pairId}` | members, requesterId, recipientId, pending/accepted, timestamps | pair members read only | friend callables |
| `blocks/{pairId}` | members, blockedBy, createdAt | none | `blockUser` callable |
| `users/{uid}/devices/{installationId}` | FCM token, platform, updatedAt | owner read; no client write | `registerDevice` callable |
| `users/{uid}/notifications/{id}` | type, actor/safe deep-link IDs, createdAt, readAt | owner read; owner may update only readAt | callables/server send path |
| `roomInvites/{id}` | senderId, recipientId, roomId, expiry | recipient read only | `inviteToRoom` callable |
| `wallets/{uid}` | derived balance, updatedAt | none | server transaction only |
| `chipLedger/{entryId}` | userId, amount, reason, createdAt | none | server transaction only |
| `giftReceipts/{idempotencyKey}` | senderId, recipientId, giftId, roomId, chipCost, createdAt | none | `spendGift` transaction |
| `giftRate/{uid}` / `friendRequestRate/{uid}` | bounded server rate state | none | callables only |

## Security rules summary

- Root: deny-by-default (`match /{document=**} { allow read, write: if false; }`)
- `users/{uid}`: `request.auth.uid == uid`; username ownership never changes through direct client writes.
- friendships are readable only by members; invites only by recipients; notifications only by owners.
- Server-only collections: no client write rules exist at all

## Indexes

| Collection | Fields | Why |
|---|---|---|

## Cloud Functions

| Function | Trigger | Purpose |
|---|---|---|
| `reserveUsername` | callable + App Check | transactionally own a normalized username |
| `searchUsers` | callable + App Check | safe max-20 prefix search with block filtering |
| `sendFriendRequest` / `respondFriendRequest` / `removeFriend` / `blockUser` | callable + App Check | authoritative friendship state and request limits |
| `registerDevice` | callable + App Check | server-owned FCM token metadata; token is never returned/logged |
| `inviteToRoom` | callable + App Check | friend-only expiring room invitation + notification |
| `spendGift` | callable + App Check | block/rate/balance/idempotency transaction and gift receipt |

All callables are source-only until the exact Firebase project/config/deploy mutation is separately approved and read back. No `.firebaserc`, native provider config, or credential is committed.
