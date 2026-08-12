import { createGame, DEFAULT_RULES } from './game';
import type { GameState, GameVariant, MatchConfig, MatchRoundSummary, MatchState, RoundSettlement } from './types';

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  openingThresholdMode: 'fixed',
  roundCount: 1,
  assistanceMode: 'assisted',
  economyMode: 'casual',
};

export function createMatch(options: {
  readonly gameId: string;
  readonly variant: GameVariant;
  readonly playerIds: readonly [string, string, string, string];
  readonly seed: number;
  readonly config?: Partial<MatchConfig>;
}): MatchState {
  const config = { ...DEFAULT_MATCH_CONFIG, ...options.config };
  if (!Number.isInteger(config.roundCount) || config.roundCount < 1 || config.roundCount > 4) {
    throw new Error('Match round count must be between one and four');
  }
  if (new Set(options.playerIds).size !== 4 || options.playerIds.some((id) => id.length === 0)) {
    throw new Error('Match player IDs must be non-empty and unique');
  }
  return {
    gameId: options.gameId,
    variant: options.variant,
    playerIds: options.playerIds,
    seed: options.seed,
    config: config as MatchConfig,
    completedRounds: [],
    penaltiesByPlayerId: Object.fromEntries(options.playerIds.map((id) => [id, 0])),
    winnerIds: [],
  };
}

/** Creates the deterministic next hand. Starter/dealer rotates clockwise every round. */
export function createMatchRound(match: MatchState): GameState {
  if (match.completedRounds.length >= match.config.roundCount) throw new Error('Match is already complete');
  const round = match.completedRounds.length;
  const seriesThreshold = match.config.openingThresholdMode === 'progressive'
    ? (match.lastSuccessfulSeriesOpeningPoints ?? DEFAULT_RULES.openingPoints101) + (match.lastSuccessfulSeriesOpeningPoints === undefined ? 0 : 1)
    : DEFAULT_RULES.openingPoints101;
  const pairThreshold = match.config.openingThresholdMode === 'progressive'
    ? (match.lastSuccessfulPairsOpeningCount ?? DEFAULT_RULES.pairsRequiredToOpen101) + (match.lastSuccessfulPairsOpeningCount === undefined ? 0 : 1)
    : DEFAULT_RULES.pairsRequiredToOpen101;
  return createGame({
    gameId: `${match.gameId}:round:${round + 1}`,
    variant: match.variant,
    playerIds: match.playerIds,
    seed: (match.seed + round) >>> 0,
    dealerIndex: round % match.playerIds.length,
    rules: {
      ...DEFAULT_RULES,
      openingPoints101: seriesThreshold,
      pairsRequiredToOpen101: pairThreshold,
    },
  });
}

export function recordMatchRound(
  match: MatchState,
  settlement: RoundSettlement,
  opening?: { readonly seriesPoints?: number; readonly pairsCount?: number },
): MatchState {
  if (match.completedRounds.length >= match.config.roundCount) throw new Error('Match is already complete');
  const known = new Set(match.playerIds);
  if (settlement.entries.length !== 4 || settlement.entries.some((entry) => !known.has(entry.playerId))) {
    throw new Error('Settlement does not match this match players');
  }
  const round: MatchRoundSummary = {
    round: match.completedRounds.length + 1,
    starterIndex: match.completedRounds.length % match.playerIds.length,
    settlement,
  };
  const penaltiesByPlayerId = { ...match.penaltiesByPlayerId };
  for (const entry of settlement.entries) {
    penaltiesByPlayerId[entry.playerId] = (penaltiesByPlayerId[entry.playerId] ?? 0) + entry.deadwood + (entry.penalties ?? 0);
  }
  const completedRounds = [...match.completedRounds, round];
  const completed = completedRounds.length === match.config.roundCount;
  const minimum = completed ? Math.min(...match.playerIds.map((id) => penaltiesByPlayerId[id] ?? 0)) : undefined;
  return {
    ...match,
    completedRounds,
    penaltiesByPlayerId,
    ...((opening?.seriesPoints ?? match.lastSuccessfulSeriesOpeningPoints) === undefined ? {} : {
      lastSuccessfulSeriesOpeningPoints: opening?.seriesPoints ?? match.lastSuccessfulSeriesOpeningPoints,
    }),
    ...((opening?.pairsCount ?? match.lastSuccessfulPairsOpeningCount) === undefined ? {} : {
      lastSuccessfulPairsOpeningCount: opening?.pairsCount ?? match.lastSuccessfulPairsOpeningCount,
    }),
    winnerIds: minimum === undefined ? [] : match.playerIds.filter((id) => penaltiesByPlayerId[id] === minimum),
  };
}
