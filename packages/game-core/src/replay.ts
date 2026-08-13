import { applyCommand } from './game';
import { type GameCommand, type GameState } from './types';

export function replay(initial: GameState, commands: readonly GameCommand[]): GameState {
  return commands.reduce((state, command) => applyCommand(state, command).state, initial);
}

/** Replays only the authoritative command tail after a validated snapshot. */
export function replayFromSnapshot(snapshot: GameState, commandTail: readonly GameCommand[]): GameState {
  return replay(snapshot, commandTail);
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

/** Portable deterministic digest for replay/evidence comparisons; not a security MAC. */
export function stateDigest(state: GameState): string {
  const input = stableSerialize(state);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
