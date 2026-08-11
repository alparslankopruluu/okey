import { validateMeld, validateMeldCollection, isWinningClassicRack } from './melds';
import { shuffled } from './random';
import { rackFaceScore, settleRound } from './scoring';
import { createTileSet } from './tiles';
import {
  GameRuleError,
  type CommandResult,
  type GameCommand,
  type GameEvent,
  type GameState,
  type GameVariant,
  type PlayerState,
  type RuleConfig,
  type RoundSettlement,
  type TableMeld,
  type Tile,
  type TileValue,
} from './types';

export const DEFAULT_RULES: RuleConfig = {
  allowSevenPairsClassic: true,
  classicHighAceRun: true,
  allowPairsOpening101: true,
  pairsRequiredToOpen101: 5,
  openingPoints101: 101,
  allowDirectFinishBelowThreshold101: true,
  allowDiscardPickupWithoutImmediateUse: false,
  discardProbePolicy: 'allow_return',
  tableJokerRetrieval: 'locked',
  playableDiscardPenalty: 'automatic',
};

function ensureNormalIndicator(tile: Tile | undefined): TileValue {
  if (tile?.kind !== 'normal' || tile.color === undefined || tile.number === undefined) {
    throw new Error('Indicator must be a normal tile');
  }
  return { color: tile.color, number: tile.number };
}

export function createGame(options: {
  readonly gameId: string;
  readonly variant: GameVariant;
  readonly playerIds: readonly [string, string, string, string];
  readonly seed: number;
  readonly dealerIndex?: number;
  readonly rules?: Partial<RuleConfig>;
}): GameState {
  const dealerIndex = options.dealerIndex ?? 0;
  const deck = shuffled(createTileSet(), options.seed);
  const indicatorIndex = deck.findIndex((tile) => tile.kind === 'normal');
  const indicatorTile = deck.splice(indicatorIndex, 1)[0];
  if (indicatorTile === undefined) throw new Error('Tile set has no indicator candidate');
  const indicator = ensureNormalIndicator(indicatorTile);
  const baseRackSize = options.variant === 'classic' ? 14 : 21;
  const players: PlayerState[] = options.playerIds.map((id) => ({ id, rack: [], opened: false, roundScore: 0 }));
  for (let round = 0; round < baseRackSize; round += 1) {
    for (const player of players) {
      const tile = deck.shift();
      if (tile === undefined) throw new Error('Tile set exhausted while dealing');
      (player.rack as Tile[]).push(tile);
    }
  }
  const dealerTile = deck.shift();
  if (dealerTile === undefined) throw new Error('Tile set exhausted before dealer tile');
  (players[dealerIndex]?.rack as Tile[]).push(dealerTile);
  return {
    gameId: options.gameId,
    variant: options.variant,
    seed: options.seed,
    sequence: 0,
    phase: 'awaiting_discard',
    dealerIndex,
    turnIndex: dealerIndex,
    indicatorTile,
    indicator,
    wall: deck,
    discards: [],
    tableMelds: [],
    players,
    rules: { ...DEFAULT_RULES, ...options.rules },
    processedCommandIds: [],
    processedCommandFingerprints: {},
  };
}

function withRoundScores(players: readonly PlayerState[], settlement: RoundSettlement): readonly PlayerState[] {
  const byPlayer = new Map(settlement.entries.map((entry) => [entry.playerId, entry.delta]));
  return players.map((player) => ({ ...player, roundScore: byPlayer.get(player.id) ?? 0 }));
}

function tableMeldsFrom(
  state: GameState,
  player: PlayerState,
  melds: readonly { readonly kind: TableMeld['kind']; readonly tileIds: readonly string[] }[],
  sourceRack: readonly Tile[],
  prefix: string,
): readonly TableMeld[] {
  const byId = new Map(sourceRack.map((tile) => [tile.id, tile]));
  return melds.map((meld, index) => ({
    id: `${prefix}-${state.sequence}-${player.id}-${index}`,
    ownerId: player.id,
    kind: meld.kind,
    tiles: meld.tileIds.map((id) => {
      const tile = byId.get(id);
      if (tile === undefined) throw new GameRuleError('tile_not_in_rack', `Tile ${id} is not in the rack`);
      return tile;
    }),
  }));
}

function activePlayer(state: GameState, playerId: string): PlayerState {
  const player = state.players[state.turnIndex];
  if (player?.id !== playerId) throw new GameRuleError('out_of_turn', 'It is not this player’s turn');
  return player;
}

function replacePlayer(state: GameState, player: PlayerState): readonly PlayerState[] {
  return state.players.map((candidate) => (candidate.id === player.id ? player : candidate));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right, 'en'))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

function commandFingerprint(command: GameCommand): string {
  return JSON.stringify(stableValue(command));
}

function withCommand(state: GameState, command: GameCommand, patch: Partial<GameState>): GameState {
  const fingerprint = commandFingerprint(command);
  const processedCommandIds = [...state.processedCommandIds.slice(-127), command.commandId];
  const processedCommandFingerprints: Record<string, string> = {};
  for (const id of processedCommandIds) {
    const value = id === command.commandId ? fingerprint : state.processedCommandFingerprints[id];
    if (value === undefined) throw new Error(`Missing fingerprint for processed command ${id}`);
    processedCommandFingerprints[id] = value;
  }
  return {
    ...state,
    ...patch,
    sequence: state.sequence + 1,
    processedCommandIds,
    processedCommandFingerprints,
  };
}

export function applyCommand(state: GameState, command: GameCommand): CommandResult {
  if (state.processedCommandIds.includes(command.commandId)) {
    if (state.processedCommandFingerprints[command.commandId] !== commandFingerprint(command)) {
      throw new GameRuleError('idempotency_conflict', 'Command ID was already used with another payload');
    }
    return { state, events: [], duplicate: true };
  }
  if (command.expectedSequence !== state.sequence) {
    throw new GameRuleError('stale_sequence', `Expected sequence ${state.sequence}`);
  }
  if (state.phase === 'round_finished') throw new GameRuleError('round_finished', 'The round is already finished');
  const player = activePlayer(state, command.playerId);
  const events: GameEvent[] = [];

  if (command.type === 'draw_wall' || command.type === 'draw_discard') {
    if (state.phase !== 'awaiting_draw') throw new GameRuleError('draw_not_allowed', 'Discard before drawing again');
    const source = command.type === 'draw_wall' ? state.wall : state.discards;
    const tile = command.type === 'draw_wall' ? source[0] : source.at(-1);
    if (tile === undefined) throw new GameRuleError('source_empty', 'There is no tile to draw');
    const nextPlayer = { ...player, rack: [...player.rack, tile] };
    events.push({ type: 'tile_drawn', playerId: player.id, tile, source: command.type === 'draw_wall' ? 'wall' : 'discard' });
    return {
      state: withCommand(state, command, {
        phase: 'awaiting_discard',
        players: replacePlayer(state, nextPlayer),
        wall: command.type === 'draw_wall' ? state.wall.slice(1) : state.wall,
        discards: command.type === 'draw_discard' ? state.discards.slice(0, -1) : state.discards,
      }),
      events,
      duplicate: false,
    };
  }

  if (command.type === 'open_melds') {
    if (state.variant !== '101') throw new GameRuleError('opening_not_classic', 'Classic Okey has no table opening command');
    if (state.phase !== 'awaiting_discard') throw new GameRuleError('opening_not_allowed', 'Draw before opening melds');
    if (player.opened) throw new GameRuleError('already_opened', 'Player has already opened');
    const result = validateMeldCollection(command.melds, player.rack, state.indicator);
    const pairsOpening = command.melds.every((meld) => meld.kind === 'pair');
    if (!pairsOpening && command.melds.some((meld) => meld.kind === 'pair')) {
      throw new GameRuleError('mixed_opening', 'Pairs cannot be mixed with sets or runs');
    }
    if (pairsOpening) {
      if (!state.rules.allowPairsOpening101 || command.melds.length < state.rules.pairsRequiredToOpen101) {
        throw new GameRuleError('pairs_opening_too_short', 'Not enough pairs to open');
      }
    } else if (result.points < state.rules.openingPoints101) {
      throw new GameRuleError('opening_points_too_low', `Opening needs ${state.rules.openingPoints101} points`);
    }
    const used = new Set(result.usedTileIds);
    const nextRack = player.rack.filter((tile) => !used.has(tile.id));
    if (nextRack.length < 1) throw new GameRuleError('discard_required', 'Opening must leave one tile to discard');
    const openedTableMelds = tableMeldsFrom(state, player, command.melds, player.rack, 'open');
    const nextPlayer = { ...player, rack: nextRack, opened: true, openingMode: pairsOpening ? 'pairs' as const : 'melds' as const };
    events.push({
      type: 'melds_opened',
      playerId: player.id,
      melds: command.melds,
      tableMeldIds: openedTableMelds.map((meld) => meld.id),
      points: result.points,
    });
    return {
      state: withCommand(state, command, {
        players: replacePlayer(state, nextPlayer),
        tableMelds: [...state.tableMelds, ...openedTableMelds],
      }),
      events,
      duplicate: false,
    };
  }

  if (command.type === 'extend_meld') {
    if (state.variant !== '101') throw new GameRuleError('layoff_not_classic', 'Classic Okey has no table melds');
    if (state.phase !== 'awaiting_discard') throw new GameRuleError('layoff_not_allowed', 'Draw before extending a meld');
    if (!player.opened) throw new GameRuleError('opening_required', 'Open before extending a table meld');
    if (command.tileIds.length === 0 || new Set(command.tileIds).size !== command.tileIds.length) {
      throw new GameRuleError('invalid_layoff_tiles', 'A layoff needs unique rack tiles');
    }
    const tableMeld = state.tableMelds.find((meld) => meld.id === command.tableMeldId);
    if (tableMeld === undefined) throw new GameRuleError('table_meld_missing', 'Table meld does not exist');
    if (tableMeld.kind === 'pair') throw new GameRuleError('pair_not_extendable', 'A pair cannot be extended');
    const selected = command.tileIds.map((id) => {
      const tile = player.rack.find((candidate) => candidate.id === id);
      if (tile === undefined) throw new GameRuleError('tile_not_in_rack', `Tile ${id} is not in the rack`);
      return tile;
    });
    const selectedIds = new Set(command.tileIds);
    const nextRack = player.rack.filter((tile) => !selectedIds.has(tile.id));
    if (nextRack.length < 1) throw new GameRuleError('discard_required', 'A layoff must leave one tile to discard');
    const combined = [...tableMeld.tiles, ...selected];
    validateMeld({ kind: tableMeld.kind, tileIds: combined.map((tile) => tile.id) }, combined, state.indicator);
    const tableMelds = state.tableMelds.map((meld) => meld.id === tableMeld.id ? { ...meld, tiles: combined } : meld);
    events.push({ type: 'meld_extended', playerId: player.id, tableMeldId: tableMeld.id, tileIds: command.tileIds });
    return {
      state: withCommand(state, command, { players: replacePlayer(state, { ...player, rack: nextRack }), tableMelds }),
      events,
      duplicate: false,
    };
  }

  if (state.phase !== 'awaiting_discard') throw new GameRuleError('discard_not_allowed', 'Draw before discarding');
  const tileId = command.type === 'finish' ? command.discardTileId : command.tileId;
  const discard = player.rack.find((tile) => tile.id === tileId);
  if (discard === undefined) throw new GameRuleError('tile_not_in_rack', 'Discard tile is not in the rack');
  const remainingRack = player.rack.filter((tile) => tile.id !== tileId);

  if (command.type === 'finish') {
    let valid: boolean;
    if (state.variant === 'classic') {
      valid = isWinningClassicRack(
          remainingRack,
          state.indicator,
          command.melds,
          state.rules.allowSevenPairsClassic,
          state.rules.classicHighAceRun,
        );
    } else {
      const collection = validateMeldCollection(command.melds, remainingRack, state.indicator);
      const allowedKinds = player.openingMode === 'pairs'
        ? command.melds.every((meld) => meld.kind === 'pair')
        : command.melds.every((meld) => meld.kind === 'sequence' || meld.kind === 'set');
      valid = (player.opened || state.rules.allowDirectFinishBelowThreshold101)
        && allowedKinds
        && collection.usedTileIds.length === remainingRack.length;
    }
    if (!valid) throw new GameRuleError('invalid_finish', 'Remaining rack is not a valid finish');
    const settlement = settleRound(state, { reason: 'finish', winnerId: player.id, discard, melds: command.melds });
    const finishTableMelds = state.variant === '101'
      ? tableMeldsFrom(state, player, command.melds, remainingRack, 'finish')
      : [];
    const winnerRack = state.variant === '101' ? [] : remainingRack;
    const players = withRoundScores(
      replacePlayer(state, { ...player, rack: winnerRack }),
      settlement,
    );
    events.push({ type: 'round_finished', reason: 'finish', playerId: player.id, discard, settlement });
    return {
      state: withCommand(state, command, {
        phase: 'round_finished',
        players,
        discards: [...state.discards, discard],
        tableMelds: [...state.tableMelds, ...finishTableMelds],
        winnerId: player.id,
        roundEndReason: 'finish',
        settlement,
      }),
      events,
      duplicate: false,
    };
  }

  if (state.wall.length === 0) {
    const playersAfterDiscard = replacePlayer(state, { ...player, rack: remainingRack });
    const settlement = settleRound({ ...state, players: playersAfterDiscard }, { reason: 'wall_exhausted' });
    events.push(
      { type: 'tile_discarded', playerId: player.id, tile: discard },
      { type: 'round_finished', reason: 'wall_exhausted', discard, settlement },
    );
    return {
      state: withCommand(state, command, {
        phase: 'round_finished',
        players: withRoundScores(playersAfterDiscard, settlement),
        discards: [...state.discards, discard],
        roundEndReason: 'wall_exhausted',
        settlement,
      }),
      events,
      duplicate: false,
    };
  }
  const nextTurn = (state.turnIndex + 1) % state.players.length;
  events.push({ type: 'tile_discarded', playerId: player.id, tile: discard }, { type: 'turn_advanced', turnIndex: nextTurn });
  return {
    state: withCommand(state, command, {
      phase: 'awaiting_draw',
      players: replacePlayer(state, { ...player, rack: remainingRack }),
      discards: [...state.discards, discard],
      turnIndex: nextTurn,
    }),
    events,
    duplicate: false,
  };
}

export function rackDeadwoodScore(rack: readonly Tile[], indicator: TileValue): number {
  return rackFaceScore(rack, { indicator });
}
