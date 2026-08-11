import { validateMeldCollection, isWinningClassicRack } from './melds';
import { shuffled } from './random';
import { createTileSet, effectiveValue } from './tiles';
import {
  GameRuleError,
  type CommandResult,
  type GameCommand,
  type GameEvent,
  type GameState,
  type GameVariant,
  type PlayerState,
  type RuleConfig,
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
    players,
    rules: { ...DEFAULT_RULES, ...options.rules },
    processedCommandIds: [],
    processedCommandFingerprints: {},
  };
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
    if (player.opened) throw new GameRuleError('already_opened', 'Player has already opened');
    const result = validateMeldCollection(command.melds, player.rack, state.indicator);
    const pairsOpening = command.melds.every((meld) => meld.kind === 'pair');
    if (pairsOpening) {
      if (!state.rules.allowPairsOpening101 || command.melds.length < state.rules.pairsRequiredToOpen101) {
        throw new GameRuleError('pairs_opening_too_short', 'Not enough pairs to open');
      }
    } else if (result.points < state.rules.openingPoints101) {
      throw new GameRuleError('opening_points_too_low', `Opening needs ${state.rules.openingPoints101} points`);
    }
    const nextPlayer = { ...player, opened: true };
    events.push({ type: 'melds_opened', playerId: player.id, melds: command.melds, points: result.points });
    return { state: withCommand(state, command, { players: replacePlayer(state, nextPlayer) }), events, duplicate: false };
  }

  const tileId = command.type === 'finish' ? command.discardTileId : command.tileId;
  const discard = player.rack.find((tile) => tile.id === tileId);
  if (discard === undefined) throw new GameRuleError('tile_not_in_rack', 'Discard tile is not in the rack');
  const remainingRack = player.rack.filter((tile) => tile.id !== tileId);

  if (command.type === 'finish') {
    const valid = state.variant === 'classic'
      ? isWinningClassicRack(
          remainingRack,
          state.indicator,
          command.melds,
          state.rules.allowSevenPairsClassic,
          state.rules.classicHighAceRun,
        )
      : (player.opened || state.rules.allowDirectFinishBelowThreshold101)
        && validateMeldCollection(command.melds, remainingRack, state.indicator).usedTileIds.length === remainingRack.length;
    if (!valid) throw new GameRuleError('invalid_finish', 'Remaining rack is not a valid finish');
    events.push({ type: 'round_finished', playerId: player.id, discard });
    return {
      state: withCommand(state, command, {
        phase: 'round_finished',
        players: replacePlayer(state, { ...player, rack: remainingRack }),
        discards: [...state.discards, discard],
        winnerId: player.id,
      }),
      events,
      duplicate: false,
    };
  }

  if (state.phase !== 'awaiting_discard') throw new GameRuleError('discard_not_allowed', 'Draw before discarding');
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
  return rack.reduce((sum, tile) => {
    const value = effectiveValue(tile, indicator);
    return sum + (value === 'joker' ? 0 : value.number);
  }, 0);
}
