export interface SeededRandom {
  next(): number;
  int(maxExclusive: number): number;
}

export function createSeededRandom(seed: number): SeededRandom {
  let state = seed >>> 0;
  return {
    next(): number {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
    },
    int(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new RangeError('maxExclusive must be a positive integer');
      }
      return Math.floor(this.next() * maxExclusive);
    },
  };
}

export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const random = createSeededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = random.int(index + 1);
    const current = result[index];
    const other = result[swapIndex];
    if (current === undefined || other === undefined) {
      throw new Error('Shuffle index escaped array bounds');
    }
    result[index] = other;
    result[swapIndex] = current;
  }
  return result;
}
