import { applyCommand } from './game';
import { type GameCommand, type GameState } from './types';

export function replay(initial: GameState, commands: readonly GameCommand[]): GameState {
  return commands.reduce((state, command) => applyCommand(state, command).state, initial);
}
