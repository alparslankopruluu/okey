import { describe, expect, it } from 'vitest';
import { assertGiftBalance, assertSafeId, assertUsernameChangeAllowed, friendshipPairId, giftCost, nextGiftRate, normalizeUsername, sameGiftReceipt } from './policies.js';

describe('Firebase callable policy helpers', () => {
  it('normalizes valid usernames and rejects invalid input', () => {
    expect(normalizeUsername('Luma_101')).toBe('luma_101');
    expect(() => normalizeUsername('ab')).toThrow('invalid_username');
    expect(() => normalizeUsername('luma-okey')).toThrow('invalid_username');
  });
  it('enforces gift cooldown, hourly count, and daily spend', () => {
    expect(nextGiftRate(undefined, 10_000, 50)).toMatchObject({ daySpend: 50, recentTimes: [10_000] });
    expect(() => nextGiftRate({ lastGiftAt: 10_000, recentTimes: [10_000], day: '1970-01-01', daySpend: 50 }, 12_000, 50)).toThrow('gift_cooldown');
    expect(() => nextGiftRate({ recentTimes: Array.from({ length: 20 }, (_, index) => 20_000 + index), day: '1970-01-01', daySpend: 1000 }, 30_000, 50)).toThrow('gift_hourly_limit');
    expect(() => nextGiftRate({ recentTimes: [], day: '1970-01-01', daySpend: 4900 }, 40_000, 150)).toThrow('gift_daily_limit');
  });
  it('creates a stable pair ID and rejects self-pairs', () => {
    expect(friendshipPairId('bob', 'alice')).toBe('alice_bob');
    expect(() => friendshipPairId('alice', 'alice')).toThrow('invalid_pair');
  });
  it('uses the fixed gift catalog and safe identifiers', () => {
    expect(giftCost('cake')).toBe(1000);
    expect(() => giftCost('cash')).toThrow('unknown_gift');
    expect(() => assertSafeId('../secret')).toThrow('invalid_identifier');
  });
  it('enforces the 30-day username cooldown', () => {
    const now = Date.UTC(2026, 7, 12);
    expect(() => assertUsernameChangeAllowed(undefined, now)).not.toThrow();
    expect(() => assertUsernameChangeAllowed(now - 29 * 86_400_000, now)).toThrow('username_change_cooldown');
    expect(() => assertUsernameChangeAllowed(now - 30 * 86_400_000, now)).not.toThrow();
  });
  it('rejects negative/insufficient balances and detects receipt replay conflicts', () => {
    expect(() => assertGiftBalance(100, 100)).not.toThrow();
    expect(() => assertGiftBalance(49, 50)).toThrow('insufficient_chips');
    expect(() => assertGiftBalance(-1, 50)).toThrow('insufficient_chips');
    const receipt = { senderId: 'alice', recipientId: 'bob', giftId: 'tea', roomId: 'room_1' };
    expect(sameGiftReceipt(receipt, { ...receipt })).toBe(true);
    expect(sameGiftReceipt(receipt, { ...receipt, recipientId: 'mallory' })).toBe(false);
  });
});
