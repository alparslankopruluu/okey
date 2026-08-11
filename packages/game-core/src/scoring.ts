import { effectiveValue, isJoker } from './tiles';
import type { FinishStyle, GameState, Meld, RoundSettlement, Tile } from './types';

export function rackFaceScore(rack: readonly Tile[], state: Pick<GameState, 'indicator'>): number {
  return rack.reduce((sum, tile) => {
    const value = effectiveValue(tile, state.indicator);
    return sum + (value === 'joker' ? 0 : value.number);
  }, 0);
}

export function rackPenaltyScore101(rack: readonly Tile[], state: Pick<GameState, 'indicator'>): number {
  return rack.reduce((sum, tile) => {
    if (isJoker(tile, state.indicator)) return sum + 101;
    const value = effectiveValue(tile, state.indicator);
    return sum + (value === 'joker' ? 101 : value.number);
  }, 0);
}

function finishStyle(state: GameState, winnerId: string, discard: Tile, melds: readonly Meld[]): FinishStyle {
  const winner = state.players.find((player) => player.id === winnerId);
  if (winner === undefined) throw new Error('Winner is missing from game state');
  const jokerFinish = isJoker(discard, state.indicator);
  if (state.variant === 'classic') {
    if (melds.length === 7 && melds.every((meld) => meld.kind === 'pair')) return 'seven_pairs';
    return jokerFinish ? 'joker' : 'normal';
  }
  if (!winner.opened) return jokerFinish ? 'hand_joker' : 'hand';
  if (winner.openingMode === 'pairs') return jokerFinish ? 'pairs_joker' : 'pairs';
  return jokerFinish ? 'joker' : 'normal';
}

export function settleRound(
  state: GameState,
  input: { readonly reason: 'wall_exhausted' } | { readonly reason: 'finish'; readonly winnerId: string; readonly discard: Tile; readonly melds: readonly Meld[] },
): RoundSettlement {
  if (input.reason === 'wall_exhausted') {
    return {
      profile: state.variant === 'classic' ? 'classic-standard-v1' : '101-fixed-open-v1',
      reason: input.reason,
      entries: state.players.map((player) => ({
        playerId: player.id,
        delta: state.variant === '101' ? player.rack.filter((tile) => isJoker(tile, state.indicator)).length * 101 : 0,
        deadwood: state.variant === '101' ? rackPenaltyScore101(player.rack, state) : rackFaceScore(player.rack, state),
        opened: player.opened,
        winner: false,
      })),
    };
  }

  const style = finishStyle(state, input.winnerId, input.discard, input.melds);
  if (state.variant === 'classic') {
    const loss = style === 'normal' ? -2 : -4;
    return {
      profile: 'classic-standard-v1',
      reason: 'finish',
      finishStyle: style,
      winnerId: input.winnerId,
      entries: state.players.map((player) => ({
        playerId: player.id,
        delta: player.id === input.winnerId ? 0 : loss,
        deadwood: player.id === input.winnerId ? 0 : rackFaceScore(player.rack, state),
        opened: player.opened,
        winner: player.id === input.winnerId,
      })),
    };
  }

  const pairWinner = style === 'pairs' || style === 'pairs_joker';
  const handWinner = style === 'hand' || style === 'hand_joker';
  const jokerWinner = style === 'joker' || style === 'pairs_joker' || style === 'hand_joker';
  const baseMultiplier = pairWinner || handWinner ? 2 : 1;
  const jokerMultiplier = jokerWinner ? 2 : 1;
  return {
    profile: '101-fixed-open-v1',
    reason: 'finish',
    finishStyle: style,
    winnerId: input.winnerId,
    entries: state.players.map((player) => {
      const winner = player.id === input.winnerId;
      const deadwood = winner ? 0 : rackPenaltyScore101(player.rack, state);
      let delta: number;
      if (winner) {
        delta = -101 * baseMultiplier * jokerMultiplier;
      } else if (!player.opened) {
        delta = pairWinner ? 404 : 202 * baseMultiplier * jokerMultiplier;
      } else {
        const pairLoserMultiplier = player.openingMode === 'pairs' ? 2 : 1;
        delta = deadwood * pairLoserMultiplier * baseMultiplier * jokerMultiplier;
      }
      return { playerId: player.id, delta, deadwood, opened: player.opened, winner };
    }),
  };
}
