import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { assertGiftBalance, assertSafeId, assertUsernameChangeAllowed, friendshipPairId, giftCost, nextGiftRate, normalizeUsername, sameGiftReceipt } from './policies.js';

initializeApp();
const db = getFirestore();

function uid(request: { readonly auth?: { readonly uid: string } }): string {
  if (request.auth === undefined) throw new HttpsError('unauthenticated', 'Authentication required');
  return request.auth.uid;
}

export const reserveUsername = onCall({ enforceAppCheck: true }, async (request) => {
  const userId = uid(request);
  const username = String(request.data?.username ?? '');
  const normalized = normalizeUsername(username);
  const now = Date.now();
  await db.runTransaction(async (transaction) => {
    const usernameRef = db.doc(`usernames/${normalized}`);
    const profileRef = db.doc(`users/${userId}`);
    const [target, profile] = await Promise.all([transaction.get(usernameRef), transaction.get(profileRef)]);
    const currentNormalized = String(profile.data()?.usernameNormalized ?? '');
    if (currentNormalized === normalized && target.data()?.uid === userId) return;
    if (target.exists) throw new HttpsError('already-exists', 'Username unavailable');
    try { assertUsernameChangeAllowed(profile.data()?.usernameChangedAt as number | undefined, now); }
    catch { throw new HttpsError('failed-precondition', 'Username can change once every 30 days'); }
    if (currentNormalized.length > 0) transaction.delete(db.doc(`usernames/${currentNormalized}`));
    transaction.create(usernameRef, { uid: userId, createdAt: FieldValue.serverTimestamp() });
    transaction.set(profileRef, { username, usernameNormalized: normalized, usernameChangedAt: now, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return { username, normalized };
});

export const searchUsers = onCall({ enforceAppCheck: true }, async (request) => {
  const viewerId = uid(request);
  const prefix = normalizeUsername(String(request.data?.query ?? ''));
  const blocked = await db.collection('blocks').where('members', 'array-contains', viewerId).get();
  const hidden = new Set(blocked.docs.flatMap((doc) => (doc.data().members as string[] | undefined) ?? []));
  const snapshot = await db.collection('users').orderBy('usernameNormalized').startAt(prefix).endAt(`${prefix}\uf8ff`).limit(20).get();
  return snapshot.docs.filter((doc) => doc.id !== viewerId && !hidden.has(doc.id)).map((doc) => ({ uid: doc.id, username: doc.data().username, displayName: doc.data().displayName, avatarId: doc.data().avatarId }));
});

export const sendFriendRequest = onCall({ enforceAppCheck: true }, async (request) => {
  const requesterId = uid(request);
  const recipientId = String(request.data?.recipientId ?? '');
  const pairId = friendshipPairId(requesterId, recipientId);
  const pairRef = db.doc(`friendships/${pairId}`);
  const blockRef = db.doc(`blocks/${pairId}`);
  const rateRef = db.doc(`friendRequestRate/${requesterId}`);
  await db.runTransaction(async (transaction) => {
    const [pair, rate, block] = await Promise.all([transaction.get(pairRef), transaction.get(rateRef), transaction.get(blockRef)]);
    if (block.exists) throw new HttpsError('permission-denied', 'Blocked users cannot connect');
    if (pair.exists) throw new HttpsError('already-exists', 'Friendship exists');
    const now = Date.now();
    const times = ((rate.data()?.times as number[] | undefined) ?? []).filter((time) => now - time < 86_400_000 && time <= now);
    if (times.filter((time) => now - time < 3_600_000).length >= 10 || times.length >= 50) throw new HttpsError('resource-exhausted', 'Friend request limit');
    transaction.set(rateRef, { times: [...times, now] });
    transaction.create(pairRef, { members: [requesterId, recipientId], requesterId, recipientId, status: 'pending', createdAt: FieldValue.serverTimestamp() });
    transaction.create(db.doc(`users/${recipientId}/notifications/${pairId}`), { type: 'friend_request', actorId: requesterId, friendshipId: pairId, createdAt: now, readAt: null });
  });
  return { pairId };
});

export const respondFriendRequest = onCall({ enforceAppCheck: true }, async (request) => {
  const recipientId = uid(request);
  const requesterId = String(request.data?.requesterId ?? '');
  const accept = request.data?.accept === true;
  const ref = db.doc(`friendships/${friendshipPairId(requesterId, recipientId)}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists || snapshot.data()?.recipientId !== recipientId || snapshot.data()?.status !== 'pending') throw new HttpsError('not-found', 'Pending request unavailable');
    if (accept) {
      transaction.update(ref, { status: 'accepted', respondedAt: FieldValue.serverTimestamp() });
      transaction.create(db.doc(`users/${requesterId}/notifications/${friendshipPairId(requesterId, recipientId)}_accepted`), { type: 'friend_accepted', actorId: recipientId, friendshipId: friendshipPairId(requesterId, recipientId), createdAt: Date.now(), readAt: null });
    }
    else transaction.delete(ref);
  });
  return { accepted: accept };
});

export const removeFriend = onCall({ enforceAppCheck: true }, async (request) => {
  const caller = uid(request);
  const other = String(request.data?.userId ?? '');
  await db.doc(`friendships/${friendshipPairId(caller, other)}`).delete();
  return { removed: true };
});

export const blockUser = onCall({ enforceAppCheck: true }, async (request) => {
  const caller = uid(request);
  const other = String(request.data?.userId ?? '');
  const pairId = friendshipPairId(caller, other);
  const batch = db.batch();
  batch.set(db.doc(`blocks/${pairId}`), { members: [caller, other], blockedBy: caller, createdAt: FieldValue.serverTimestamp() });
  batch.delete(db.doc(`friendships/${pairId}`));
  await batch.commit();
  return { blocked: true };
});

export const registerDevice = onCall({ enforceAppCheck: true }, async (request) => {
  const userId = uid(request);
  const installationId = String(request.data?.installationId ?? '');
  const token = String(request.data?.token ?? '');
  assertSafeId(installationId);
  if (token.length < 20 || token.length > 4096) throw new HttpsError('invalid-argument', 'Invalid token');
  await db.doc(`users/${userId}/devices/${installationId}`).set({ token, platform: request.data?.platform, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { registered: true };
});

export const inviteToRoom = onCall({ enforceAppCheck: true }, async (request) => {
  const senderId = uid(request);
  const recipientId = String(request.data?.recipientId ?? '');
  const roomId = String(request.data?.roomId ?? '');
  assertSafeId(roomId);
  const pair = await db.doc(`friendships/${friendshipPairId(senderId, recipientId)}`).get();
  if (!pair.exists || pair.data()?.status !== 'accepted') throw new HttpsError('permission-denied', 'Friends only');
  const invite = db.collection('roomInvites').doc();
  await invite.set({ senderId, recipientId, roomId, createdAt: FieldValue.serverTimestamp(), expiresAt: Date.now() + 3_600_000 });
  await db.doc(`users/${recipientId}/notifications/${invite.id}`).set({ type: 'room_invite', actorId: senderId, roomId, inviteId: invite.id, createdAt: Date.now(), readAt: null });
  return { inviteId: invite.id };
});

export const spendGift = onCall({ enforceAppCheck: true }, async (request) => {
  const senderId = uid(request);
  const recipientId = String(request.data?.recipientId ?? '');
  const giftId = String(request.data?.giftId ?? '');
  const roomId = String(request.data?.roomId ?? '');
  const idempotencyKey = String(request.data?.idempotencyKey ?? '');
  assertSafeId(roomId); assertSafeId(idempotencyKey);
  if (senderId === recipientId) throw new HttpsError('invalid-argument', 'No self gift');
  const cost = giftCost(giftId);
  const receiptRef = db.doc(`giftReceipts/${idempotencyKey}`);
  const walletRef = db.doc(`wallets/${senderId}`);
  const blockRef = db.doc(`blocks/${friendshipPairId(senderId, recipientId)}`);
  const rateRef = db.doc(`giftRate/${senderId}`);
  const now = Date.now();
  const receipt = await db.runTransaction(async (transaction) => {
    const [existing, wallet, block, rate] = await Promise.all([transaction.get(receiptRef), transaction.get(walletRef), transaction.get(blockRef), transaction.get(rateRef)]);
    if (existing.exists) {
      const data = existing.data();
      if (data === undefined) throw new HttpsError('internal', 'Stored receipt is unavailable');
      if (!sameGiftReceipt(data as never, { senderId, recipientId, giftId, roomId })) throw new HttpsError('already-exists', 'Idempotency conflict');
      return data;
    }
    if (block.exists) throw new HttpsError('permission-denied', 'Blocked users cannot exchange gifts');
    const balance = Number(wallet.data()?.balance ?? 0);
    try { assertGiftBalance(balance, cost); } catch { throw new HttpsError('failed-precondition', 'Insufficient chips'); }
    let rateState;
    try { rateState = nextGiftRate(rate.data() as never, now, cost); } catch (error) { throw new HttpsError('resource-exhausted', error instanceof Error ? error.message : 'Gift rate limit'); }
    const data = { senderId, recipientId, giftId, roomId, chipCost: cost, createdAt: now };
    transaction.update(walletRef, { balance: balance - cost, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(rateRef, rateState);
    transaction.create(db.collection('chipLedger').doc(idempotencyKey), { userId: senderId, amount: -cost, reason: 'gift_spend', createdAt: now });
    transaction.create(receiptRef, data);
    transaction.create(db.doc(`users/${recipientId}/notifications/${idempotencyKey}`), { type: 'gift_received', actorId: senderId, roomId, giftId, createdAt: now, readAt: null });
    return data;
  });
  return receipt;
});

export async function removeStaleTokens(tokens: readonly string[], invalidTokens: readonly string[]): Promise<number> {
  const invalid = new Set(invalidTokens);
  const matching = await db.collectionGroup('devices').where('token', 'in', tokens.slice(0, 30)).get();
  const batch = db.batch(); let count = 0;
  for (const doc of matching.docs) if (invalid.has(String(doc.data().token))) { batch.delete(doc.ref); count += 1; }
  if (count > 0) await batch.commit();
  return count;
}

export async function sendPush(tokens: readonly string[], type: string, notificationId: string, deepLinkId: string): Promise<void> {
  await getMessaging().sendEachForMulticast({ tokens: [...tokens], data: { type, notificationId, deepLinkId } });
}
