import { createGame, playDeterministicBotRound } from '@luma/game-core';
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

  it('round-trips a wall-exhausted completed round', () => {
    const completed = playDeterministicBotRound(game).state;
    expect(completed.roundEndReason).toBeDefined();
    expect(completed.settlement).toBeDefined();
    expect(decodeOfflineMatch(encodeOfflineMatch(completed), identity)).toEqual(completed);
  });

  it('persists 101 table meld mutations and the final settlement without losing physical tiles', () => {
    const identity101 = offlineMatchIdentity('101', 20260811);
    const initial101 = createGame({ ...identity101, playerIds: ['p0', 'p1', 'p2', 'p3'] });
    const completed = playDeterministicBotRound(initial101).state;
    expect(completed.tableMelds.length).toBeGreaterThan(0);
    expect(completed.settlement).toBeDefined();
    expect(decodeOfflineMatch(encodeOfflineMatch(completed), identity101)).toEqual(completed);
  });

  it('migrates an unopened active v1 snapshot by adding safe v3 defaults without changing the deal', () => {
    const { tableMelds: _tableMelds, discardHistory: _discardHistory, turnContext: _turnContext, ...legacyGame } = game;
    expect(decodeOfflineMatch(JSON.stringify({ version: 1, game: legacyGame }), identity)).toEqual(game);
  });

  it('fails closed for a legacy opened snapshot whose opening mode cannot be recovered', () => {
    const { tableMelds: _tableMelds, discardHistory: _discardHistory, turnContext: _turnContext, ...legacyGame } = game;
    const players = legacyGame.players.map((player, index) => index === 0 ? { ...player, opened: true } : player);
    expect(decodeOfflineMatch(JSON.stringify({ version: 1, game: { ...legacyGame, players } }), identity)).toBeUndefined();
  });

  it('migrates a v2 snapshot with discard ownership and penalty defaults', () => {
    const tile = game.players[0]?.rack[0];
    if (tile === undefined) throw new Error('Expected tile');
    const legacyGame = {
      ...game,
      players: game.players.map(({ penalties: _penalties, ...player }) => ({
        ...player,
        rack: player.rack.filter((candidate) => candidate.id !== tile.id),
      })),
      discards: [tile],
      turnIndex: 1,
      phase: 'awaiting_draw',
    };
    const { discardHistory: _discardHistory, turnContext: _turnContext, ...v2 } = legacyGame;
    const restored = decodeOfflineMatch(JSON.stringify({ version: 2, game: v2 }), identity);
    expect(restored?.discardHistory).toEqual([{ tile, playerId: 'p0', sequence: 1 }]);
    expect(restored?.players.every((player) => player.penalties === 0)).toBe(true);
  });

  it('rejects a completed snapshot whose settlement is missing or inconsistent', () => {
    const completed = playDeterministicBotRound(game).state;
    const missing = { ...completed, settlement: undefined };
    const wrongScore = {
      ...completed,
      settlement: completed.settlement === undefined ? undefined : {
        ...completed.settlement,
        entries: completed.settlement.entries.map((entry, index) => index === 0 ? { ...entry, playerId: 'unknown' } : entry),
      },
    };
    expect(decodeOfflineMatch(JSON.stringify({ version: 2, game: missing }), identity)).toBeUndefined();
    expect(decodeOfflineMatch(JSON.stringify({ version: 2, game: wrongScore }), identity)).toBeUndefined();
  });
});
