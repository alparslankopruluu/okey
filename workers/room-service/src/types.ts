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

export interface SocketAttachment {
  readonly userId: string;
}

export type RoomRpcResult =
  | { readonly ok: true; readonly snapshot: RoomSnapshot }
  | { readonly ok: false; readonly code: 'invalid_request' | 'forbidden' | 'room_full' | 'rule_error'; readonly message: string };
