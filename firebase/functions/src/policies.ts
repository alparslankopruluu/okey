export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
export const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
export const GIFT_COSTS = { tea: 50, coffee: 100, chocolate: 150, rose: 250, prayer_beads: 400, cake: 1000 } as const;
export const USERNAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeUsername(username: string): string {
  if (!USERNAME_PATTERN.test(username)) throw new Error('invalid_username');
  return username.toLowerCase();
}

export function friendshipPairId(first: string, second: string): string {
  if (!SAFE_ID_PATTERN.test(first) || !SAFE_ID_PATTERN.test(second) || first === second) throw new Error('invalid_pair');
  return [first, second].sort().join('_');
}

export function assertSafeId(value: string): void {
  if (!SAFE_ID_PATTERN.test(value)) throw new Error('invalid_identifier');
}

export function giftCost(giftId: string): number {
  const cost = GIFT_COSTS[giftId as keyof typeof GIFT_COSTS];
  if (cost === undefined) throw new Error('unknown_gift');
  return cost;
}

export function assertUsernameChangeAllowed(previousChangedAt: number | undefined, now: number): void {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('invalid_time');
  if (previousChangedAt !== undefined && now - previousChangedAt < USERNAME_CHANGE_COOLDOWN_MS) throw new Error('username_change_cooldown');
}

export interface GiftReceiptShape {
  readonly senderId: string;
  readonly recipientId: string;
  readonly giftId: string;
  readonly roomId: string;
}

export function sameGiftReceipt(first: GiftReceiptShape, second: GiftReceiptShape): boolean {
  return first.senderId === second.senderId
    && first.recipientId === second.recipientId
    && first.giftId === second.giftId
    && first.roomId === second.roomId;
}

export function assertGiftBalance(balance: number, cost: number): void {
  if (!Number.isSafeInteger(balance) || balance < 0 || !Number.isSafeInteger(cost) || cost <= 0 || balance < cost) throw new Error('insufficient_chips');
}

export interface GiftRateState {
  readonly lastGiftAt?: number;
  readonly recentTimes: readonly number[];
  readonly day: string;
  readonly daySpend: number;
}

export function nextGiftRate(state: GiftRateState | undefined, now: number, cost: number): GiftRateState {
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('invalid_time');
  const day = new Date(now).toISOString().slice(0, 10);
  const recentTimes = (state?.recentTimes ?? []).filter((time) => time <= now && now - time < 3_600_000);
  if (state?.lastGiftAt !== undefined && now - state.lastGiftAt < 5_000) throw new Error('gift_cooldown');
  if (recentTimes.length >= 20) throw new Error('gift_hourly_limit');
  const daySpend = state?.day === day ? state.daySpend : 0;
  if (daySpend + cost > 5_000) throw new Error('gift_daily_limit');
  return { lastGiftAt: now, recentTimes: [...recentTimes, now], day, daySpend: daySpend + cost };
}
