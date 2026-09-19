import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SPIN_CELL_PITCH,
  SPIN_CELL_WIDTH,
  buildReelSequence,
  easeOutQuart,
  reelOffset,
  resolveReelTransforms,
  shuffle,
} from '../../features/eggs/reel';
import type { EggReward } from '../../features/eggs/types';

const pool: EggReward[] = [
  { id: 'block_a', label: 'A', count: 1, weight: 1, kind: 'block' },
  { id: 'block_b', label: 'B', count: 1, weight: 1, kind: 'block' },
  { id: 'block_c', label: 'C', count: 1, weight: 1, kind: 'block' },
];

describe('reel helpers', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockRestore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('easeOutQuart is monotonic from 0 to 1 on [0, 1]', () => {
    let previous = 0;
    for (let i = 0; i <= 20; i += 1) {
      const value = easeOutQuart(i / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    expect(easeOutQuart(0)).toBe(0);
    expect(easeOutQuart(1)).toBe(1);
  });

  it('shuffles items and keeps all of them', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = shuffle(pool);
    expect(result).toHaveLength(pool.length);
    expect(result).toEqual(expect.arrayContaining(pool));
  });

  it('builds a sequence containing every pool prize at least once with the winner at the stop index', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const winner = pool[1];
    const sequence = buildReelSequence(pool, winner);

    expect(sequence.items.length).toBeGreaterThanOrEqual(pool.length);
    for (const prize of pool) {
      expect(sequence.items).toContain(prize);
    }
    expect(sequence.items[sequence.stopIndex]).toBe(winner);
  });

  it('places the winner at the stop index regardless of randomness', () => {
    const winner = pool[0];
    const sequence = buildReelSequence(pool, winner);
    expect(sequence.items[sequence.stopIndex]).toBe(winner);
    expect(sequence.stopIndex).toBeGreaterThan(0);
  });

  it('works with an empty pool by emitting only the winner', () => {
    const sequence = buildReelSequence([], pool[0], 8);
    expect(sequence.items).toHaveLength(8);
    expect(sequence.items.every((item) => item === pool[0])).toBe(true);
    expect(sequence.stopIndex).toBeGreaterThanOrEqual(0);
  });

  it('reelOffset places the cell center under the pointer', () => {
    const pointerX = 512;
    const index = 10;
    const offset = reelOffset(index, pointerX);
    expect(offset + index * SPIN_CELL_PITCH + SPIN_CELL_WIDTH / 2).toBeCloseTo(pointerX);
  });

  it('resolveReelTransforms animates from an earlier cell to the winner centered under the pointer', () => {
    const pointerX = 512;
    const winner = pool[2];
    const transforms = resolveReelTransforms(pool, winner, pointerX);

    expect(transforms.items[transforms.stopIndex]).toBe(winner);
    expect(transforms.startOffset).toBeLessThan(transforms.finalOffset);
    expect(
      transforms.finalOffset + transforms.stopIndex * SPIN_CELL_PITCH + SPIN_CELL_WIDTH / 2,
    ).toBeCloseTo(pointerX);
  });
});