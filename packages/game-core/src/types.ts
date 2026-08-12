export const TILE_COLORS = ['red', 'blue', 'black', 'yellow'] as const;

export type TileColor = (typeof TILE_COLORS)[number];
export type TileNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type GameVariant = 'classic' | '101';
export type GamePhase = 'awaiting_draw' | 'awaiting_discard' | 'round_finished';
export type RoundEndReason = 'finish' | 'wall_exhausted';
export type OpeningMode = 'melds' | 'pairs';
export type FinishStyle = 'normal' | 'joker' | 'pairs' | 'pairs_joker' | 'hand' | 'hand_joker' | 'seven_pairs';

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

export interface TableMeld {
  readonly id: string;
  readonly ownerId: string;
  readonly kind: Meld['kind'];
  readonly tiles: readonly Tile[];
}

export interface RoundScoreEntry {
  readonly playerId: string;
  readonly delta: number;
  readonly deadwood: number;
  readonly opened: boolean;
  readonly winner: boolean;
  readonly penalties?: number;
}

export interface RoundSettlement {
  readonly profile: 'classic-standard-v1' | '101-fixed-open-v1';
  readonly reason: RoundEndReason;
  readonly finishStyle?: FinishStyle;
  readonly winnerId?: string;
  /** Multiple winners are possible when a 101 wall exhausts. */
  readonly winnerIds?: readonly string[];
  readonly entries: readonly RoundScoreEntry[];
}

export interface PlayerState {
  readonly id: string;
  readonly rack: readonly Tile[];
  readonly opened: boolean;
  readonly openingMode?: OpeningMode;
  readonly roundScore: number;
  /** Rule penalties accrued during this hand, separate from deadwood. */
  readonly penalties?: number;
}

/** Historical ownership metadata. The tile itself remains only in `discards`. */
export interface DiscardRecord {
  readonly tileId: string;
  readonly playerId: string;
  readonly sequence: number;
  readonly pickedBy?: string;
}

export interface TurnContext {
  readonly layoffCountByMeldId: Readonly<Record<string, number>>;
}

export interface MatchConfig {
  readonly openingThresholdMode: 'fixed' | 'progressive';
  readonly roundCount: 1 | 2 | 3 | 4;
  readonly assistanceMode: 'assisted' | 'unassisted';
  readonly economyMode: 'casual' | 'mock_stake_100';
}

export interface MatchRoundSummary {
  readonly round: number;
  readonly starterIndex: number;
  readonly settlement: RoundSettlement;
}

export interface MatchState {
  readonly gameId: string;
  readonly variant: GameVariant;
  readonly playerIds: readonly [string, string, string, string];
  readonly seed: number;
  readonly config: MatchConfig;
  readonly completedRounds: readonly MatchRoundSummary[];
  readonly penaltiesByPlayerId: Readonly<Record<string, number>>;
  readonly lastSuccessfulSeriesOpeningPoints?: number;
  readonly lastSuccessfulPairsOpeningCount?: number;
  readonly winnerIds: readonly string[];
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
  readonly discardHistory: readonly DiscardRecord[];
  readonly tableMelds: readonly TableMeld[];
  readonly turnContext: TurnContext;
  readonly players: readonly PlayerState[];
  readonly rules: RuleConfig;
  readonly processedCommandIds: readonly string[];
  readonly processedCommandFingerprints: Readonly<Record<string, string>>;
  readonly winnerId?: string;
  readonly roundEndReason?: RoundEndReason;
  readonly settlement?: RoundSettlement;
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
  | (CommandBase & { readonly type: 'extend_meld'; readonly tableMeldId: string; readonly tileIds: readonly string[] })
  | (CommandBase & { readonly type: 'finish'; readonly discardTileId: string; readonly melds: readonly Meld[] });

export type GameEvent =
  | { readonly type: 'tile_drawn'; readonly playerId: string; readonly tile: Tile; readonly source: 'wall' | 'discard' }
  | { readonly type: 'tile_discarded'; readonly playerId: string; readonly tile: Tile }
  | { readonly type: 'melds_opened'; readonly playerId: string; readonly melds: readonly Meld[]; readonly tableMeldIds: readonly string[]; readonly points: number }
  | { readonly type: 'meld_extended'; readonly playerId: string; readonly tableMeldId: string; readonly tileIds: readonly string[] }
  | { readonly type: 'turn_advanced'; readonly turnIndex: number }
  | { readonly type: 'round_finished'; readonly reason: 'finish'; readonly playerId: string; readonly discard: Tile; readonly settlement: RoundSettlement }
  | { readonly type: 'round_finished'; readonly reason: 'wall_exhausted'; readonly discard: Tile; readonly settlement: RoundSettlement };

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
