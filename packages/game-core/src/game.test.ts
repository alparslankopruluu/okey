import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyCommand, createGame } from './game';
import { validateMeld } from './melds';
import { replay } from './replay';
import { createTileSet, effectiveValue, isJoker, jokerValue, tileByValue } from './tiles';
import { GameRuleError, type GameCommand, type Meld, type TileValue } from './types';

const indicator: TileValue = { color: 'red', number: 13 };

describe('tile semantics', () => {
  it('creates 104 numbered tiles and two false jokers', () => {
    const tiles = createTileSet();
    expect(tiles).toHaveLength(106);
    expect(new Set(tiles.map((tile) => tile.id))).toHaveLength(106);
    expect(tiles.filter((tile) => tile.kind === 'false_joker')).toHaveLength(2);
  });

  it('wraps the okey value from 13 to 1 and maps false joker to the actual-joker face', () => {
    expect(jokerValue(indicator)).toEqual({ color: 'red', number: 1 });
    expect(isJoker(tileByValue('red', 1), indicator)).toBe(true);
    expect(effectiveValue({ id: 'false-joker-0', kind: 'false_joker', copy: 0 }, indicator)).toEqual({ color: 'red', number: 1 });
  });
});

describe('meld validation', () => {
  it('validates ordinary sequences and sets and gates the Classic high-ace wrap', () => {
    const rack = [tileByValue('blue', 4), tileByValue('blue', 5), tileByValue('blue', 6)];
    expect(validateMeld({ kind: 'sequence', tileIds: rack.map((tile) => tile.id) }, rack, indicator)).toBe(15);
    const set = [tileByValue('red', 8), tileByValue('blue', 8), tileByValue('black', 8)];
    expect(validateMeld({ kind: 'set', tileIds: set.map((tile) => tile.id) }, set, indicator)).toBe(24);
    const wrap = [tileByValue('yellow', 12), tileByValue('yellow', 13), tileByValue('yellow', 1)];
    expect(() => validateMeld({ kind: 'sequence', tileIds: wrap.map((tile) => tile.id) }, wrap, indicator)).toThrow(GameRuleError);
    expect(validateMeld({ kind: 'sequence', tileIds: wrap.map((tile) => tile.id) }, wrap, indicator, true)).toBe(26);
    const invalidWrap = [tileByValue('yellow', 13), tileByValue('yellow', 1), tileByValue('yellow', 2)];
    expect(() => validateMeld({ kind: 'sequence', tileIds: invalidWrap.map((tile) => tile.id) }, invalidWrap, indicator, true)).toThrow(GameRuleError);
  });

  it('rejects duplicate colors in a set', () => {
    const rack = [tileByValue('blue', 4, 0), tileByValue('blue', 4, 1), tileByValue('red', 4)];
    expect(() => validateMeld({ kind: 'set', tileIds: rack.map((tile) => tile.id) }, rack, indicator)).toThrowError(/repeat a color/);
  });
});

describe('deterministic state machine', () => {
  it('deals the same state for the same seed', () => {
    const options = { gameId: 'g1', variant: 'classic' as const, playerIds: ['a', 'b', 'c', 'd'] as const, seed: 42 };
    expect(createGame(options)).toEqual(createGame(options));
  });

  it('rejects stale/out-of-turn commands and treats command ids idempotently', () => {
    const game = createGame({ gameId: 'g2', variant: 'classic', playerIds: ['a', 'b', 'c', 'd'], seed: 9 });
    expect(() => applyCommand(game, { type: 'discard', commandId: 'wrong', playerId: 'b', expectedSequence: 0, tileId: 'none' })).toThrowError(/turn/);
    const tile = game.players[0]?.rack[0];
    expect(tile).toBeDefined();
    const command: GameCommand = { type: 'discard', commandId: 'c1', playerId: 'a', expectedSequence: 0, tileId: tile?.id ?? '' };
    const first = applyCommand(game, command);
    expect(applyCommand(first.state, command).duplicate).toBe(true);
    expect(() => applyCommand(first.state, { ...command, tileId: 'another-tile' })).toThrowError(/another payload/);
    expect(() => applyCommand(game, { ...command, commandId: 'c2', expectedSequence: 2 })).toThrowError(/Expected sequence/);
  });

  it('replays a command sequence to the same state', () => {
    const game = createGame({ gameId: 'g3', variant: 'classic', playerIds: ['a', 'b', 'c', 'd'], seed: 19 });
    const firstTile = game.players[0]?.rack[0];
    const afterDiscard = applyCommand(game, { type: 'discard', commandId: 'c1', playerId: 'a', expectedSequence: 0, tileId: firstTile?.id ?? '' }).state;
    const commands: GameCommand[] = [
      { type: 'discard', commandId: 'c1', playerId: 'a', expectedSequence: 0, tileId: firstTile?.id ?? '' },
      { type: 'draw_wall', commandId: 'c2', playerId: 'b', expectedSequence: 1 },
    ];
    expect(replay(game, commands)).toEqual(applyCommand(afterDiscard, commands[1] as GameCommand).state);
  });

  it('preserves the complete unique tile set for arbitrary seeds', () => {
    fc.assert(fc.property(fc.integer(), (seed) => {
      const game = createGame({ gameId: 'property', variant: '101', playerIds: ['a', 'b', 'c', 'd'], seed });
      const allIds = [
        game.indicatorTile.id,
        ...game.players.flatMap((player) => player.rack.map((tile) => tile.id)),
        ...game.wall.map((tile) => tile.id),
      ];
      expect(allIds).toHaveLength(106);
      expect(new Set(allIds)).toHaveLength(106);
    }));
  });
});

describe('101 opening', () => {
  it('rejects a low-point opening', () => {
    const game = createGame({ gameId: '101', variant: '101', playerIds: ['a', 'b', 'c', 'd'], seed: 2 });
    const rack = [tileByValue('blue', 1), tileByValue('blue', 2), tileByValue('blue', 3)];
    const player = game.players[0];
    expect(player).toBeDefined();
    if (player === undefined) throw new Error('Expected first player');
    const state = { ...game, players: [{ ...player, rack }, ...game.players.slice(1)] };
    const meld: Meld = { kind: 'sequence', tileIds: rack.map((tile) => tile.id) };
    expect(() => applyCommand(state, { type: 'open_melds', commandId: 'open', playerId: 'a', expectedSequence: 0, melds: [meld] })).toThrowError(/101 points/);
  });
});
