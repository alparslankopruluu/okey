export const DAILY_REWARDS = [250, 300, 350, 400, 500, 750, 1000] as const;

export interface DailyState {
  readonly streak: number;
  readonly lastClaimDay?: string;
}

export interface DailyClaimResult extends DailyState {
  readonly lastClaimDay: string;
  readonly reward: number;
  readonly duplicate: boolean;
}

export interface LedgerEntry {
  readonly idempotencyKey: string;
  readonly userId: string;
  readonly amount: number;
  readonly reason: LedgerReason;
  readonly createdAt: number;
}

/**
 * Reasons are intentionally an allow-list: money-like state may only be
 * represented by an append-only ledger entry with one of these purposes.
 */
export type LedgerReason =
  | 'initial_grant'
  | 'daily_bonus'
  | 'purchase'
  | 'cosmetic_spend'
  | 'gift_spend'
  | 'match_stake'
  | 'match_payout'
  | 'match_refund';

function previousCalendarDay(isoDay: string): string {
  const date = new Date(`${isoDay}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Day must use YYYY-MM-DD');
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function calculateDailyClaim(state: DailyState, today: string): DailyClaimResult {
  if (state.lastClaimDay === today) return { streak: state.streak, lastClaimDay: today, reward: 0, duplicate: true };
  const continued = state.lastClaimDay === previousCalendarDay(today);
  const streak = continued ? Math.min(state.streak + 1, DAILY_REWARDS.length) : 1;
  return { streak, lastClaimDay: today, reward: DAILY_REWARDS[streak - 1] ?? DAILY_REWARDS[0], duplicate: false };
}

export class InMemoryChipLedger {
  private readonly entries = new Map<string, LedgerEntry>();

  public append(entry: LedgerEntry): { readonly balance: number; readonly duplicate: boolean } {
    const existing = this.entries.get(entry.idempotencyKey);
    if (existing !== undefined) {
      const same = JSON.stringify(existing) === JSON.stringify(entry);
      if (!same) throw new Error('Idempotency key was reused with another ledger payload');
      return { balance: this.balance(entry.userId), duplicate: true };
    }
    const nextBalance = this.balance(entry.userId) + entry.amount;
    if (!Number.isSafeInteger(entry.amount) || entry.amount === 0) throw new Error('Ledger amount must be a non-zero safe integer');
    if (nextBalance < 0) throw new Error('Chip balance cannot become negative');
    this.entries.set(entry.idempotencyKey, entry);
    return { balance: nextBalance, duplicate: false };
  }

  public balance(userId: string): number {
    return [...this.entries.values()].filter((entry) => entry.userId === userId).reduce((sum, entry) => sum + entry.amount, 0);
  }

  public history(userId: string): readonly LedgerEntry[] {
    return [...this.entries.values()].filter((entry) => entry.userId === userId).sort((left, right) => left.createdAt - right.createdAt);
  }
}
