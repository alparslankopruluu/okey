import { describe, expect, it } from 'vitest';
import { calculateDailyClaim, InMemoryChipLedger } from './economy';
import { MockChatAdapter } from './mock-chat';
import { MockPurchaseAdapter } from './mock-purchases';
import { MockVoiceAdapter } from './mock-voice';

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
    const input = { transactionId: 'tx1', userId: 'u1', productId: 'pocket_glow' as const, createdAt: 1 };
    expect(purchases.processVerifiedWebhook(input)).toEqual({ balance: 5000, duplicate: false });
    expect(purchases.processVerifiedWebhook(input)).toEqual({ balance: 5000, duplicate: true });
    expect(() => purchases.processVerifiedWebhook({ ...input, productId: 'room_glow' })).toThrow(/another ledger payload/);
  });
});

describe('social safety mocks', () => {
  it('rate-limits chat, expires messages, and honors blocks', () => {
    const chat = new MockChatAdapter();
    for (let index = 0; index < 5; index += 1) chat.send({ roomId: 'r1', senderId: 'a', body: `m${String(index)}`, now: index });
    expect(() => chat.send({ roomId: 'r1', senderId: 'a', body: 'six', now: 5 })).toThrow(/rate limit/);
    expect(chat.list('r1', 'viewer', 6)).toHaveLength(5);
    chat.block('viewer', 'a');
    expect(chat.list('r1', 'viewer', 6)).toHaveLength(0);
    expect(chat.list('r1', 'other', 24 * 60 * 60 * 1000 + 10)).toHaveLength(0);
  });

  it('never exposes a voice-recording mode', () => {
    const voice = new MockVoiceAdapter();
    expect(voice.join('granted')).toMatchObject({ joined: true, muted: true, recordingEnabled: false });
    expect(voice.setPushToTalk(true)).toMatchObject({ pushToTalkActive: true, muted: false, recordingEnabled: false });
    expect(voice.join('denied')).toMatchObject({ joined: false, pushToTalkActive: false, recordingEnabled: false });
  });
});
