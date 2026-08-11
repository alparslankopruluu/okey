import { createGame } from '@luma/game-core';
import { describe, expect, it } from 'vitest';
import { decodeOfflineMatch, encodeOfflineMatch, offlineMatchIdentity } from './offline-match';

const identity = offlineMatchIdentity('classic', 42);
const game = createGame({ ...identity, playerIds: ['p0', 'p1', 'p2', 'p3'] });

describe('offline match persistence', () => {
  it('round-trips the versioned match envelope', () => {
    expect(decodeOfflineMatch(encodeOfflineMatch(game), identity)).toEqual(game);
  });

  it('accepts the initial unversioned snapshot and rejects another match identity', () => {
    expect(decodeOfflineMatch(JSON.stringify(game), identity)).toEqual(game);
    expect(decodeOfflineMatch(JSON.stringify(game), offlineMatchIdentity('classic', 43))).toBeUndefined();
  });

  it('rejects corrupt JSON and tile duplication', () => {
    expect(decodeOfflineMatch('{', identity)).toBeUndefined();
    const duplicate = { ...game, wall: [game.indicatorTile, ...game.wall.slice(1)] };
    expect(decodeOfflineMatch(JSON.stringify(duplicate), identity)).toBeUndefined();
  });
});
