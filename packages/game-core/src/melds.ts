import { effectiveValue } from './tiles';
import { GameRuleError, type Meld, type Tile, type TileValue } from './types';

function tilesForMeld(meld: Meld, rack: readonly Tile[]): Tile[] {
  const byId = new Map(rack.map((tile) => [tile.id, tile]));
  const seen = new Set<string>();
  return meld.tileIds.map((id) => {
    if (seen.has(id)) throw new GameRuleError('duplicate_tile_in_meld', `Tile ${id} is repeated`);
    seen.add(id);
    const tile = byId.get(id);
    if (tile === undefined) throw new GameRuleError('tile_not_in_rack', `Tile ${id} is not in the rack`);
    return tile;
  });
}

function validateSequence(values: readonly (TileValue | 'joker')[], allowHighAceWrap: boolean): number {
  if (values.length < 3) throw new GameRuleError('sequence_too_short', 'A sequence needs at least three tiles');
  const concrete = values.filter((value): value is TileValue => value !== 'joker');
  if (concrete.length === 0) throw new GameRuleError('all_joker_meld', 'A meld needs a concrete tile');
  const color = concrete[0]?.color;
  if (color === undefined || concrete.some((value) => value.color !== color)) {
    throw new GameRuleError('sequence_color_mismatch', 'Sequence tiles must share a color');
  }
  const numbers = concrete.map((value) => value.number).sort((left, right) => left - right);
  if (new Set(numbers).size !== numbers.length) {
    throw new GameRuleError('sequence_duplicate_number', 'Sequence cannot repeat a number');
  }
  const jokerCount = values.length - concrete.length;
  const variants: number[][] = [numbers];
  if (allowHighAceWrap && numbers.includes(1) && numbers.includes(13) && !numbers.includes(2)) {
    variants.push(numbers.map((number) => (number === 1 ? 14 : number)).sort((left, right) => left - right));
  }
  for (const candidate of variants) {
    for (let start = 1; start <= 15 - values.length; start += 1) {
      const range = new Set(Array.from({ length: values.length }, (_, offset) => start + offset));
      if (candidate.every((number) => range.has(number)) && values.length - candidate.length === jokerCount) {
        return Array.from(range).reduce((sum, number) => sum + (number === 14 ? 1 : number), 0);
      }
    }
  }
  throw new GameRuleError('invalid_sequence', 'Tiles cannot form a non-wrapping sequence');
}

function validateSet(values: readonly (TileValue | 'joker')[]): number {
  if (values.length < 3 || values.length > 4) {
    throw new GameRuleError('invalid_set_size', 'A set needs three or four tiles');
  }
  const concrete = values.filter((value): value is TileValue => value !== 'joker');
  if (concrete.length === 0) throw new GameRuleError('all_joker_meld', 'A meld needs a concrete tile');
  const number = concrete[0]?.number;
  if (number === undefined || concrete.some((value) => value.number !== number)) {
    throw new GameRuleError('set_number_mismatch', 'Set tiles must share a number');
  }
  if (new Set(concrete.map((value) => value.color)).size !== concrete.length) {
    throw new GameRuleError('set_duplicate_color', 'A set cannot repeat a color');
  }
  return number * values.length;
}

export function validateMeld(
  meld: Meld,
  rack: readonly Tile[],
  indicator: TileValue,
  allowHighAceWrap = false,
): number {
  const tiles = tilesForMeld(meld, rack);
  const values = tiles.map((tile) => effectiveValue(tile, indicator));
  if (meld.kind === 'sequence') return validateSequence(values, allowHighAceWrap);
  if (meld.kind === 'set') return validateSet(values);
  if (tiles.length !== 2) throw new GameRuleError('invalid_pair_size', 'A pair needs two tiles');
  const [left, right] = values;
  if (left === undefined || right === undefined || left === 'joker' || right === 'joker') {
    throw new GameRuleError('joker_pair_not_allowed', 'Pairs must be matching physical values');
  }
  if (left.color !== right.color || left.number !== right.number) {
    throw new GameRuleError('pair_mismatch', 'Pair tiles must have the same value');
  }
  return left.number * 2;
}

export function validateMeldCollection(
  melds: readonly Meld[],
  rack: readonly Tile[],
  indicator: TileValue,
  allowHighAceWrap = false,
): { points: number; usedTileIds: readonly string[] } {
  const used = melds.flatMap((meld) => [...meld.tileIds]);
  if (new Set(used).size !== used.length) {
    throw new GameRuleError('tile_used_twice', 'A tile cannot be used in two melds');
  }
  return {
    points: melds.reduce((sum, meld) => sum + validateMeld(meld, rack, indicator, allowHighAceWrap), 0),
    usedTileIds: used,
  };
}

export function isWinningClassicRack(
  rack: readonly Tile[],
  indicator: TileValue,
  melds: readonly Meld[],
  allowSevenPairs: boolean,
  allowHighAceWrap = true,
): boolean {
  if (rack.length !== 14) return false;
  try {
    const result = validateMeldCollection(melds, rack, indicator, allowHighAceWrap);
    if (result.usedTileIds.length !== rack.length) return false;
    if (allowSevenPairs && melds.length === 7 && melds.every((meld) => meld.kind === 'pair')) return true;
    return melds.every((meld) => meld.kind === 'sequence' || meld.kind === 'set');
  } catch {
    return false;
  }
}
