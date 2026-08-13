import { createGame, DEFAULT_RULES } from './game';
import type { GameState, GameVariant, MatchConfig, MatchEconomySettlement, MatchRoundSummary, MatchState, RoundSettlement } from './types';

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
    config,
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
    penaltiesByPlayerId[entry.playerId] = (penaltiesByPlayerId[entry.playerId] ?? 0) + entry.delta;
  }
  const completedRounds = [...match.completedRounds, round];
  const completed = completedRounds.length === match.config.roundCount;
  const totals = match.playerIds.map((id) => penaltiesByPlayerId[id] ?? 0);
  const winningTotal = completed
    ? match.variant === 'classic' ? Math.max(...totals) : Math.min(...totals)
    : undefined;
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
    winnerIds: winningTotal === undefined ? [] : match.playerIds.filter((id) => penaltiesByPlayerId[id] === winningTotal),
  };
}

/** Pure mock-stake settlement. These chips have no transfer or real-world value. */
export function settleMatchEconomy(match: MatchState): MatchEconomySettlement {
  if (match.completedRounds.length !== match.config.roundCount) throw new Error('Match must be complete before economy settlement');
  if (match.config.economyMode === 'casual') {
    return { mode: 'casual', refunded: false, entries: match.playerIds.map((playerId) => ({ playerId, stake: 0, payout: 0, net: 0, eligible: true })) };
  }
  const stake = Number(match.config.economyMode.slice('mock_stake_'.length));
  if (![100, 500, 1000].includes(stake)) throw new Error('Unsupported mock stake');
  const eligible = match.variant === 'classic'
    ? [...match.playerIds]
    : match.playerIds.filter((playerId) => match.completedRounds.some((round) => round.settlement.entries.some((entry) => entry.playerId === playerId && entry.opened)));
  if (eligible.length === 0) {
    return { mode: match.config.economyMode, refunded: true, entries: match.playerIds.map((playerId) => ({ playerId, stake, payout: stake, net: 0, eligible: false })) };
  }
  const ranked = [...eligible].sort((left, right) => (match.penaltiesByPlayerId[left] ?? 0) - (match.penaltiesByPlayerId[right] ?? 0) || left.localeCompare(right, 'en'));
  const payouts = new Map<string, number>();
  if (ranked.length === 1) {
    payouts.set(ranked[0] ?? '', stake * 4);
  } else {
    const firstScore = match.penaltiesByPlayerId[ranked[0] ?? ''] ?? 0;
    const firstTie = ranked.filter((id) => (match.penaltiesByPlayerId[id] ?? 0) === firstScore);
    if (firstTie.length > 1) {
      distributePool(payouts, firstTie, stake * 4);
    } else {
      payouts.set(ranked[0] ?? '', stake * 3);
      const secondScore = match.penaltiesByPlayerId[ranked[1] ?? ''] ?? 0;
      const secondTie = ranked.slice(1).filter((id) => (match.penaltiesByPlayerId[id] ?? 0) === secondScore);
      distributePool(payouts, secondTie, stake);
    }
  }
  return {
    mode: match.config.economyMode,
    refunded: false,
    entries: match.playerIds.map((playerId) => {
      const payout = payouts.get(playerId) ?? 0;
      return { playerId, stake, payout, net: payout - stake, eligible: eligible.includes(playerId) };
    }),
  };
}

function distributePool(payouts: Map<string, number>, playerIds: readonly string[], pool: number): void {
  const ordered = [...playerIds].sort((left, right) => left.localeCompare(right, 'en'));
  const base = Math.floor(pool / ordered.length);
  let remainder = pool - base * ordered.length;
  for (const playerId of ordered) {
    payouts.set(playerId, base + (remainder > 0 ? 1 : 0));
    remainder = Math.max(0, remainder - 1);
  }
}
