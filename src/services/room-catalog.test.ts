import { describe, expect, it } from 'vitest';
import { filterRooms, MOCK_ROOMS, roomAccess, roomEconomyMode } from './room-catalog';

describe('mock room catalog', () => {
  it('gates rooms by level before balance and keeps casual rooms free', () => {
    const [casual, , lowStake, highStake] = MOCK_ROOMS;
    if (casual === undefined || lowStake === undefined || highStake === undefined) throw new Error('Expected catalog fixtures');
    expect(roomAccess(highStake, { level: 7, chips: 5000 })).toBe('level');
    expect(roomAccess(lowStake, { level: 7, chips: 50 })).toBe('balance');
    expect(roomAccess(casual, { level: 1, chips: 0 })).toBe('open');
  });

  it('separates free and mock-chip rooms without changing the catalog', () => {
    expect(filterRooms(MOCK_ROOMS, 'casual').every((room) => room.entryChips === 0)).toBe(true);
    expect(filterRooms(MOCK_ROOMS, 'chip').every((room) => room.entryChips > 0)).toBe(true);
    expect(filterRooms(MOCK_ROOMS, 'all')).toHaveLength(MOCK_ROOMS.length);
  });

  it('carries each displayed entry price into its matching mock economy mode', () => {
    expect(MOCK_ROOMS.map((room) => roomEconomyMode(room.entryChips))).toEqual([
      'casual', 'casual', 'mock_stake_100', 'mock_stake_500', 'mock_stake_1000',
    ]);
  });
});
