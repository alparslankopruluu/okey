import { describe, expect, it } from 'vitest';
import { calculateDailyClaim, InMemoryChipLedger } from './economy';
import { MockChatAdapter } from './mock-chat';
import { MockPurchaseAdapter } from './mock-purchases';
import { MockVoiceAdapter } from './mock-voice';
import { GIFT_CATALOG, InMemoryGiftService, nextGiftId } from './gifts';
import { InMemoryFriendshipService } from './mock-social';
import { InMemoryNotificationCenter } from './notifications';
import { LocalGiftAuthority } from './local-gift-authority';

describe('daily bonus', () => {
  it('uses the seven-day schedule, rejects duplicates, and resets a missed streak', () => {
    expect(calculateDailyClaim({ streak: 0 }, '2026-08-01')).toMatchObject({ streak: 1, reward: 250, duplicate: false });
    expect(calculateDailyClaim({ streak: 1, lastClaimDay: '2026-08-01' }, '2026-08-02')).toMatchObject({ streak: 2, reward: 300 });
    expect(calculateDailyClaim({ streak: 2, lastClaimDay: '2026-08-02' }, '2026-08-02')).toMatchObject({ streak: 2, reward: 0, duplicate: true });
    expect(calculateDailyClaim({ streak: 6, lastClaimDay: '2026-08-02' }, '2026-08-04')).toMatchObject({ streak: 1, reward: 250 });
  });
});

describe('chip ledger and purchases', () => {
  it('prevents negative balances and reconciles append-only history', () => {
    const ledger = new InMemoryChipLedger();
    ledger.append({ idempotencyKey: 'grant', userId: 'u1', amount: 5000, reason: 'initial_grant', createdAt: 1 });
    ledger.append({ idempotencyKey: 'spend', userId: 'u1', amount: -750, reason: 'cosmetic_spend', createdAt: 2 });
    expect(ledger.balance('u1')).toBe(4250);
    expect(ledger.history('u1').reduce((sum, entry) => sum + entry.amount, 0)).toBe(4250);
    expect(() => ledger.append({ idempotencyKey: 'overspend', userId: 'u1', amount: -5000, reason: 'cosmetic_spend', createdAt: 3 })).toThrow(/negative/);
  });

  it('makes replayed purchase webhooks idempotent and rejects collisions', () => {
    const ledger = new InMemoryChipLedger();
    const purchases = new MockPurchaseAdapter(ledger);
    const input = { transactionId: 'tx1', userId: 'u1', productId: 'chips_small' as const, createdAt: 1 };
    expect(purchases.processVerifiedWebhook(input)).toEqual({ balance: 5000, duplicate: false, entitlement: null });
    expect(purchases.processVerifiedWebhook(input)).toEqual({ balance: 5000, duplicate: true, entitlement: null });
    expect(() => purchases.processVerifiedWebhook({ ...input, productId: 'chips_large' })).toThrow(/another purchase payload/);
  });

  it('exposes exactly three consumables plus weekly/yearly VIP and restores entitlement', () => {
    const ledger = new InMemoryChipLedger();
    const purchases = new MockPurchaseAdapter(ledger);
    expect(purchases.processVerifiedWebhook({ transactionId: 'vip-1', userId: 'u1', productId: 'vip_weekly', createdAt: 1 }))
      .toEqual({ balance: 0, duplicate: false, entitlement: 'vip' });
    expect(purchases.processVerifiedWebhook({ transactionId: 'vip-1', userId: 'u1', productId: 'vip_weekly', createdAt: 1 }))
      .toEqual({ balance: 0, duplicate: true, entitlement: 'vip' });
    expect(purchases.restore('u1')).toEqual({ entitlement: 'vip' });
    expect(purchases.restore('u2')).toEqual({ entitlement: null });
  });
});

describe('social safety mocks', () => {
  it('filters, rate-limits, mutes, blocks, reports, and expires chat', () => {
    const chat = new MockChatAdapter();
    const first = chat.send({ roomId: 'r1', senderId: 'a', body: 'aptal olma', now: 0 });
    expect(first.body).toBe('••• olma');
    for (let index = 1; index < 5; index += 1) chat.send({ roomId: 'r1', senderId: 'a', body: `m${String(index)}`, now: index });
    expect(() => chat.send({ roomId: 'r1', senderId: 'a', body: 'six', now: 5 })).toThrow(/rate limit/);
    expect(chat.list('r1', 'viewer', 6)).toHaveLength(5);
    chat.mute('viewer', 'a');
    expect(chat.list('r1', 'viewer', 6)).toHaveLength(0);
    chat.unmute('viewer', 'a');
    expect(chat.list('r1', 'viewer', 6)).toHaveLength(5);
    const report = chat.report({ reporterId: 'viewer', messageId: first.id, reason: 'harassment', now: 7 });
    expect(report).toMatchObject({ reporterId: 'viewer', reportedUserId: 'a', reason: 'harassment' });
    expect(chat.report({ reporterId: 'viewer', messageId: first.id, reason: 'harassment', now: 8 })).toEqual(report);
    expect(chat.reportsFor('viewer')).toEqual([report]);
    chat.block('viewer', 'a');
    expect(chat.list('r1', 'viewer', 6)).toHaveLength(0);
    expect(chat.list('r1', 'other', 24 * 60 * 60 * 1000 + 10)).toHaveLength(0);
  });

  it('handles permission, mute, disconnect/reconnect, and never exposes recording', () => {
    const voice = new MockVoiceAdapter();
    expect(voice.join('granted')).toMatchObject({ joined: true, reconnecting: false, muted: true, recordingEnabled: false });
    expect(voice.setPushToTalk(true)).toMatchObject({ pushToTalkActive: true, muted: false, recordingEnabled: false });
    expect(voice.setMuted(true)).toMatchObject({ pushToTalkActive: false, muted: true, recordingEnabled: false });
    expect(voice.disconnect()).toMatchObject({ joined: false, reconnecting: true, muted: true, recordingEnabled: false });
    expect(voice.reconnect()).toMatchObject({ joined: true, reconnecting: false, muted: true, recordingEnabled: false });
    expect(voice.join('denied')).toMatchObject({ joined: false, reconnecting: false, pushToTalkActive: false, recordingEnabled: false });
    expect(voice.reconnect()).toMatchObject({ joined: false, reconnecting: false, recordingEnabled: false });
  });
});

describe('gift economy', () => {
  it('routes the screen-level mock authority through ledger and cooldown policy', () => {
    const authority = new LocalGiftAuthority(5000);
    expect(authority.send({ idempotencyKey: 'screen_1', recipientId: 'p1', giftId: 'coffee', roomId: 'room_1', now: 10_000 })).toMatchObject({ chipCost: 100, duplicate: false });
    expect(authority.balance()).toBe(4900);
    expect(authority.send({ idempotencyKey: 'screen_1', recipientId: 'p1', giftId: 'coffee', roomId: 'room_1', now: 10_000 })).toMatchObject({ duplicate: true });
    expect(authority.balance()).toBe(4900);
    expect(() => authority.send({ idempotencyKey: 'screen_2', recipientId: 'p1', giftId: 'tea', roomId: 'room_1', now: 12_000 })).toThrow(/cooldown/);
  });

  it('preserves gift limits and blocking when the game screen remounts', () => {
    const first = new LocalGiftAuthority(5000);
    const sent = first.send({ idempotencyKey: 'persisted_1', recipientId: 'p1', giftId: 'coffee', roomId: 'room_1', now: 10_000 });
    const history = [{
      id: sent.id, senderId: sent.senderId, recipientId: sent.recipientId, giftId: sent.giftId,
      roomId: sent.roomId, chipCost: sent.chipCost, createdAt: sent.createdAt,
    }];
    const remounted = new LocalGiftAuthority(first.balance(), history, { isBlocked: (_sender, recipient) => recipient === 'p2' });
    expect(() => remounted.send({ idempotencyKey: 'persisted_2', recipientId: 'p1', giftId: 'tea', roomId: 'room_1', now: 12_000 })).toThrow(/cooldown/);
    expect(() => remounted.send({ idempotencyKey: 'persisted_3', recipientId: 'p2', giftId: 'tea', roomId: 'room_1', now: 20_000 })).toThrow(/Blocked/);
  });

  it('allocates a fresh gift id after a screen remount, even in the same millisecond', () => {
    const history = [{ id: 'gift-room_1-10000' }, { id: 'gift-room_1-10000-1' }];
    expect(nextGiftId('room_1', 10_000, history)).toBe('gift-room_1-10000-2');
    expect(nextGiftId('room_1', 20_000, history)).toBe('gift-room_1-20000');
  });

  it('uses the fixed catalog, spends only the sender, and is idempotent', () => {
    expect(GIFT_CATALOG).toEqual([
      { id: 'tea', chipCost: 50 }, { id: 'coffee', chipCost: 100 }, { id: 'chocolate', chipCost: 150 },
      { id: 'rose', chipCost: 250 }, { id: 'prayer_beads', chipCost: 400 }, { id: 'cake', chipCost: 1000 },
    ]);
    const ledger = new InMemoryChipLedger();
    ledger.append({ idempotencyKey: 'grant', userId: 'a', amount: 5000, reason: 'initial_grant', createdAt: 0 });
    const social = new InMemoryFriendshipService();
    const gifts = new InMemoryGiftService(ledger, social);
    expect(gifts.send({ idempotencyKey: 'gift-1', senderId: 'a', recipientId: 'b', giftId: 'tea', roomId: 'room_1', now: 10_000 })).toMatchObject({ chipCost: 50, duplicate: false });
    expect(gifts.send({ idempotencyKey: 'gift-1', senderId: 'a', recipientId: 'b', giftId: 'tea', roomId: 'room_1', now: 10_000 })).toMatchObject({ duplicate: true });
    expect(ledger.balance('a')).toBe(4950);
    expect(ledger.balance('b')).toBe(0);
    expect(() => gifts.send({ idempotencyKey: 'gift-self', senderId: 'a', recipientId: 'a', giftId: 'tea', roomId: 'room_1', now: 20_000 })).toThrow(/yourself/);
    expect(() => gifts.send({ idempotencyKey: 'gift-fast', senderId: 'a', recipientId: 'b', giftId: 'tea', roomId: 'room_1', now: 12_000 })).toThrow(/cooldown/);
  });

  it('honors mutual blocks and daily gift spend caps', () => {
    const ledger = new InMemoryChipLedger();
    ledger.append({ idempotencyKey: 'grant', userId: 'a', amount: 10_000, reason: 'initial_grant', createdAt: 0 });
    const social = new InMemoryFriendshipService();
    social.register({ userId: 'a', username: 'Alice', displayName: 'Alice', now: 0 });
    social.register({ userId: 'b', username: 'Bora', displayName: 'Bora', now: 0 });
    const gifts = new InMemoryGiftService(ledger, social);
    social.block('b', 'a');
    expect(() => gifts.send({ idempotencyKey: 'blocked', senderId: 'a', recipientId: 'b', giftId: 'tea', roomId: 'room_1', now: 10_000 })).toThrow(/Blocked/);
    const openSocial = new InMemoryFriendshipService();
    const capped = new InMemoryGiftService(ledger, openSocial);
    for (let index = 0; index < 5; index += 1) {
      capped.send({ idempotencyKey: `cake-${String(index)}`, senderId: 'a', recipientId: 'b', giftId: 'cake', roomId: 'room_1', now: 20_000 + index * 6_000 });
    }
    expect(() => capped.send({ idempotencyKey: 'too-much', senderId: 'a', recipientId: 'b', giftId: 'tea', roomId: 'room_1', now: 60_000 })).toThrow(/daily/);
  });

  it('allows at most twenty gifts in a rolling hour', () => {
    const ledger = new InMemoryChipLedger();
    ledger.append({ idempotencyKey: 'grant-hour', userId: 'a', amount: 5000, reason: 'initial_grant', createdAt: 0 });
    const gifts = new InMemoryGiftService(ledger, { isBlocked: () => false });
    for (let index = 0; index < 20; index += 1) {
      gifts.send({ idempotencyKey: `hour-${String(index)}`, senderId: 'a', recipientId: 'b', giftId: 'tea', roomId: 'room_1', now: index * 6_000 });
    }
    expect(() => gifts.send({ idempotencyKey: 'hour-20', senderId: 'a', recipientId: 'b', giftId: 'tea', roomId: 'room_1', now: 120_000 })).toThrow(/hourly/);
  });
});

describe('friendships and notifications', () => {
  it('normalizes usernames, hides blocks, and manages friend invitations', () => {
    const social = new InMemoryFriendshipService();
    social.register({ userId: 'a', username: 'Alice_1', displayName: 'Alice', now: 0 });
    social.register({ userId: 'b', username: 'Bora_2', displayName: 'Bora', now: 0 });
    expect(() => social.register({ userId: 'c', username: 'alice_1', displayName: 'Duplicate', now: 0 })).toThrow(/taken/);
    expect(social.search('a', 'bo')).toMatchObject([{ userId: 'b' }]);
    const pending = social.sendRequest('a', 'b', 1);
    expect(social.respondToRequest('b', 'a', true, 2)).toMatchObject({ status: 'accepted' });
    expect(social.inviteToRoom({ senderId: 'a', recipientId: 'b', roomId: 'room_1', now: 3, expiresAt: 4 }).id).toBe('invite_1');
    expect(() => social.renameUsername('a', 'AliceNew', 30 * 24 * 60 * 60 * 1000 - 1)).toThrow(/30 days/);
    expect(social.renameUsername('a', 'AliceNew', 30 * 24 * 60 * 60 * 1000)).toMatchObject({ username: 'AliceNew' });
    expect(pending.status).toBe('pending');
    social.block('a', 'b');
    expect(social.search('a', 'bo')).toHaveLength(0);
    expect(() => social.sendRequest('a', 'b', 5)).toThrow(/Blocked/);
  });

  it('enforces outgoing request limits and lets a recipient reject', () => {
    const social = new InMemoryFriendshipService();
    social.register({ userId: 'sender', username: 'Sender', displayName: 'Sender', now: 0 });
    for (let index = 0; index < 11; index += 1) {
      social.register({ userId: `u${String(index)}`, username: `Player_${String(index)}`, displayName: `Player ${String(index)}`, now: 0 });
    }
    for (let index = 0; index < 10; index += 1) social.sendRequest('sender', `u${String(index)}`, index);
    expect(() => social.sendRequest('sender', 'u10', 10)).toThrow(/hourly/);
    const rejected = new InMemoryFriendshipService();
    rejected.register({ userId: 'a', username: 'Alice', displayName: 'Alice', now: 0 });
    rejected.register({ userId: 'b', username: 'Bora', displayName: 'Bora', now: 0 });
    rejected.sendRequest('a', 'b', 0);
    expect(rejected.respondToRequest('b', 'a', false, 1)).toBeUndefined();
    expect(rejected.sendRequest('a', 'b', 2)).toMatchObject({ status: 'pending' });
  });

  it('keeps notification payloads to safe identifiers and tracks read state', () => {
    const notifications = new InMemoryNotificationCenter();
    const input = { id: 'notice_1', userId: 'a', kind: 'room_invite' as const, deepLink: { screen: 'room' as const, roomId: 'room_1', inviteId: 'invite_1' }, createdAt: 1 };
    notifications.create(input);
    expect(notifications.markRead('a', 'notice_1', 2)).toMatchObject({ readAt: 2 });
    expect(notifications.create(input)).toMatchObject({ readAt: 2 });
    expect(() => notifications.create({ id: 'notice_2', userId: 'a', kind: 'gift_received', deepLink: { screen: 'room', roomId: 'https://unsafe.example' }, createdAt: 1 })).toThrow(/safe identifier/);
  });
});
