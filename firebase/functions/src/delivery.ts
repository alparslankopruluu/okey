import type { BatchResponse } from 'firebase-admin/messaging';
import { assertSafeId } from './policies.js';

export const PUSH_TYPES = ['friend_request', 'friend_accepted', 'room_invite', 'gift_received'] as const;
export type PushType = (typeof PUSH_TYPES)[number];

export interface PushEnvelope {
  readonly type: PushType;
  readonly notificationId: string;
  readonly deepLinkId: string;
}

export function notificationEnvelope(notificationId: string, data: Record<string, unknown>): PushEnvelope {
  assertSafeId(notificationId);
  const type = String(data.type ?? '');
  if (!PUSH_TYPES.includes(type as PushType)) throw new Error('invalid_push_type');
  const deepLinkId = String(data.friendshipId ?? data.inviteId ?? data.giftId ?? '');
  assertSafeId(deepLinkId);
  return { type: type as PushType, notificationId, deepLinkId };
}

export function invalidTokensFromBatch(tokens: readonly string[], response: BatchResponse): readonly string[] {
  return response.responses.flatMap((item, index) => {
    const code = item.error?.code;
    return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token'
      ? [tokens[index] ?? '']
      : [];
  }).filter((token) => token.length > 0);
}

export function verifiedGiftBridgeRequest(input: {
  readonly receiptId: string;
  readonly receipt: Record<string, unknown>;
  readonly bridgeBaseUrl: string;
  readonly bridgeToken: string;
}): { readonly url: string; readonly init: RequestInit } {
  const base = new URL(input.bridgeBaseUrl);
  if (base.protocol !== 'https:' && base.hostname !== '127.0.0.1' && base.hostname !== 'localhost') throw new Error('gift_bridge_requires_https');
  const receipt = input.receipt;
  const roomId = String(receipt.roomId ?? '');
  assertSafeId(input.receiptId); assertSafeId(roomId);
  const url = new URL(`/internal/v1/rooms/${roomId}/gift-receipts`, base);
  return {
    url: url.toString(),
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.bridgeToken}` },
      body: JSON.stringify({ receiptId: input.receiptId, ...receipt }),
    },
  };
}
