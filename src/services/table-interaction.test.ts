import { describe, expect, it } from 'vitest';
import { botTurnDelayMs, resolveRackGesture } from './table-interaction';

describe('table interaction policy', () => {
  it('paces deterministic bots with a readable bounded pause', () => {
    expect([0, 1, 2, 3, 4].map((sequence) => botTurnDelayMs(sequence))).toEqual([1080, 1150, 1220, 1290, 1080]);
    expect(botTurnDelayMs(2, 'draw_wall')).toBe(1060);
    expect(botTurnDelayMs(2, 'open_melds')).toBe(760);
  });

  it('discards only when an enabled portrait drag is clearly toward the table', () => {
    const base = { tileWidth: 40, rowStride: 8, rowStep: 65, discardEnabled: true, discardDirection: 'up' as const };
    expect(resolveRackGesture({ ...base, translationX: 10, translationY: -74 })).toEqual({ kind: 'discard' });
    expect(resolveRackGesture({ ...base, translationX: 70, translationY: -20 })).toEqual({ kind: 'move', delta: 2 });
    expect(resolveRackGesture({ ...base, translationX: 4, translationY: -74, discardEnabled: false })).toEqual({ kind: 'move', delta: -8 });
  });

  it('uses a leftward table drop in landscape and preserves rack reordering', () => {
    const base = { tileWidth: 40, rowStride: 8, rowStep: 65, discardEnabled: true, discardDirection: 'left' as const };
    expect(resolveRackGesture({ ...base, translationX: -72, translationY: 8 })).toEqual({ kind: 'discard' });
    expect(resolveRackGesture({ ...base, translationX: 82, translationY: 4 })).toEqual({ kind: 'move', delta: 2 });
    expect(resolveRackGesture({ ...base, translationX: 6, translationY: 5 })).toEqual({ kind: 'none' });
  });
});
