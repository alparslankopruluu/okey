import {
  createMatch,
  createMatchRound,
  recordMatchRound,
  settleRound,
  validateMeld,
  type GamePhase,
  type GameState,
  type GameVariant,
  type MatchConfig,
  type MatchState,
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
const SESSION_VERSION = 4;
const PHASES: readonly GamePhase[] = ['awaiting_draw', 'awaiting_discard', 'round_finished'];
const COLORS = new Set(['red', 'blue', 'black', 'yellow']);

type MatchIdentity = Pick<GameState, 'gameId' | 'variant' | 'seed'>;

export interface OfflineMatchSession {
  readonly match: MatchState;
  readonly currentRound: GameState;
  readonly completedRoundStates: readonly GameState[];
}

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
    && Number.isSafeInteger(value.pairsRequiredToOpen101) && Number(value.pairsRequiredToOpen101) >= 1
    && Number.isSafeInteger(value.openingPoints101) && Number(value.openingPoints101) >= 1
    && typeof value.progressiveOpening101 === 'boolean'
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
    && (value.openingPoints === undefined || (Number.isSafeInteger(value.openingPoints) && Number(value.openingPoints) >= 0))
    && (value.openingPairsCount === undefined || (Number.isSafeInteger(value.openingPairsCount) && Number(value.openingPairsCount) >= 0))
    && (value.openingPoints === undefined || (value.opened && value.openingMode === 'melds'))
    && (value.openingPairsCount === undefined || (value.opened && value.openingMode === 'pairs'))
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

function isMatchConfig(value: unknown): value is MatchConfig {
  return isRecord(value)
    && (value.openingThresholdMode === 'fixed' || value.openingThresholdMode === 'progressive')
    && Number.isInteger(value.roundCount) && Number(value.roundCount) >= 1 && Number(value.roundCount) <= 4
    && (value.assistanceMode === 'assisted' || value.assistanceMode === 'unassisted')
    && ['casual', 'mock_stake_100', 'mock_stake_500', 'mock_stake_1000'].includes(String(value.economyMode));
}

function isMatchState(value: unknown, identity: MatchIdentity): value is MatchState {
  if (!isRecord(value) || value.variant !== identity.variant || value.seed !== identity.seed
    || typeof value.gameId !== 'string' || !isUnknownArray(value.playerIds) || value.playerIds.length !== 4
    || new Set(value.playerIds).size !== 4 || !value.playerIds.every((id) => typeof id === 'string' && id.length > 0)
    || !isMatchConfig(value.config) || !isUnknownArray(value.completedRounds)
    || value.completedRounds.length > value.config.roundCount || !isRecord(value.penaltiesByPlayerId)
    || !isUnknownArray(value.winnerIds)) return false;
  const ids = new Set(value.playerIds as string[]);
  if (Object.keys(value.penaltiesByPlayerId).length !== 4
    || Object.entries(value.penaltiesByPlayerId).some(([id, total]) => !ids.has(id) || !Number.isSafeInteger(total))
    || !value.winnerIds.every((id) => typeof id === 'string' && ids.has(id))) return false;
  const players = (value.playerIds as string[]).map((id) => ({ id, rack: [], opened: false, roundScore: 0 }));
  if (!value.completedRounds.every((round, index) => isRecord(round)
    && round.round === index + 1 && round.starterIndex === index % 4
    && isRecord(round.settlement)
    && (round.opening === undefined || (isRecord(round.opening)
      && (round.opening.seriesPoints === undefined || Number.isSafeInteger(round.opening.seriesPoints))
      && (round.opening.pairsCount === undefined || Number.isSafeInteger(round.opening.pairsCount))))
    && isSettlement(round.settlement, players, round.settlement.reason as RoundEndReason, round.settlement.winnerId as string | undefined))) return false;
  try {
    let rebuilt = createMatch({
      gameId: value.gameId,
      variant: value.variant as GameVariant,
      playerIds: value.playerIds as unknown as [string, string, string, string],
      seed: value.seed,
      config: value.config,
    });
    for (const round of value.completedRounds as MatchState['completedRounds']) {
      rebuilt = recordMatchRound(rebuilt, round.settlement, round.opening);
    }
    return JSON.stringify(rebuilt) === JSON.stringify(value);
  } catch {
    return false;
  }
}

export function createOfflineMatchSession(identity: MatchIdentity, config: Partial<MatchConfig> = {}): OfflineMatchSession {
  const match = createMatch({ gameId: identity.gameId, variant: identity.variant, playerIds: ['p0', 'p1', 'p2', 'p3'], seed: identity.seed, config });
  return { match, currentRound: createMatchRound(match), completedRoundStates: [] };
}

export function encodeOfflineMatchSession(session: OfflineMatchSession): string {
  return JSON.stringify({ version: SESSION_VERSION, ...session });
}

export function decodeOfflineMatchSession(serialized: string, identity: MatchIdentity): OfflineMatchSession | undefined {
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (isRecord(parsed) && parsed.version === SESSION_VERSION && isMatchState(parsed.match, identity)) {
      let match = parsed.match;
      if (!isUnknownArray(parsed.completedRoundStates)) return undefined;
      const completedRoundStates = parsed.completedRoundStates;
      if (completedRoundStates.length !== match.completedRounds.length) return undefined;
      for (let index = 0; index < completedRoundStates.length; index += 1) {
        const summary = match.completedRounds[index];
        const terminal = completedRoundStates[index];
        const terminalIdentity = { gameId: `${identity.gameId}:round:${String(index + 1)}`, variant: identity.variant, seed: (identity.seed + index) >>> 0 };
        if (summary === undefined || !isGameState(terminal, terminalIdentity) || terminal.phase !== 'round_finished'
          || terminal.settlement === undefined || !sameSettlement(terminal.settlement, summary.settlement)
          || terminal.dealerIndex !== summary.starterIndex) return undefined;
      }
      const validatedCompletedRoundStates = completedRoundStates as GameState[];
      if (isRecord(parsed.currentRound) && parsed.currentRound.phase === 'round_finished') {
        const expectedNextId = `${identity.gameId}:round:${String(match.completedRounds.length + 1)}`;
        const expectedNextSeed = (identity.seed + match.completedRounds.length) >>> 0;
        const nextIdentity = { gameId: expectedNextId, variant: identity.variant, seed: expectedNextSeed };
        if (isGameState(parsed.currentRound, nextIdentity) && parsed.currentRound.settlement !== undefined) {
          const seriesPoints = Math.max(...parsed.currentRound.players.flatMap((player) => player.openingPoints === undefined ? [] : [player.openingPoints]));
          const pairsCount = Math.max(...parsed.currentRound.players.flatMap((player) => player.openingPairsCount === undefined ? [] : [player.openingPairsCount]));
          match = recordMatchRound(match, parsed.currentRound.settlement, {
            ...(Number.isFinite(seriesPoints) ? { seriesPoints } : {}),
            ...(Number.isFinite(pairsCount) ? { pairsCount } : {}),
          });
          return { match, currentRound: parsed.currentRound, completedRoundStates: [...validatedCompletedRoundStates, parsed.currentRound] };
        }
        const roundNumber = match.completedRounds.length;
        const summary = match.completedRounds.at(-1);
        const roundIdentity = { gameId: `${identity.gameId}:round:${String(roundNumber)}`, variant: identity.variant, seed: (identity.seed + roundNumber - 1) >>> 0 };
        return roundNumber > 0 && summary !== undefined
          && isGameState(parsed.currentRound, roundIdentity)
          && parsed.currentRound.dealerIndex === summary.starterIndex
          && sameSettlement(parsed.currentRound.settlement as RoundSettlement, summary.settlement)
          ? { match, currentRound: parsed.currentRound, completedRoundStates: validatedCompletedRoundStates }
          : undefined;
      }
      if (match.completedRounds.length >= match.config.roundCount) return undefined;
      const expected = createMatchRound(match);
      const currentIdentity = { gameId: expected.gameId, variant: expected.variant, seed: expected.seed };
      return isGameState(parsed.currentRound, currentIdentity)
        && parsed.currentRound.dealerIndex === expected.dealerIndex
        && JSON.stringify(parsed.currentRound.rules) === JSON.stringify(expected.rules)
        ? { match, currentRound: parsed.currentRound, completedRoundStates: validatedCompletedRoundStates }
        : undefined;
    }
    const legacy = decodeOfflineMatch(serialized, identity);
    if (legacy === undefined) return undefined;
    const match = createMatch({ gameId: identity.gameId, variant: identity.variant, playerIds: ['p0', 'p1', 'p2', 'p3'], seed: identity.seed });
    return { match, currentRound: { ...legacy, gameId: `${identity.gameId}:round:1` }, completedRoundStates: [] };
  } catch {
    return undefined;
  }
}
