export const EGG_SPIN_DURATION_MS = 3000;
export const EGG_LAND_HIGHLIGHT_MS = 900;
export const EGG_REWARD_SHOW_MS = 2000;
export const EGG_REWARD_FADE_MS = 800;

export const SPIN_CELL_WIDTH = 150;
export const SPIN_CELL_GAP = 10;
export const SPIN_CELL_PITCH = SPIN_CELL_WIDTH + SPIN_CELL_GAP;

const SPIN_TOTAL_CELLS = 160;
const SPIN_TRAVEL_CELLS = 56;

export function easeOutQuart(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 4);
}

export function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export interface ReelSequence<T> {
  items: T[];
  stopIndex: number;
}

export function buildReelSequence<T>(
  pool: readonly T[],
  winner: T,
  totalCells: number = SPIN_TOTAL_CELLS,
): ReelSequence<T> {
  const safePool = pool.length > 0 ? [...pool] : [winner];
  const distinct = shuffle(safePool);

  let length = Math.max(totalCells, distinct.length);
  length = Math.max(length, 1);

  const items: T[] = [...distinct];
  while (items.length < length) {
    items.push(safePool[Math.floor(Math.random() * safePool.length)]);
  }

  const stopIndex = Math.max(0, length - SPIN_TRAVEL_CELLS - 8);
  items[stopIndex] = winner;

  return { items, stopIndex };
}

export function reelOffset(
  index: number,
  pointerX: number,
  pitch: number = SPIN_CELL_PITCH,
  cellWidth: number = SPIN_CELL_WIDTH,
): number {
  return pointerX - (index * pitch + cellWidth / 2);
}

export interface ReelTransforms<T> {
  items: T[];
  stopIndex: number;
  startOffset: number;
  finalOffset: number;
}

export function resolveReelTransforms<T>(
  pool: readonly T[],
  winner: T,
  pointerX: number,
): ReelTransforms<T> {
  const { items, stopIndex } = buildReelSequence(pool, winner);
  return {
    items,
    stopIndex,
    startOffset: reelOffset(stopIndex + SPIN_TRAVEL_CELLS, pointerX),
    finalOffset: reelOffset(stopIndex, pointerX),
  };
}