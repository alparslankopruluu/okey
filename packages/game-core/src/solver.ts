import { validateMeld } from './melds';
import { effectiveValue } from './tiles';
import type { GameState, Meld, OpeningMode, TableMeld, Tile, TileValue } from './types';

interface Candidate {
  readonly mask: number;
  readonly meld: Meld;
  readonly points: number;
}

export interface WinningDiscard {
  readonly discardTileId: string;
  readonly melds: readonly Meld[];
}

export interface OpeningSelection {
  readonly mode: OpeningMode;
  readonly melds: readonly Meld[];
  readonly points: number;
}

export interface TableExtensionSelection {
  readonly tableMeldId: string;
  readonly tileIds: readonly string[];
}

interface SolverOptions {
  readonly allowHighAceWrap?: boolean;
  readonly allowSevenPairs?: boolean;
  readonly pairsOnly?: boolean;
}

function combinations(length: number, size: number, visit: (indices: readonly number[]) => void): void {
  const selected: number[] = [];
  const walk = (start: number): void => {
    if (selected.length === size) {
      visit(selected);
      return;
    }
    for (let index = start; index <= length - (size - selected.length); index += 1) {
      selected.push(index);
      walk(index + 1);
      selected.pop();
    }
  };
  walk(0);
}

function candidateSort(left: Candidate, right: Candidate): number {
  if (right.points !== left.points) return right.points - left.points;
  if (left.meld.kind !== right.meld.kind) return left.meld.kind.localeCompare(right.meld.kind, 'en');
  return left.meld.tileIds.join('|').localeCompare(right.meld.tileIds.join('|'), 'en');
}

function buildCandidates(
  tiles: readonly Tile[],
  indicator: TileValue,
  options: SolverOptions,
): readonly Candidate[] {
  const candidates: Candidate[] = [];
  const kinds: readonly Meld['kind'][] = options.pairsOnly ? ['pair'] : ['sequence', 'set'];
  const sizes = options.pairsOnly ? [2] : [3, 4, 5];
  for (const size of sizes) {
    combinations(tiles.length, size, (indices) => {
      const tileIds = indices.map((index) => tiles[index]?.id ?? '');
      const mask = indices.reduce((value, index) => value | (1 << index), 0);
      const values = indices.map((index) => {
        const tile = tiles[index];
        return tile === undefined ? undefined : effectiveValue(tile, indicator);
      });
      if (values.some((value) => value === undefined)) return;
      const concrete = values.filter((value): value is TileValue => value !== undefined && value !== 'joker');
      for (const kind of kinds) {
        if (kind === 'set' && size > 4) continue;
        if (kind === 'pair') {
          if (concrete.length !== 2
            || concrete[0]?.color !== concrete[1]?.color
            || concrete[0]?.number !== concrete[1]?.number) continue;
        }
        if (kind === 'set') {
          if (concrete.length === 0
            || new Set(concrete.map((value) => value.number)).size !== 1
            || new Set(concrete.map((value) => value.color)).size !== concrete.length) continue;
        }
        if (kind === 'sequence') {
          if (concrete.length === 0
            || new Set(concrete.map((value) => value.color)).size !== 1
            || new Set(concrete.map((value) => value.number)).size !== concrete.length) continue;
          const numbers = concrete.map((value) => value.number).sort((left, right) => left - right);
          const ordinarySpan = (numbers.at(-1) ?? 0) - (numbers[0] ?? 0) + 1;
          const highAceNumbers = options.allowHighAceWrap && numbers.includes(1) && numbers.includes(13) && !numbers.includes(2)
            ? numbers.map((number) => number === 1 ? 14 : number).sort((left, right) => left - right)
            : undefined;
          const highAceSpan = highAceNumbers === undefined
            ? Number.POSITIVE_INFINITY
            : (highAceNumbers.at(-1) ?? 0) - (highAceNumbers[0] ?? 0) + 1;
          if (Math.min(ordinarySpan, highAceSpan) > size) continue;
        }
        const meld: Meld = { kind, tileIds };
        try {
          const points = validateMeld(meld, tiles, indicator, options.allowHighAceWrap ?? false);
          candidates.push({ mask, meld, points });
        } catch {
          // Invalid combinations are expected while enumerating a rack.
        }
      }
    });
  }
  return candidates.sort(candidateSort);
}

function exactCover(
  remainingMask: number,
  candidatesByIndex: readonly (readonly Candidate[])[],
  memo: Map<number, readonly Meld[] | null>,
): readonly Meld[] | undefined {
  if (remainingMask === 0) return [];
  const cached = memo.get(remainingMask);
  if (cached !== undefined) return cached ?? undefined;
  const lowestBit = remainingMask & -remainingMask;
  const index = Math.log2(lowestBit);
  for (const candidate of candidatesByIndex[index] ?? []) {
    if ((candidate.mask & remainingMask) !== candidate.mask) continue;
    const tail = exactCover(remainingMask ^ candidate.mask, candidatesByIndex, memo);
    if (tail !== undefined) {
      const result = [candidate.meld, ...tail];
      memo.set(remainingMask, result);
      return result;
    }
  }
  memo.set(remainingMask, null);
  return undefined;
}

function solveWithCandidates(tiles: readonly Tile[], candidates: readonly Candidate[], mask: number): readonly Meld[] | undefined {
  const byIndex: Candidate[][] = Array.from({ length: tiles.length }, () => []);
  for (const candidate of candidates) {
    for (let index = 0; index < tiles.length; index += 1) {
      if ((candidate.mask & (1 << index)) !== 0) byIndex[index]?.push(candidate);
    }
  }
  return exactCover(mask, byIndex, new Map());
}

function candidateGraph(tiles: readonly Tile[], candidates: readonly Candidate[]): readonly (readonly Candidate[])[] {
  const byIndex: Candidate[][] = Array.from({ length: tiles.length }, () => []);
  for (const candidate of candidates) {
    for (let index = 0; index < tiles.length; index += 1) {
      if ((candidate.mask & (1 << index)) !== 0) byIndex[index]?.push(candidate);
    }
  }
  return byIndex;
}

function sortedTiles(rack: readonly Tile[]): readonly Tile[] {
  return [...rack].sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

export function findWinningMelds(
  rack: readonly Tile[],
  indicator: TileValue,
  options: SolverOptions = {},
): readonly Meld[] | undefined {
  if (rack.length === 0) return [];
  if (rack.length > 22) return undefined;
  const tiles = sortedTiles(rack);
  const fullMask = (1 << tiles.length) - 1;
  if (options.allowSevenPairs && tiles.length === 14) {
    const pairs = buildCandidates(tiles, indicator, { ...options, pairsOnly: true });
    const pairResult = solveWithCandidates(tiles, pairs, fullMask);
    if (pairResult?.length === 7) return pairResult;
  }
  if (options.pairsOnly && tiles.length % 2 !== 0) return undefined;
  return solveWithCandidates(tiles, buildCandidates(tiles, indicator, options), fullMask);
}

export function findWinningDiscard(
  rack: readonly Tile[],
  indicator: TileValue,
  options: SolverOptions = {},
): WinningDiscard | undefined {
  if (rack.length === 0 || rack.length > 22) return undefined;
  const tiles = sortedTiles(rack);
  if (tiles.length === 1) return { discardTileId: tiles[0]?.id ?? '', melds: [] };
  const fullMask = (1 << tiles.length) - 1;
  const normalCandidates = buildCandidates(tiles, indicator, options);
  const normalGraph = candidateGraph(tiles, normalCandidates);
  const normalMemo = new Map<number, readonly Meld[] | null>();
  const pairCandidates = options.allowSevenPairs
    ? buildCandidates(tiles, indicator, { ...options, pairsOnly: true })
    : [];
  const pairGraph = candidateGraph(tiles, pairCandidates);
  const pairMemo = new Map<number, readonly Meld[] | null>();
  for (let discardIndex = 0; discardIndex < tiles.length; discardIndex += 1) {
    const remainingMask = fullMask ^ (1 << discardIndex);
    if (options.allowSevenPairs && tiles.length - 1 === 14) {
      const pairResult = exactCover(remainingMask, pairGraph, pairMemo);
      if (pairResult?.length === 7) {
        return { discardTileId: tiles[discardIndex]?.id ?? '', melds: pairResult };
      }
    }
    const melds = exactCover(remainingMask, normalGraph, normalMemo);
    if (melds !== undefined) return { discardTileId: tiles[discardIndex]?.id ?? '', melds };
  }
  return undefined;
}

export function findOpeningMelds101(
  rack: readonly Tile[],
  indicator: TileValue,
  threshold: number,
  pairsRequired: number,
  allowPairs: boolean,
): OpeningSelection | undefined {
  const tiles = sortedTiles(rack);
  const candidates = buildCandidates(tiles, indicator, {});
  const starts = [undefined, ...candidates.slice(0, 64)] as const;
  for (const start of starts) {
    let usedMask = start?.mask ?? 0;
    let points = start?.points ?? 0;
    const selected = start === undefined ? [] : [start];
    for (const candidate of candidates) {
      if ((candidate.mask & usedMask) !== 0) continue;
      const usedCount = selected.reduce((sum, item) => sum + item.meld.tileIds.length, 0) + candidate.meld.tileIds.length;
      if (tiles.length - usedCount < 1) continue;
      usedMask |= candidate.mask;
      points += candidate.points;
      selected.push(candidate);
      if (points >= threshold) {
        return { mode: 'melds', melds: selected.map((item) => item.meld), points };
      }
    }
  }
  if (!allowPairs) return undefined;
  const pairs = buildCandidates(tiles, indicator, { pairsOnly: true });
  const used = new Set<string>();
  const melds: Meld[] = [];
  for (const candidate of pairs) {
    if (candidate.meld.tileIds.some((id) => used.has(id))) continue;
    candidate.meld.tileIds.forEach((id) => used.add(id));
    melds.push(candidate.meld);
    if (melds.length >= pairsRequired && tiles.length - used.size >= 1) {
      return { mode: 'pairs', melds, points: melds.reduce((sum, meld) => sum + validateMeld(meld, tiles, indicator), 0) };
    }
  }
  return undefined;
}

export function findTableExtension(state: GameState, playerId: string): TableExtensionSelection | undefined {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player === undefined || !player.opened || player.rack.length <= 1) return undefined;
  const rack = sortedTiles(player.rack);
  const table = [...state.tableMelds].sort((left, right) => left.id.localeCompare(right.id, 'en'));
  for (const tableMeld of table) {
    if (tableMeld.kind === 'pair') continue;
    for (const tile of rack) {
      const combined = [...tableMeld.tiles, tile];
      const meld: Meld = { kind: tableMeld.kind, tileIds: combined.map((item) => item.id) };
      try {
        validateMeld(meld, combined, state.indicator, false);
        return { tableMeldId: tableMeld.id, tileIds: [tile.id] };
      } catch {
        // Keep scanning for a legal single-tile layoff.
      }
    }
  }
  return undefined;
}

export function tableMeldAsMeld(tableMeld: TableMeld): Meld {
  return { kind: tableMeld.kind, tileIds: tableMeld.tiles.map((tile) => tile.id) };
}
