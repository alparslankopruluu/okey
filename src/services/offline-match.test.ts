import { createGame, createMatchRound, playDeterministicBotRound, recordMatchRound } from '@luma/game-core';
import { describe, expect, it } from 'vitest';
import { createOfflineMatchSession, decodeOfflineMatch, decodeOfflineMatchSession, encodeOfflineMatch, encodeOfflineMatchSession, offlineMatchIdentity } from './offline-match';

const identity = offlineMatchIdentity('classic', 42);
const game = createGame({ ...identity, playerIds: ['p0', 'p1', 'p2', 'p3'] });

describe('offline match persistence', () => {
  it('round-trips a v4 multi-round session and advances the dealer after reload', () => {
    const session = createOfflineMatchSession(identity, { roundCount: 2 });
    const completedRound = playDeterministicBotRound(session.currentRound).state;
    if (completedRound.settlement === undefined) throw new Error('Expected settlement');
    const match = recordMatchRound(session.match, completedRound.settlement);
    const completedSession = { match, currentRound: completedRound, completedRoundStates: [completedRound] };
    expect(decodeOfflineMatchSession(encodeOfflineMatchSession(completedSession), identity)).toEqual(completedSession);
    const nextRound = createMatchRound(match);
    expect(nextRound.dealerIndex).toBe(1);
  });

  it('records progressive opening evidence but resets a new round to 101/5', () => {
    const identity101 = offlineMatchIdentity('101', 10142);
    const session = createOfflineMatchSession(identity101, { roundCount: 2, openingThresholdMode: 'progressive' });
    const completedRound = playDeterministicBotRound(session.currentRound).state;
    if (completedRound.settlement === undefined) throw new Error('Expected settlement');
    const match = recordMatchRound(session.match, completedRound.settlement, { seriesPoints: 104 });
    const nextRound = createMatchRound(match);
    expect(nextRound).toMatchObject({ dealerIndex: 1, rules: { openingPoints101: 101, pairsRequiredToOpen101: 5, progressiveOpening101: true } });
    const active = { match, currentRound: nextRound, completedRoundStates: [completedRound] };
    expect(decodeOfflineMatchSession(encodeOfflineMatchSession(active), identity101)).toEqual(active);
  });

  it('migrates a valid v3 game into a one-round v4 session', () => {
    const migrated = decodeOfflineMatchSession(encodeOfflineMatch(game), identity);
    expect(migrated?.match.config.roundCount).toBe(1);
    expect(migrated?.currentRound).toMatchObject({ gameId: `${identity.gameId}:round:1`, dealerIndex: 0 });
  });

  it('rejects tampered v4 cumulative totals and config/round mismatch', () => {
    const session = createOfflineMatchSession(identity, { roundCount: 2 });
    const tampered = { ...session, match: { ...session.match, penaltiesByPlayerId: { ...session.match.penaltiesByPlayerId, p0: 99 } } };
    expect(decodeOfflineMatchSession(encodeOfflineMatchSession(tampered), identity)).toBeUndefined();
    const wrongDealer = { ...session, currentRound: { ...session.currentRound, dealerIndex: 2 } };
    expect(decodeOfflineMatchSession(encodeOfflineMatchSession(wrongDealer), identity)).toBeUndefined();
  });

  it('recovers a terminal round saved immediately before its match summary', () => {
    const session = createOfflineMatchSession(identity, { roundCount: 2 });
    const completedRound = playDeterministicBotRound(session.currentRound).state;
    const recovered = decodeOfflineMatchSession(encodeOfflineMatchSession({ ...session, currentRound: completedRound }), identity);
    expect(recovered?.match.completedRounds).toHaveLength(1);
    expect(recovered?.currentRound).toEqual(completedRound);
  });
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

  it('rejects forged tile identities, indicator mismatch, and discard provenance drift', () => {
    const forgedTile = { ...game, wall: [{ ...game.wall[0], id: 'forged' }, ...game.wall.slice(1)] };
    const wrongIndicator = { ...game, indicator: { color: 'blue', number: 7 } };
    const liveDiscard = game.players[0]?.rack[0];
    if (liveDiscard === undefined) throw new Error('Expected tile');
    const withDiscard = {
      ...game,
      players: game.players.map((player, index) => index === 0 ? { ...player, rack: player.rack.filter((tile) => tile.id !== liveDiscard.id) } : player),
      discards: [liveDiscard],
      discardHistory: [{ tile: liveDiscard, playerId: 'p0', sequence: 2 }],
    };
    const wrongLiveDiscard = { ...withDiscard, discardHistory: [{ ...withDiscard.discardHistory[0], pickedBy: 'p1' }] };
    expect(decodeOfflineMatch(JSON.stringify(forgedTile), identity)).toBeUndefined();
    expect(decodeOfflineMatch(JSON.stringify(wrongIndicator), identity)).toBeUndefined();
    expect(decodeOfflineMatch(JSON.stringify(wrongLiveDiscard), identity)).toBeUndefined();
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
    const coordinatedTamper = {
      ...completed,
      players: completed.players.map((player, index) => index === 0 ? { ...player, roundScore: player.roundScore + 1 } : player),
      settlement: completed.settlement === undefined ? undefined : {
        ...completed.settlement,
        entries: completed.settlement.entries.map((entry, index) => index === 0 ? { ...entry, delta: entry.delta + 1 } : entry),
      },
    };
    expect(decodeOfflineMatch(JSON.stringify({ version: 2, game: missing }), identity)).toBeUndefined();
    expect(decodeOfflineMatch(JSON.stringify({ version: 2, game: wrongScore }), identity)).toBeUndefined();
    expect(decodeOfflineMatch(JSON.stringify({ version: 3, game: coordinatedTamper }), identity)).toBeUndefined();
  });
});
