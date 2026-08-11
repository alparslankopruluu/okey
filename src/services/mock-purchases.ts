import type { InMemoryChipLedger } from './economy';
import type { ProviderStatus } from './contracts';

export const MOCK_PRODUCTS = {
  pocket_glow: 5_000,
  table_glow: 15_000,
  room_glow: 40_000,
} as const;

export class MockPurchaseAdapter {
  public readonly status: ProviderStatus = {
    mode: 'mock',
    ready: true,
    humanTodo: 'Configure RevenueCat, App Store Connect, Google Play products, prices, webhooks, and signing.',
  };

  public constructor(private readonly ledger: InMemoryChipLedger) {}

  public processVerifiedWebhook(input: { transactionId: string; userId: string; productId: keyof typeof MOCK_PRODUCTS; createdAt: number }) {
    return this.ledger.append({
      idempotencyKey: `purchase:${input.transactionId}`,
      userId: input.userId,
      amount: MOCK_PRODUCTS[input.productId],
      reason: 'purchase',
      createdAt: input.createdAt,
    });
  }
}
