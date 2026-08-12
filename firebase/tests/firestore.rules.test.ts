import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let environment: RulesTestEnvironment;

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-luma-okey',
    firestore: { rules: await readFile(resolve('firebase/firestore.rules'), 'utf8') },
  });
});
beforeEach(async () => environment.clearFirestore());
afterAll(async () => environment.cleanup());

async function seed(path: string, data: Record<string, unknown>): Promise<void> {
  await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), path), data));
}

describe('Luma social and economy Firestore boundary', () => {
  it('allows a user to read only their profile and update only safe profile fields', async () => {
    await seed('users/alice', { displayName: 'Alice', username: 'alice_1', usernameNormalized: 'alice_1', avatarId: '1', visibility: 'friends' });
    const alice = environment.authenticatedContext('alice').firestore();
    const bob = environment.authenticatedContext('bob').firestore();
    await assertSucceeds(getDoc(doc(alice, 'users/alice')));
    await assertFails(getDoc(doc(bob, 'users/alice')));
    await assertSucceeds(updateDoc(doc(alice, 'users/alice'), { avatarId: '2' }));
    await assertFails(updateDoc(doc(alice, 'users/alice'), { usernameNormalized: 'stolen' }));
    await assertSucceeds(setDoc(doc(bob, 'users/bob'), { displayName: 'Bob', avatarId: '2', visibility: 'friends' }));
    await assertFails(setDoc(doc(environment.authenticatedContext('mallory').firestore(), 'users/mallory'), { displayName: 'Mallory', username: 'alice_1', usernameNormalized: 'alice_1' }));
  });

  it('keeps usernames, wallet ledger, gift receipts, devices, and notification creation server-only', async () => {
    await seed('users/alice', { displayName: 'Alice', usernameNormalized: 'alice_1' });
    const alice = environment.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(alice, 'usernames/alice_1'), { uid: 'alice' }));
    await assertFails(setDoc(doc(alice, 'chipLedger/entry'), { amount: 100 }));
    await assertFails(setDoc(doc(alice, 'giftReceipts/gift'), { chipCost: 50 }));
    await assertFails(setDoc(doc(alice, 'users/alice/devices/install'), { token: 'secret' }));
    await assertFails(setDoc(doc(alice, 'users/alice/notifications/n1'), { type: 'friend_request' }));
  });

  it('lets friendship members read but never client-write friendship state', async () => {
    await seed('friendships/alice_bob', { members: ['alice', 'bob'], requesterId: 'alice', recipientId: 'bob', status: 'pending' });
    await assertSucceeds(getDoc(doc(environment.authenticatedContext('alice').firestore(), 'friendships/alice_bob')));
    await assertFails(getDoc(doc(environment.authenticatedContext('mallory').firestore(), 'friendships/alice_bob')));
    await assertFails(deleteDoc(doc(environment.authenticatedContext('alice').firestore(), 'friendships/alice_bob')));
  });

  it('permits notification owner read/readAt only and rejects another user', async () => {
    await seed('users/alice/notifications/n1', { type: 'room_invite', readAt: null, roomId: 'room_1' });
    const aliceRef = doc(environment.authenticatedContext('alice').firestore(), 'users/alice/notifications/n1');
    await assertSucceeds(getDoc(aliceRef));
    await assertSucceeds(updateDoc(aliceRef, { readAt: 123 }));
    await assertFails(updateDoc(aliceRef, { roomId: 'room_2' }));
    await assertFails(getDoc(doc(environment.authenticatedContext('bob').firestore(), 'users/alice/notifications/n1')));
  });
});
