import { TILE_COLORS, type Tile, type TileColor, type TileNumber, type TileValue } from './types';

export function createTileSet(): Tile[] {
  const tiles: Tile[] = [];
  for (const color of TILE_COLORS) {
    for (let number = 1; number <= 13; number += 1) {
      for (const copy of [0, 1] as const) {
        tiles.push({
          id: `${color}-${number}-${copy}`,
          kind: 'normal',
          color,
          number: number as TileNumber,
          copy,
        });
      }
    }
  }
  tiles.push({ id: 'false-joker-0', kind: 'false_joker', copy: 0 });
  tiles.push({ id: 'false-joker-1', kind: 'false_joker', copy: 1 });
  return tiles;
}

export function nextTileNumber(number: TileNumber): TileNumber {
  return (number === 13 ? 1 : number + 1) as TileNumber;
}

export function jokerValue(indicator: TileValue): TileValue {
  return { color: indicator.color, number: nextTileNumber(indicator.number) };
}

export function isJoker(tile: Tile, indicator: TileValue): boolean {
  const joker = jokerValue(indicator);
  return tile.kind === 'normal' && tile.color === joker.color && tile.number === joker.number;
}

export function effectiveValue(tile: Tile, indicator: TileValue): TileValue | 'joker' {
  if (isJoker(tile, indicator)) return 'joker';
  if (tile.kind === 'false_joker') return jokerValue(indicator);
  if (tile.color === undefined || tile.number === undefined) {
    throw new Error(`Normal tile ${tile.id} has no value`);
  }
  return { color: tile.color, number: tile.number };
}

export function tileByValue(color: TileColor, number: TileNumber, copy: 0 | 1 = 0): Tile {
  return { id: `${color}-${number}-${copy}`, kind: 'normal', color, number, copy };
}
