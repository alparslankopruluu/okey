import {
  settleRound,
  validateMeld,
  type GamePhase,
  type GameState,
  type GameVariant,
  type DiscardRecord,
  type PlayerState,
  type RoundEndReason,
  type RoundSettlement,
  type RuleConfig,
  type TableMeld,
  type Tile,
  type TileValue,
} from '@luma/game-core';

const STORAGE_VERSION = 3;
const PHASES: readonly GamePhase[] = ['awaiting_draw', 'awaiting_discard', 'round_finished'];
const COLORS = new Set(['red', 'blue', 'black', 'yellow']);

type MatchIdentity = Pick<GameState, 'gameId' | 'variant' | 'seed'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}

function isTile(value: unknown): value is Tile {
  if (!isRecord(value) || typeof value.id !== 'string' || (value.copy !== 0 && value.copy !== 1)) return false;
  if (value.kind === 'false_joker') return value.id === `false-joker-${value.copy}` && value.color === undefined && value.number === undefined;
  return value.kind === 'normal'
    && typeof value.color === 'string'
    && COLORS.has(value.color)
    && typeof value.number === 'number'
    && Number.isInteger(value.number)
    && value.number >= 1
    && value.number <= 13
    && value.id === `${value.color}-${value.number}-${value.copy}`;
}

function isRuleConfig(value: unknown): value is RuleConfig {
  if (!isRecord(value)) return false;
  return typeof value.allowSevenPairsClassic === 'boolean'
    && typeof value.classicHighAceRun === 'boolean'
    && typeof value.allowPairsOpening101 === 'boolean'
    && typeof value.pairsRequiredToOpen101 === 'number'
    && typeof value.openingPoints101 === 'number'
    && typeof value.allowDirectFinishBelowThreshold101 === 'boolean'
    && typeof value.allowDiscardPickupWithoutImmediateUse === 'boolean'
    && (value.discardProbePolicy === 'allow_return' || value.discardProbePolicy === 'commit_or_penalty')
    && (value.tableJokerRetrieval === 'locked' || value.tableJokerRetrieval === 'replace_after_open')
    && (value.playableDiscardPenalty === 'automatic' || value.playableDiscardPenalty === 'claim_required' || value.playableDiscardPenalty === 'off');
}

function isPlayer(value: unknown): value is PlayerState {
  return isRecord(value)
    && typeof value.id === 'string'
    && isUnknownArray(value.rack)
    && value.rack.every(isTile)
    && typeof value.opened === 'boolean'
    && (value.openingMode === undefined || value.openingMode === 'melds' || value.openingMode === 'pairs')
    && typeof value.roundScore === 'number'
    && (value.penalties === undefined || (typeof value.penalties === 'number' && Number.isSafeInteger(value.penalties) && value.penalties >= 0));
}

function isDiscardRecord(value: unknown): value is DiscardRecord {
  return isRecord(value)
    && isTile(value.tile)
    && typeof value.playerId === 'string'
    && typeof value.sequence === 'number'
    && Number.isSafeInteger(value.sequence)
    && value.sequence > 0
    && (value.pickedBy === undefined || typeof value.pickedBy === 'string');
}

function isTableMeld(value: unknown): value is TableMeld {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.ownerId === 'string'
    && (value.kind === 'sequence' || value.kind === 'set' || value.kind === 'pair')
    && isUnknownArray(value.tiles)
    && value.tiles.every(isTile);
}

function isSettlement(value: unknown, players: readonly PlayerState[], reason: RoundEndReason, winnerId?: string): value is RoundSettlement {
  if (!isRecord(value)
    || (value.profile !== 'classic-standard-v1' && value.profile !== '101-fixed-open-v1')
    || value.reason !== reason
    || value.winnerId !== winnerId
    || (value.finishStyle !== undefined
      && (typeof value.finishStyle !== 'string'
        || !['normal', 'joker', 'pairs', 'pairs_joker', 'hand', 'hand_joker', 'seven_pairs'].includes(value.finishStyle)))
    || !isUnknownArray(value.entries)
    || value.entries.length !== players.length) return false;
  const playerIds = new Set(players.map((player) => player.id));
  const entryIds = value.entries.flatMap((entry) => isRecord(entry) && typeof entry.playerId === 'string' ? [entry.playerId] : []);
  return new Set(entryIds).size === players.length && value.entries.every((entry) => isRecord(entry)
    && typeof entry.playerId === 'string'
    && playerIds.has(entry.playerId)
    && typeof entry.delta === 'number'
    && typeof entry.deadwood === 'number'
    && typeof entry.opened === 'boolean'
    && typeof entry.winner === 'boolean'
    && (entry.penalties === undefined || (typeof entry.penalties === 'number' && entry.penalties >= 0)));
}

function sameSettlement(actual: RoundSettlement, expected: RoundSettlement): boolean {
  return actual.profile === expected.profile
    && actual.reason === expected.reason
    && actual.finishStyle === expected.finishStyle
    && actual.winnerId === expected.winnerId
    && JSON.stringify(actual.winnerIds ?? []) === JSON.stringify(expected.winnerIds ?? [])
    && JSON.stringify(actual.entries) === JSON.stringify(expected.entries);
}

function isTileValue(value: unknown): value is TileValue {
  return isRecord(value)
    && typeof value.color === 'string'
    && COLORS.has(value.color)
    && typeof value.number === 'number'
    && Number.isInteger(value.number)
    && value.number >= 1
    && value.number <= 13;
}

function isGameState(value: unknown, identity: MatchIdentity): value is GameState {
  if (!isRecord(value)
    || value.gameId !== identity.gameId
    || value.variant !== identity.variant
    || value.seed !== identity.seed
    || typeof value.sequence !== 'number'
    || !Number.isInteger(value.sequence)
    || value.sequence < 0
    || typeof value.phase !== 'string'
    || !PHASES.includes(value.phase as GamePhase)
    || typeof value.dealerIndex !== 'number'
    || typeof value.turnIndex !== 'number'
    || !isUnknownArray(value.wall)
    || !isUnknownArray(value.discards)
    || !isUnknownArray(value.discardHistory)
    || !isUnknownArray(value.tableMelds)
    || !isUnknownArray(value.players)
    || value.players.length !== 4
    || !isTile(value.indicatorTile)
    || !isTileValue(value.indicator)
    || !isRuleConfig(value.rules)
    || !isRecord(value.turnContext)
    || !isRecord(value.turnContext.layoffCountByMeldId)
    || !isUnknownArray(value.turnContext.openingMeldIds)
    || !isUnknownArray(value.processedCommandIds)
    || !isStringRecord(value.processedCommandFingerprints)) return false;

  const players = value.players;
  const wall = value.wall;
  const discards = value.discards;
  const tableMelds = value.tableMelds;
  const discardHistory = value.discardHistory;
  const commandIds = value.processedCommandIds;
  const commandFingerprints = value.processedCommandFingerprints;

  if (!Number.isInteger(value.dealerIndex) || value.dealerIndex < 0 || value.dealerIndex >= players.length
    || !Number.isInteger(value.turnIndex) || value.turnIndex < 0 || value.turnIndex >= players.length) return false;

  if (!players.every(isPlayer) || !wall.every(isTile) || !discards.every(isTile) || !discardHistory.every(isDiscardRecord) || !tableMelds.every(isTableMeld)) return false;
  const playerIds = new Set(players.map((player) => player.id));
  if (discardHistory.some((record) => !playerIds.has(record.playerId)
    || (record.pickedBy !== undefined && !playerIds.has(record.pickedBy)))) return false;
  if (discardHistory.some((record, index) => index > 0 && record.sequence <= (discardHistory[index - 1]?.sequence ?? 0))) return false;
  const liveHistory = discardHistory.filter((record) => record.pickedBy === undefined);
  if (liveHistory.length !== discards.length || liveHistory.some((record, index) => record.tile.id !== discards[index]?.id)) return false;
  if (!Object.values(value.turnContext.layoffCountByMeldId).every((count) => typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 && count <= 2)) return false;
  if (!value.turnContext.openingMeldIds.every((id) => typeof id === 'string' && tableMelds.some((meld) => meld.id === id))) return false;
  if (tableMelds.some((meld) => !players.some((player) => player.id === meld.ownerId))) return false;
  if (identity.variant === 'classic' && tableMelds.length > 0) return false;
  if (new Set(tableMelds.map((meld) => meld.id)).size !== tableMelds.length) return false;
  if (players.some((player) => player.opened !== (player.openingMode !== undefined))) return false;
  try {
    for (const meld of tableMelds) {
      validateMeld({ kind: meld.kind, tileIds: meld.tiles.map((tile) => tile.id) }, meld.tiles, value.indicator);
    }
  } catch {
    return false;
  }

  const roundEndReason = value.roundEndReason;
  const winnerId = value.winnerId;
  if (roundEndReason !== undefined && roundEndReason !== 'finish' && roundEndReason !== 'wall_exhausted') return false;
  if (winnerId !== undefined && (typeof winnerId !== 'string' || !players.some((player) => player.id === winnerId))) return false;
  if (value.phase === 'round_finished') {
    if (roundEndReason === undefined) return false;
    if ((roundEndReason === 'finish') !== (winnerId !== undefined)) return false;
    const settlement = value.settlement;
    if (!isSettlement(settlement, players, roundEndReason, winnerId)) return false;
    if (settlement.profile !== (identity.variant === 'classic' ? 'classic-standard-v1' : '101-fixed-open-v1')) return false;
    if (roundEndReason === 'finish' && settlement.finishStyle === undefined) return false;
    if (roundEndReason === 'wall_exhausted' && settlement.finishStyle !== undefined) return false;
    if (players.some((player) => settlement.entries.find((entry) => entry.playerId === player.id)?.delta !== player.roundScore)) return false;
    const expectedSettlement = roundEndReason === 'wall_exhausted'
      ? settleRound(value as unknown as GameState, { reason: 'wall_exhausted' })
      : settleRound(value as unknown as GameState, {
        reason: 'finish',
        winnerId: winnerId ?? '',
        discard: discards.at(-1) ?? value.indicatorTile,
        melds: settlement.finishStyle === 'seven_pairs'
          ? Array.from({ length: 7 }, () => ({ kind: 'pair' as const, tileIds: [] }))
          : [],
      });
    if (!sameSettlement(settlement, expectedSettlement)) return false;
  } else if (roundEndReason !== undefined || winnerId !== undefined || value.settlement !== undefined) return false;

  const commandIdsValid = commandIds.every((id) => typeof id === 'string'
    && typeof commandFingerprints[id] === 'string');
  if (!commandIdsValid) return false;

  const tiles = [
    value.indicatorTile,
    ...wall,
    ...discards,
    ...tableMelds.flatMap((meld) => meld.tiles),
    ...players.flatMap((player) => player.rack),
  ];
  if (tiles.length !== 106 || new Set(tiles.map((tile) => tile.id)).size !== 106) return false;
  if (value.indicatorTile.kind !== 'normal'
    || value.indicatorTile.color !== value.indicator.color
    || value.indicatorTile.number !== value.indicator.number) return false;
  return true;
}

export function encodeOfflineMatch(game: GameState): string {
  return JSON.stringify({ version: STORAGE_VERSION, game });
}

export function decodeOfflineMatch(serialized: string, identity: MatchIdentity): GameState | undefined {
  try {
    const parsed: unknown = JSON.parse(serialized);
    let candidate = isRecord(parsed) && parsed.version === STORAGE_VERSION ? parsed.game : parsed;
    if (isRecord(parsed) && parsed.version === 2 && isRecord(parsed.game)) {
      const legacy = parsed.game;
      const discards = isUnknownArray(legacy.discards) ? legacy.discards.filter(isTile) : [];
      const players = isUnknownArray(legacy.players) ? legacy.players : [];
      const lastOwnerIndex = typeof legacy.turnIndex === 'number' && players.length > 0
        ? (legacy.turnIndex - 1 + players.length) % players.length
        : -1;
      const lastOwner = players[lastOwnerIndex];
      candidate = {
        ...legacy,
        players: players.map((player) => isRecord(player) ? { ...player, penalties: 0 } : player),
        discardHistory: discards.map((tile, index) => ({
          tile,
          playerId: index === discards.length - 1 && isRecord(lastOwner) && typeof lastOwner.id === 'string' ? lastOwner.id : 'p0',
          sequence: Math.max(1, index + 1),
        })),
        turnContext: { layoffCountByMeldId: {}, openingMeldIds: [] },
      };
    }
    if (isRecord(parsed) && parsed.version === 1 && isRecord(parsed.game)) {
      const legacy = parsed.game;
      const migrated: Record<string, unknown> = {
        ...legacy,
        tableMelds: [],
        discardHistory: [],
        turnContext: { layoffCountByMeldId: {}, openingMeldIds: [] },
        players: isUnknownArray(legacy.players)
          ? legacy.players.map((player) => isRecord(player) ? { ...player, penalties: 0 } : player)
          : legacy.players,
      };
      if (migrated.phase === 'round_finished' && migrated.roundEndReason === 'wall_exhausted') {
        const state = migrated as unknown as GameState;
        const settlement = settleRound(state, { reason: 'wall_exhausted' });
        candidate = {
          ...migrated,
          settlement,
          players: state.players.map((player) => ({
            ...player,
            roundScore: settlement.entries.find((entry) => entry.playerId === player.id)?.delta ?? 0,
          })),
        };
      } else {
        candidate = migrated;
      }
    }
    return isGameState(candidate, identity) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

export function offlineMatchIdentity(variant: GameVariant, seed: number): MatchIdentity {
  return { gameId: `offline-${variant}-${seed}`, variant, seed };
}
