import type { GamePhase, GameState, GameVariant, PlayerState, RuleConfig, Tile, TileValue } from '@luma/game-core';

const STORAGE_VERSION = 1;
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
  if (value.kind === 'false_joker') return value.color === undefined && value.number === undefined;
  return value.kind === 'normal'
    && typeof value.color === 'string'
    && COLORS.has(value.color)
    && typeof value.number === 'number'
    && Number.isInteger(value.number)
    && value.number >= 1
    && value.number <= 13;
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
    && typeof value.roundScore === 'number';
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
    || !isUnknownArray(value.players)
    || value.players.length !== 4
    || !isTile(value.indicatorTile)
    || !isTileValue(value.indicator)
    || !isRuleConfig(value.rules)
    || !isUnknownArray(value.processedCommandIds)
    || !isStringRecord(value.processedCommandFingerprints)) return false;

  const players = value.players;
  const wall = value.wall;
  const discards = value.discards;
  const commandIds = value.processedCommandIds;
  const commandFingerprints = value.processedCommandFingerprints;

  if (!Number.isInteger(value.dealerIndex) || value.dealerIndex < 0 || value.dealerIndex >= players.length
    || !Number.isInteger(value.turnIndex) || value.turnIndex < 0 || value.turnIndex >= players.length) return false;

  if (!players.every(isPlayer) || !wall.every(isTile) || !discards.every(isTile)) return false;

  const commandIdsValid = commandIds.every((id) => typeof id === 'string'
    && typeof commandFingerprints[id] === 'string');
  if (!commandIdsValid) return false;

  const tiles = [
    value.indicatorTile,
    ...wall,
    ...discards,
    ...players.flatMap((player) => player.rack),
  ];
  return tiles.length === 106 && new Set(tiles.map((tile) => tile.id)).size === 106;
}

export function encodeOfflineMatch(game: GameState): string {
  return JSON.stringify({ version: STORAGE_VERSION, game });
}

export function decodeOfflineMatch(serialized: string, identity: MatchIdentity): GameState | undefined {
  try {
    const parsed: unknown = JSON.parse(serialized);
    const candidate = isRecord(parsed) && parsed.version === STORAGE_VERSION ? parsed.game : parsed;
    return isGameState(candidate, identity) ? candidate : undefined;
  } catch {
    return undefined;
  }
}

export function offlineMatchIdentity(variant: GameVariant, seed: number): MatchIdentity {
  return { gameId: `offline-${variant}-${seed}`, variant, seed };
}
