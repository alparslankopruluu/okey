export type RackDropDirection = 'up' | 'left';

export type RackGestureOutcome =
  | { readonly kind: 'discard' }
  | { readonly kind: 'move'; readonly delta: number }
  | { readonly kind: 'none' };

interface RackGestureInput {
  readonly translationX: number;
  readonly translationY: number;
  readonly tileWidth: number;
  readonly rowStride: number;
  readonly rowStep: number;
  readonly discardEnabled: boolean;
  readonly discardDirection: RackDropDirection;
}

const DISCARD_DISTANCE = 52;

/**
 * Resolves the final rack gesture without coupling game legality to animation.
 * A deliberate table-facing drag wins over rack reordering; every gesture keeps
 * the existing labelled tap fallback in the UI.
 */
export function resolveRackGesture(input: RackGestureInput): RackGestureOutcome {
  const primary = input.discardDirection === 'up' ? -input.translationY : -input.translationX;
  const cross = input.discardDirection === 'up' ? Math.abs(input.translationX) : Math.abs(input.translationY);
  if (input.discardEnabled && primary >= DISCARD_DISTANCE && cross <= primary * 0.8) {
    return { kind: 'discard' };
  }

  const columnDelta = Math.round(input.translationX / Math.max(input.tileWidth, 1));
  const rowDelta = input.rowStride === 0
    ? 0
    : Math.round(input.translationY / Math.max(input.rowStep, 1)) * input.rowStride;
  const delta = columnDelta + rowDelta;
  return delta === 0 ? { kind: 'none' } : { kind: 'move', delta };
}

/** A calm human-readable beat between authoritative bot turns. */
export function botTurnDelayMs(sequence: number, commandType?: 'draw_wall' | 'draw_discard' | 'open_melds' | 'take_back_opening' | 'extend_meld' | 'discard' | 'finish'): number {
  const variation = (Math.abs(sequence) % 4) * 70;
  if (commandType === 'open_melds' || commandType === 'extend_meld') return 620 + variation;
  if (commandType === 'draw_wall') return 920 + variation;
  return 1080 + variation;
}
