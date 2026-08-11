import { applyCommand } from './game';
import { createSeededRandom } from './random';
import { effectiveValue, isJoker } from './tiles';
import { type GameCommand, type GameState, type Tile } from './types';

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

export interface BotRoundSimulation {
  readonly state: GameState;
  readonly commands: readonly GameCommand[];
}

export function playDeterministicBotRound(initial: GameState, maxCommands = 512): BotRoundSimulation {
  let state = initial;
  const commands: GameCommand[] = [];

  while (state.phase !== 'round_finished') {
    if (commands.length >= maxCommands) throw new Error(`Bot round exceeded ${maxCommands} commands`);
    const player = state.players[state.turnIndex];
    if (player === undefined) throw new Error('Bot round has no active player');
    const command: GameCommand = state.phase === 'awaiting_draw'
      ? {
          type: 'draw_wall',
          commandId: `simulation-${state.sequence}-draw`,
          playerId: player.id,
          expectedSequence: state.sequence,
        }
      : {
          type: 'discard',
          tileId: chooseBotDiscard(state, player.id, state.sequence),
          commandId: `simulation-${state.sequence}-discard`,
          playerId: player.id,
          expectedSequence: state.sequence,
        };
    commands.push(command);
    state = applyCommand(state, command).state;
  }

  return { state, commands };
}
