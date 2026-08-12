import type { InMemoryChipLedger } from './economy';

export const GIFT_CATALOG = [
  { id: 'tea', chipCost: 50 },
  { id: 'coffee', chipCost: 100 },
  { id: 'chocolate', chipCost: 150 },
  { id: 'rose', chipCost: 250 },
  { id: 'prayer_beads', chipCost: 400 },
  { id: 'cake', chipCost: 1000 },
] as const;

export type GiftId = (typeof GIFT_CATALOG)[number]['id'];

export interface GiftPolicy {
  isBlocked(firstUserId: string, secondUserId: string): boolean;
}

export interface SendGiftInput {
  readonly idempotencyKey: string;
  readonly senderId: string;
  readonly recipientId: string;
  readonly giftId: GiftId;
  readonly roomId: string;
  readonly now: number;
}

export interface GiftReceipt {
  readonly id: string;
  readonly senderId: string;
  readonly recipientId: string;
  readonly giftId: GiftId;
  readonly roomId: string;
  readonly chipCost: number;
  readonly createdAt: number;
  readonly duplicate: boolean;
}

const HOUR_MS = 60 * 60 * 1000;
const COOLDOWN_MS = 5 * 1000;
const DAILY_CAP = 5000;
const HOURLY_CAP = 20;

function utcDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function sameInput(existing: Omit<GiftReceipt, 'duplicate'>, input: SendGiftInput): boolean {
  return existing.senderId === input.senderId
    && existing.recipientId === input.recipientId
    && existing.giftId === input.giftId
    && existing.roomId === input.roomId
    && existing.createdAt === input.now;
}

/** Local/mock authority for social gifts. Recipients never receive a balance credit. */
export class InMemoryGiftService {
  private readonly giftsByKey = new Map<string, Omit<GiftReceipt, 'duplicate'>>();
  private readonly gifts: Omit<GiftReceipt, 'duplicate'>[] = [];

  public constructor(
    private readonly ledger: InMemoryChipLedger,
    private readonly policy: GiftPolicy,
  ) {}

  public send(input: SendGiftInput): GiftReceipt {
    if (!Number.isSafeInteger(input.now) || input.now < 0) throw new Error('Gift time must be a non-negative safe integer');
    const existing = this.giftsByKey.get(input.idempotencyKey);
    if (existing !== undefined) {
      if (!sameInput(existing, input)) throw new Error('Idempotency key was reused with another gift payload');
      return { ...existing, duplicate: true };
    }
    if (input.senderId === input.recipientId) throw new Error('Cannot send a gift to yourself');
    if (this.policy.isBlocked(input.senderId, input.recipientId)) throw new Error('Blocked users cannot send gifts');
    const gift = GIFT_CATALOG.find((candidate) => candidate.id === input.giftId);
    if (gift === undefined) throw new Error('Unknown gift');
    const recent = this.gifts.filter((entry) => entry.senderId === input.senderId && input.now - entry.createdAt < HOUR_MS && entry.createdAt <= input.now);
    if (recent.length >= HOURLY_CAP) throw new Error('Gift hourly rate limit exceeded');
    const todaySpend = this.gifts
      .filter((entry) => entry.senderId === input.senderId && utcDay(entry.createdAt) === utcDay(input.now))
      .reduce((total, entry) => total + entry.chipCost, 0);
    if (todaySpend + gift.chipCost > DAILY_CAP) throw new Error('Gift daily chip limit exceeded');
    const lastGiftAt = this.gifts
      .filter((entry) => entry.senderId === input.senderId && entry.createdAt <= input.now)
      .reduce<number | undefined>((latest, entry) => latest === undefined ? entry.createdAt : Math.max(latest, entry.createdAt), undefined);
    if (lastGiftAt !== undefined && input.now - lastGiftAt < COOLDOWN_MS) throw new Error('Gift cooldown active');

    const ledgerResult = this.ledger.append({
      idempotencyKey: input.idempotencyKey,
      userId: input.senderId,
      amount: -gift.chipCost,
      reason: 'gift_spend',
      createdAt: input.now,
    });
    if (ledgerResult.duplicate) throw new Error('Gift idempotency key is already owned by a ledger entry');
    const receipt = { id: input.idempotencyKey, senderId: input.senderId, recipientId: input.recipientId, giftId: gift.id, roomId: input.roomId, chipCost: gift.chipCost, createdAt: input.now } as const;
    this.giftsByKey.set(input.idempotencyKey, receipt);
    this.gifts.push(receipt);
    return { ...receipt, duplicate: false };
  }

  public historyFor(userId: string): readonly Omit<GiftReceipt, 'duplicate'>[] {
    return this.gifts.filter((gift) => gift.senderId === userId || gift.recipientId === userId);
  }
}
