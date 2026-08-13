import { InMemoryChipLedger } from './economy';
import { InMemoryGiftService, type GiftId, type GiftPolicy, type GiftReceipt } from './gifts';

const LOCAL_USER_ID = 'p0';
const INITIAL_GRANT_KEY = 'local-initial-grant';

/**
 * Process-local mock authority used only while provider flags are disabled.
 * It deliberately routes every gift through the same ledger, cooldown, rate,
 * block and idempotency policy exercised by service tests.
 */
export class LocalGiftAuthority {
  private readonly ledger = new InMemoryChipLedger();
  private readonly gifts: InMemoryGiftService;

  public constructor(
    initialBalance = 5000,
    history: readonly Omit<GiftReceipt, 'duplicate'>[] = [],
    policy: GiftPolicy = { isBlocked: () => false },
  ) {
    this.ledger.append({
      idempotencyKey: INITIAL_GRANT_KEY,
      userId: LOCAL_USER_ID,
      amount: initialBalance,
      reason: 'initial_grant',
      createdAt: 0,
    });
    this.gifts = new InMemoryGiftService(this.ledger, policy, history);
  }

  public send(input: {
    readonly idempotencyKey: string;
    readonly recipientId: string;
    readonly giftId: GiftId;
    readonly roomId: string;
    readonly now: number;
  }): GiftReceipt {
    return this.gifts.send({ ...input, senderId: LOCAL_USER_ID });
  }

  public balance(): number {
    return this.ledger.balance(LOCAL_USER_ID);
  }
}
