import type { GameCommand, GameState, GameVariant } from '@luma/game-core';
import type { RoomSession } from './room-session';

export interface Env {
  ROOMS: DurableObjectNamespace<RoomSession>;
}

export interface RoomSnapshot {
  readonly roomId: string;
  readonly state: GameState;
  readonly seats: Readonly<Record<string, string>>;
  readonly updatedAt: number;
}

export interface CreateRoomInput {
  readonly roomId: string;
  readonly hostUserId: string;
  readonly variant: GameVariant;
  readonly seed: number;
}

export interface SubmitCommandInput {
  readonly userId: string;
  readonly command: GameCommand;
}

export interface VerifiedGiftReceipt {
  readonly receiptId: string;
  readonly roomId: string;
  readonly senderId: string;
  readonly recipientId: string;
  readonly giftId: 'tea' | 'coffee' | 'chocolate' | 'rose' | 'prayer_beads' | 'cake';
  readonly chipCost: 50 | 100 | 150 | 250 | 400 | 1000;
  readonly createdAt: number;
}

export interface GiftPublishResult {
  readonly published: boolean;
  readonly receipt: VerifiedGiftReceipt;
}

export type GiftPublishRpcResult =
  | { readonly ok: true; readonly result: GiftPublishResult }
  | { readonly ok: false; readonly message: string };

export interface SocketAttachment {
  readonly userId: string;
}

export type RoomRpcResult =
  | { readonly ok: true; readonly snapshot: RoomSnapshot }
  | { readonly ok: false; readonly code: 'invalid_request' | 'forbidden' | 'room_full' | 'rule_error'; readonly message: string };
