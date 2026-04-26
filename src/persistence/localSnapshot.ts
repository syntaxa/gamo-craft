import type { InventoryState } from '../domains/inventory/model';
import type { PlayerProfile } from '../domains/player/model';
import type { WorldState } from '../domains/world/model';

const LOCAL_SNAPSHOT_KEY = 'gamo:app-snapshot:v1';

export interface LocalAppSnapshot {
  player: PlayerProfile;
  inventory: InventoryState;
  world: WorldState;
  savedAt: string;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function writeLocalAppSnapshot(snapshot: Omit<LocalAppSnapshot, 'savedAt'>): void {
  if (!canUseLocalStorage()) return;

  window.localStorage.setItem(
    LOCAL_SNAPSHOT_KEY,
    JSON.stringify({
      ...snapshot,
      savedAt: new Date().toISOString(),
    }),
  );
}

export function readLocalAppSnapshot(): LocalAppSnapshot | undefined {
  if (!canUseLocalStorage()) return undefined;

  const raw = window.localStorage.getItem(LOCAL_SNAPSHOT_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<LocalAppSnapshot>;
    if (!parsed.player || !parsed.inventory || !parsed.world || !parsed.savedAt) {
      return undefined;
    }

    return parsed as LocalAppSnapshot;
  } catch {
    return undefined;
  }
}
