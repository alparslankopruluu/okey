import type { InMemoryChipLedger } from './economy';
import type { ProviderStatus } from './contracts';

export const MOCK_PRODUCTS = {
  chips_small: { kind: 'consumable', chips: 5_000 },
  chips_medium: { kind: 'consumable', chips: 15_000 },
  chips_large: { kind: 'consumable', chips: 40_000 },
  vip_weekly: { kind: 'subscription', entitlement: 'vip' },
  vip_yearly: { kind: 'subscription', entitlement: 'vip' },
} as const;

type ProductId = keyof typeof MOCK_PRODUCTS;
type PurchaseInput = { transactionId: string; userId: string; productId: ProductId; createdAt: number };

interface PurchaseResult {
  readonly balance: number;
  readonly duplicate: boolean;
  readonly entitlement: 'vip' | null;
}

export class MockPurchaseAdapter {
  public readonly status: ProviderStatus = {
    mode: 'mock',
    ready: true,
    humanTodo: 'Configure RevenueCat, App Store Connect, Google Play products, prices, webhooks, and signing.',
  };

  private readonly transactions = new Map<string, PurchaseInput>();
  private readonly vipUsers = new Set<string>();

  public constructor(private readonly ledger: InMemoryChipLedger) {}

  public processVerifiedWebhook(input: PurchaseInput): PurchaseResult {
    const existing = this.transactions.get(input.transactionId);
    if (existing !== undefined) {
      if (JSON.stringify(existing) !== JSON.stringify(input)) throw new Error('Transaction ID was reused with another purchase payload');
      return { balance: this.ledger.balance(input.userId), duplicate: true, entitlement: this.vipUsers.has(input.userId) ? 'vip' : null };
    }
    const product = MOCK_PRODUCTS[input.productId];
    if (product.kind === 'consumable') {
      const result = this.ledger.append({
        idempotencyKey: `purchase:${input.transactionId}`,
        userId: input.userId,
        amount: product.chips,
        reason: 'purchase',
        createdAt: input.createdAt,
      });
      this.transactions.set(input.transactionId, input);
      return { ...result, entitlement: this.vipUsers.has(input.userId) ? 'vip' : null };
    }
    this.transactions.set(input.transactionId, input);
    this.vipUsers.add(input.userId);
    return { balance: this.ledger.balance(input.userId), duplicate: false, entitlement: 'vip' };
  }

  public restore(userId: string): { readonly entitlement: 'vip' | null } {
    return { entitlement: this.vipUsers.has(userId) ? 'vip' : null };
  }
}
