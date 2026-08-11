import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { playDeterministicBotRound, playDeterministicBotTurn } from './bot';
import { applyCommand, createGame } from './game';
import { validateMeld, validateMeldCollection } from './melds';
import { replay } from './replay';
import { rackPenaltyScore101, settleRound } from './scoring';
import { findOpeningMelds101, findTableExtension, findWinningDiscard, findWinningMelds } from './solver';
import { createTileSet, effectiveValue, isJoker, jokerValue, tileByValue } from './tiles';
import {
  GameRuleError,
  type GameCommand,
  type GameVariant,
  type Meld,
  type Tile,
  type TileColor,
  type TileNumber,
  type TileValue,
} from './types';

const indicator: TileValue = { color: 'red', number: 13 };

function sequence(color: TileColor, numbers: readonly TileNumber[]): Tile[] {
  return numbers.map((number) => tileByValue(color, number));
}

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
    expect(() => validateMeld({ kind: 'set', tileIds: rack.map((tile) => tile.id) }, rack, indicator)).toThrow(/repeat a color/);
  });
});

describe('deterministic state machine', () => {
  it('deals the same state for the same seed', () => {
    const options = { gameId: 'g1', variant: 'classic' as const, playerIds: ['a', 'b', 'c', 'd'] as const, seed: 42 };
    expect(createGame(options)).toEqual(createGame(options));
  });

  it('rejects stale/out-of-turn commands and treats command ids idempotently', () => {
    const game = createGame({ gameId: 'g2', variant: 'classic', playerIds: ['a', 'b', 'c', 'd'], seed: 9 });
    expect(() => applyCommand(game, { type: 'discard', commandId: 'wrong', playerId: 'b', expectedSequence: 0, tileId: 'none' })).toThrow(/turn/);
    const tile = game.players[0]?.rack[0];
    expect(tile).toBeDefined();
    const command: GameCommand = { type: 'discard', commandId: 'c1', playerId: 'a', expectedSequence: 0, tileId: tile?.id ?? '' };
    const first = applyCommand(game, command);
    expect(applyCommand(first.state, command).duplicate).toBe(true);
    expect(() => applyCommand(first.state, { ...command, tileId: 'another-tile' })).toThrow(/another payload/);
    expect(() => applyCommand(game, { ...command, commandId: 'c2', expectedSequence: 2 })).toThrow(/Expected sequence/);
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

describe('complete deterministic bot round', () => {
  it.each(['classic', '101'] satisfies readonly GameVariant[])('finishes a %s round by a legal finish or wall exhaustion', (variant) => {
    const initial = createGame({ gameId: `full-${variant}`, variant, playerIds: ['a', 'b', 'c', 'd'], seed: 20260811 });
    const first = playDeterministicBotRound(initial);
    const second = playDeterministicBotRound(initial);

    expect(first).toEqual(second);
    expect(first.state.phase).toBe('round_finished');
    expect(['finish', 'wall_exhausted']).toContain(first.state.roundEndReason);
    if (first.state.roundEndReason === 'wall_exhausted') {
      expect(first.state.winnerId).toBeUndefined();
      expect(first.state.wall).toHaveLength(0);
    } else {
      expect(first.state.winnerId).toBeDefined();
    }
    expect(first.state.settlement?.reason).toBe(first.state.roundEndReason);
    expect(first.commands.length).toBeLessThan(512);
    expect(replay(initial, first.commands)).toEqual(first.state);

    const allIds = [
      first.state.indicatorTile.id,
      ...first.state.players.flatMap((player) => player.rack.map((tile) => tile.id)),
      ...first.state.wall.map((tile) => tile.id),
      ...first.state.discards.map((tile) => tile.id),
      ...first.state.tableMelds.flatMap((meld) => meld.tiles.map((tile) => tile.id)),
    ];
    expect(allIds).toHaveLength(106);
    expect(new Set(allIds)).toHaveLength(106);

    const lastCommand = first.commands.at(-1);
    expect(lastCommand).toBeDefined();
    if (lastCommand === undefined) throw new Error('Expected a final bot command');
    const beforeLast = replay(initial, first.commands.slice(0, -1));
    expect(applyCommand(beforeLast, lastCommand).events).toContainEqual(expect.objectContaining({
      type: 'round_finished', reason: first.state.roundEndReason, discard: first.state.discards.at(-1),
    }));
  });

  it('terminates within the command budget across arbitrary seeds and variants', () => {
    fc.assert(fc.property(
      fc.integer(),
      fc.constantFrom<GameVariant>('classic', '101'),
      (seed, variant) => {
        const initial = createGame({ gameId: 'property-full-round', variant, playerIds: ['a', 'b', 'c', 'd'], seed });
        const result = playDeterministicBotRound(initial);
        expect(result.state.phase).toBe('round_finished');
        expect(['finish', 'wall_exhausted']).toContain(result.state.roundEndReason);
        expect(result.state.settlement?.reason).toBe(result.state.roundEndReason);
        expect(result.commands.length).toBeLessThan(512);
      },
    ), { numRuns: 40 });
  }, 20_000);
});

describe('legal round finish', () => {
  it('accepts a complete Classic rack and rejects an incomplete meld collection', () => {
    const groups = [
      sequence('blue', [1, 2, 3]),
      sequence('red', [4, 5, 6]),
      sequence('black', [7, 8, 9, 10]),
      sequence('yellow', [10, 11, 12, 13]),
    ];
    const rack = groups.flat();
    const discard = tileByValue('yellow', 1);
    const melds: Meld[] = groups.map((tiles) => ({ kind: 'sequence', tileIds: tiles.map((tile) => tile.id) }));
    const initial = createGame({ gameId: 'classic-finish', variant: 'classic', playerIds: ['a', 'b', 'c', 'd'], seed: 3 });
    const player = initial.players[0];
    if (player === undefined) throw new Error('Expected first player');
    const state = { ...initial, indicator, players: [{ ...player, rack: [...rack, discard] }, ...initial.players.slice(1)] };

    const result = applyCommand(state, {
      type: 'finish',
      commandId: 'classic-finish',
      playerId: 'a',
      expectedSequence: 0,
      discardTileId: discard.id,
      melds,
    });
    expect(result.state.phase).toBe('round_finished');
    expect(result.state.roundEndReason).toBe('finish');
    expect(result.state.winnerId).toBe('a');
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'round_finished', reason: 'finish', playerId: 'a', discard }));

    expect(() => applyCommand(state, {
      type: 'finish',
      commandId: 'classic-invalid-finish',
      playerId: 'a',
      expectedSequence: 0,
      discardTileId: discard.id,
      melds: melds.slice(0, -1),
    })).toThrow(/valid finish/);
  });

  it('accepts a complete direct-finish 101 rack under the configured rule', () => {
    const groups = [
      sequence('blue', [1, 2, 3]),
      sequence('blue', [4, 5, 6]),
      sequence('red', [4, 5, 6]),
      sequence('red', [7, 8, 9]),
      sequence('black', [1, 2, 3]),
      sequence('black', [4, 5, 6]),
      sequence('yellow', [1, 2, 3]),
    ];
    const rack = groups.flat();
    const discard = tileByValue('yellow', 13);
    const melds: Meld[] = groups.map((tiles) => ({ kind: 'sequence', tileIds: tiles.map((tile) => tile.id) }));
    const initial = createGame({ gameId: '101-finish', variant: '101', playerIds: ['a', 'b', 'c', 'd'], seed: 4 });
    const player = initial.players[0];
    if (player === undefined) throw new Error('Expected first player');
    const state = { ...initial, indicator, players: [{ ...player, rack: [...rack, discard] }, ...initial.players.slice(1)] };

    const result = applyCommand(state, {
      type: 'finish',
      commandId: '101-finish',
      playerId: 'a',
      expectedSequence: 0,
      discardTileId: discard.id,
      melds,
    });
    expect(result.state.phase).toBe('round_finished');
    expect(result.state.roundEndReason).toBe('finish');
    expect(result.state.winnerId).toBe('a');
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
    expect(() => applyCommand(state, { type: 'open_melds', commandId: 'open', playerId: 'a', expectedSequence: 0, melds: [meld] })).toThrow(/101 points/);
  });

  it('moves opened tiles from the rack to authoritative table melds and supports a legal layoff', () => {
    const groups = [
      sequence('blue', [10, 11, 12, 13]),
      sequence('black', [10, 11, 12, 13]),
      sequence('yellow', [4, 5, 6]),
    ];
    const layoff = tileByValue('blue', 9);
    const discard = tileByValue('yellow', 1);
    const rack = [...groups.flat(), layoff, discard];
    const game = createGame({ gameId: '101-table', variant: '101', playerIds: ['a', 'b', 'c', 'd'], seed: 7 });
    const player = game.players[0];
    if (player === undefined) throw new Error('Expected first player');
    const state = { ...game, indicator, players: [{ ...player, rack }, ...game.players.slice(1)] };
    const melds: Meld[] = groups.map((tiles) => ({ kind: 'sequence', tileIds: tiles.map((tile) => tile.id) }));
    const opened = applyCommand(state, { type: 'open_melds', commandId: 'open-table', playerId: 'a', expectedSequence: 0, melds }).state;

    expect(opened.players[0]).toMatchObject({ opened: true, openingMode: 'melds' });
    expect(opened.players[0]?.rack.map((tile) => tile.id)).toEqual([layoff.id, discard.id]);
    expect(opened.tableMelds).toHaveLength(3);
    const extension = findTableExtension(opened, 'a');
    expect(extension).toEqual({ tableMeldId: opened.tableMelds[0]?.id, tileIds: [layoff.id] });
    if (extension === undefined) throw new Error('Expected table extension');
    const extended = applyCommand(opened, {
      type: 'extend_meld', commandId: 'extend-table', playerId: 'a', expectedSequence: opened.sequence,
      tableMeldId: extension.tableMeldId, tileIds: extension.tileIds,
    }).state;
    expect(extended.players[0]?.rack).toEqual([discard]);
    expect(extended.tableMelds[0]?.tiles.map((tile) => tile.id)).toContain(layoff.id);

    const finished = applyCommand(extended, {
      type: 'finish', commandId: 'finish-table', playerId: 'a', expectedSequence: extended.sequence,
      discardTileId: discard.id, melds: [],
    }).state;
    expect(finished.players[0]?.rack).toEqual([]);
    expect(finished.settlement?.finishStyle).toBe('normal');
    expect(finished.settlement?.entries.map((entry) => entry.delta)).toEqual([-101, 202, 202, 202]);
  });

  it('finds a deterministic legal opening selection and rejects a layoff that consumes the required discard', () => {
    const rack = [
      ...sequence('blue', [10, 11, 12, 13]),
      ...sequence('black', [10, 11, 12, 13]),
      ...sequence('yellow', [4, 5, 6]),
      tileByValue('yellow', 1),
    ];
    const selection = findOpeningMelds101(rack, indicator, 101, 5, true);
    expect(selection?.points).toBeGreaterThanOrEqual(101);
    expect(validateMeldCollection(selection?.melds ?? [], rack, indicator).points).toBe(selection?.points);
  });
});

describe('automatic winner discovery and legal bot finish', () => {
  const winningGroups = [
    sequence('blue', [1, 2, 3]),
    sequence('red', [4, 5, 6]),
    sequence('black', [7, 8, 9, 10]),
    sequence('yellow', [10, 11, 12, 13]),
  ];

  it('finds the winning partition without caller-supplied melds', () => {
    const rack = winningGroups.flat();
    const melds = findWinningMelds(rack, indicator, { allowHighAceWrap: true, allowSevenPairs: true });
    expect(melds).toBeDefined();
    expect(validateMeldCollection(melds ?? [], rack, indicator, true).usedTileIds).toHaveLength(14);
  });

  it('chooses a legal winning discard and the bot submits an authoritative finish command', () => {
    const discard = tileByValue('yellow', 1);
    const initial = createGame({ gameId: 'bot-finish', variant: 'classic', playerIds: ['a', 'b', 'c', 'd'], seed: 8 });
    const player = initial.players[0];
    if (player === undefined) throw new Error('Expected first player');
    const state = { ...initial, indicator, players: [{ ...player, rack: [...winningGroups.flat(), discard] }, ...initial.players.slice(1)] };
    const discovery = findWinningDiscard(state.players[0]?.rack ?? [], indicator, { allowHighAceWrap: true, allowSevenPairs: true });
    expect(discovery).toBeDefined();
    const result = playDeterministicBotTurn(state, 0, 'winner');
    expect(result.commands).toHaveLength(1);
    expect(result.commands[0]?.type).toBe('finish');
    expect(result.state.winnerId).toBe('a');
    expect(replay(state, result.commands)).toEqual(result.state);
  });

  it('returns the same solver result for arbitrary rack order', () => {
    const rack = winningGroups.flat();
    const expected = findWinningMelds(rack, indicator, { allowHighAceWrap: true });
    fc.assert(fc.property(fc.shuffledSubarray(rack, { minLength: rack.length, maxLength: rack.length }), (shuffledRack) => {
      expect(findWinningMelds(shuffledRack, indicator, { allowHighAceWrap: true })).toEqual(expected);
    }), { numRuns: 20 });
  });
});

describe('round settlement', () => {
  it('applies Classic ordinary, joker, and seven-pairs deductions', () => {
    const state = { ...createGame({ gameId: 'scores-classic', variant: 'classic', playerIds: ['a', 'b', 'c', 'd'], seed: 5 }), indicator };
    const ordinary = settleRound(state, { reason: 'finish', winnerId: 'a', discard: tileByValue('blue', 2), melds: [] });
    const joker = settleRound(state, { reason: 'finish', winnerId: 'a', discard: tileByValue('red', 1), melds: [] });
    const pairs: Meld[] = Array.from({ length: 7 }, () => ({ kind: 'pair', tileIds: [] }));
    const sevenPairs = settleRound(state, { reason: 'finish', winnerId: 'a', discard: tileByValue('blue', 2), melds: pairs });
    expect(ordinary.entries.map((entry) => entry.delta)).toEqual([0, -2, -2, -2]);
    expect(joker.entries.map((entry) => entry.delta)).toEqual([0, -4, -4, -4]);
    expect(sevenPairs.entries.map((entry) => entry.delta)).toEqual([0, -4, -4, -4]);
  });

  it('applies 101 pair-opening multipliers and values unplayed jokers at 101', () => {
    const game = createGame({ gameId: 'scores-101', variant: '101', playerIds: ['a', 'b', 'c', 'd'], seed: 6 });
    const players = game.players.map((player, index) => index === 0
      ? { ...player, opened: true, openingMode: 'pairs' as const }
      : index === 1
        ? { ...player, opened: true, openingMode: 'melds' as const, rack: [tileByValue('blue', 10)] }
        : player);
    const state = { ...game, indicator, players };
    const settlement = settleRound(state, { reason: 'finish', winnerId: 'a', discard: tileByValue('blue', 2), melds: [] });
    expect(settlement.finishStyle).toBe('pairs');
    expect(settlement.entries.map((entry) => entry.delta)).toEqual([-202, 20, 404, 404]);
    expect(rackPenaltyScore101([tileByValue('red', 1), tileByValue('blue', 9)], state)).toBe(110);
  });

  it('scores stock exhaustion only for actual jokers in 101', () => {
    const game = createGame({ gameId: 'scores-wall', variant: '101', playerIds: ['a', 'b', 'c', 'd'], seed: 9 });
    const players = game.players.map((player, index) => index === 0
      ? { ...player, rack: [tileByValue('red', 1), tileByValue('blue', 5)] }
      : { ...player, rack: [tileByValue('blue', 5, index % 2 as 0 | 1)] });
    const settlement = settleRound({ ...game, indicator, players }, { reason: 'wall_exhausted' });
    expect(settlement.entries.map((entry) => entry.delta)).toEqual([101, 0, 0, 0]);
  });
});
