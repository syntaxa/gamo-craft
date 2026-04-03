import type { LootEntry } from './model';

export function rollLoot(entries: LootEntry[]): LootEntry {
  const total = entries.reduce((acc, e) => acc + e.weight, 0);
  const target = Math.random() * total;
  let cursor = 0;
  for (const entry of entries) {
    cursor += entry.weight;
    if (target <= cursor) return entry;
  }
  return entries[entries.length - 1];
}
