import type { GameVariant } from '@luma/game-core';

export type RoomEntry = 0 | 100 | 500 | 1000;
export type MockEconomyMode = 'casual' | 'mock_stake_100' | 'mock_stake_500' | 'mock_stake_1000';

export interface MockRoomSummary {
  readonly id: string;
  readonly variant: GameVariant;
  readonly minLevel: number;
  readonly entryChips: RoomEntry;
  readonly seated: 1 | 2 | 3;
  readonly theme: 'luma' | 'kahvehane';
}

export const MOCK_ROOMS: readonly MockRoomSummary[] = [
  { id: 'pearl-casual', variant: 'classic', minLevel: 1, entryChips: 0, seated: 2, theme: 'luma' },
  { id: 'kahvehane-casual', variant: '101', minLevel: 3, entryChips: 0, seated: 3, theme: 'kahvehane' },
  { id: 'aqua-100', variant: 'classic', minLevel: 5, entryChips: 100, seated: 1, theme: 'luma' },
  { id: 'ceviz-500', variant: '101', minLevel: 10, entryChips: 500, seated: 2, theme: 'kahvehane' },
  { id: 'midnight-1000', variant: '101', minLevel: 20, entryChips: 1000, seated: 3, theme: 'luma' },
] as const;

export function roomAccess(room: MockRoomSummary, player: { readonly level: number; readonly chips: number }): 'open' | 'level' | 'balance' {
  if (player.level < room.minLevel) return 'level';
  if (player.chips < room.entryChips) return 'balance';
  return 'open';
}

export function filterRooms(rooms: readonly MockRoomSummary[], filter: 'all' | 'casual' | 'chip'): MockRoomSummary[] {
  return rooms.filter((room) => filter === 'all' || (filter === 'casual' ? room.entryChips === 0 : room.entryChips > 0));
}

export function roomEconomyMode(entryChips: RoomEntry): MockEconomyMode {
  if (entryChips === 0) return 'casual';
  return `mock_stake_${String(entryChips)}` as MockEconomyMode;
}
