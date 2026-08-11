import { createSeededRandom } from './random';
import { effectiveValue, isJoker } from './tiles';
import { type GameState, type Tile } from './types';

function tileUtility(tile: Tile, rack: readonly Tile[], state: GameState): number {
  if (isJoker(tile, state.indicator)) return 100;
  const value = effectiveValue(tile, state.indicator);
  if (value === 'joker') return 100;
  return rack.reduce((score, other) => {
    if (other.id === tile.id) return score;
    const otherValue = effectiveValue(other, state.indicator);
    if (otherValue === 'joker') return score + 2;
    if (otherValue.number === value.number && otherValue.color !== value.color) return score + 4;
    if (otherValue.color === value.color && Math.abs(otherValue.number - value.number) <= 2) return score + 3;
    return score;
  }, 0);
}

export function chooseBotDiscard(state: GameState, playerId: string, decisionIndex: number): string {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player === undefined || player.rack.length === 0) throw new Error('Bot player has no rack');
  const scored = player.rack.map((tile) => ({ tile, utility: tileUtility(tile, player.rack, state) }));
  const minimum = Math.min(...scored.map((item) => item.utility));
  const candidates = scored
    .filter((item) => item.utility === minimum)
    .sort((left, right) => left.tile.id.localeCompare(right.tile.id, 'en'));
  const random = createSeededRandom(state.seed ^ state.sequence ^ decisionIndex);
  const selected = candidates[random.int(candidates.length)];
  if (selected === undefined) throw new Error('Bot could not select a discard');
  return selected.tile.id;
}
