export const TILE_COLORS = ['red', 'blue', 'black', 'yellow'] as const;

export type TileColor = (typeof TILE_COLORS)[number];
export type TileNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type GameVariant = 'classic' | '101';
export type GamePhase = 'awaiting_draw' | 'awaiting_discard' | 'round_finished';

export interface Tile {
  readonly id: string;
  readonly kind: 'normal' | 'false_joker';
  readonly copy: 0 | 1;
  readonly color?: TileColor;
  readonly number?: TileNumber;
}

export interface TileValue {
  readonly color: TileColor;
  readonly number: TileNumber;
}

export interface Meld {
  readonly kind: 'sequence' | 'set' | 'pair';
  readonly tileIds: readonly string[];
}

export interface PlayerState {
  readonly id: string;
  readonly rack: readonly Tile[];
  readonly opened: boolean;
  readonly roundScore: number;
}

export interface RuleConfig {
  readonly allowSevenPairsClassic: boolean;
  readonly classicHighAceRun: boolean;
  readonly allowPairsOpening101: boolean;
  readonly pairsRequiredToOpen101: number;
  readonly openingPoints101: number;
  readonly allowDirectFinishBelowThreshold101: boolean;
  readonly allowDiscardPickupWithoutImmediateUse: boolean;
  readonly discardProbePolicy: 'allow_return' | 'commit_or_penalty';
  readonly tableJokerRetrieval: 'locked' | 'replace_after_open';
  readonly playableDiscardPenalty: 'automatic' | 'claim_required' | 'off';
}

export interface GameState {
  readonly gameId: string;
  readonly variant: GameVariant;
  readonly seed: number;
  readonly sequence: number;
  readonly phase: GamePhase;
  readonly dealerIndex: number;
  readonly turnIndex: number;
  readonly indicatorTile: Tile;
  readonly indicator: TileValue;
  readonly wall: readonly Tile[];
  readonly discards: readonly Tile[];
  readonly players: readonly PlayerState[];
  readonly rules: RuleConfig;
  readonly processedCommandIds: readonly string[];
  readonly processedCommandFingerprints: Readonly<Record<string, string>>;
  readonly winnerId?: string;
}

interface CommandBase {
  readonly commandId: string;
  readonly playerId: string;
  readonly expectedSequence: number;
}

export type GameCommand =
  | (CommandBase & { readonly type: 'draw_wall' })
  | (CommandBase & { readonly type: 'draw_discard' })
  | (CommandBase & { readonly type: 'discard'; readonly tileId: string })
  | (CommandBase & { readonly type: 'open_melds'; readonly melds: readonly Meld[] })
  | (CommandBase & { readonly type: 'finish'; readonly discardTileId: string; readonly melds: readonly Meld[] });

export type GameEvent =
  | { readonly type: 'tile_drawn'; readonly playerId: string; readonly tile: Tile; readonly source: 'wall' | 'discard' }
  | { readonly type: 'tile_discarded'; readonly playerId: string; readonly tile: Tile }
  | { readonly type: 'melds_opened'; readonly playerId: string; readonly melds: readonly Meld[]; readonly points: number }
  | { readonly type: 'turn_advanced'; readonly turnIndex: number }
  | { readonly type: 'round_finished'; readonly playerId: string; readonly discard: Tile };

export interface CommandResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  readonly duplicate: boolean;
}

export class GameRuleError extends Error {
  public constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'GameRuleError';
  }
}
