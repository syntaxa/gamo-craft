import type { InventoryState } from '../domains/inventory/model';
import type { PlayerProfile } from '../domains/player/model';
import type { WorldState } from '../domains/world/model';

const LOCAL_SNAPSHOT_KEY = 'gamo:app-snapshot:v1';
const LOCAL_SNAPSHOT_RESCUE_KEY = 'gamo:app-snapshot:rescue:v1';

export interface LocalAppSnapshot {
  player: PlayerProfile;
  inventory: InventoryState;
  world: WorldState;
  savedAt: string;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function countUserVoxels(world: WorldState): number {
  return world.voxels.filter((voxel) => voxel.y !== 0 || voxel.blockId !== 'block_grass_dirt').length;
}

function parseLocalAppSnapshot(raw: string | null): LocalAppSnapshot | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as Partial<LocalAppSnapshot>;
    if (!parsed.player || !parsed.inventory || !parsed.world) {
      return undefined;
    }

    return {
      player: parsed.player,
      inventory: parsed.inventory,
      world: parsed.world,
      savedAt: parsed.savedAt ?? parsed.world.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return undefined;
  }
}

function serializeLocalAppSnapshot(
  snapshot: Omit<LocalAppSnapshot, 'savedAt'>,
  savedAt = new Date().toISOString(),
): string {
  return JSON.stringify({
    ...snapshot,
    savedAt,
  });
}

export function writeLocalAppSnapshot(
  snapshot: Omit<LocalAppSnapshot, 'savedAt'>,
  savedAt = new Date().toISOString(),
): void {
  if (!canUseLocalStorage()) return;

  const current = parseLocalAppSnapshot(window.localStorage.getItem(LOCAL_SNAPSHOT_KEY));
  const currentUserVoxels = current ? countUserVoxels(current.world) : 0;
  const nextUserVoxels = countUserVoxels(snapshot.world);

  if (current && current.world.id !== snapshot.world.id && currentUserVoxels > 0 && nextUserVoxels === 0) {
    window.localStorage.setItem(LOCAL_SNAPSHOT_RESCUE_KEY, JSON.stringify(current));
    return;
  }

  window.localStorage.setItem(
    LOCAL_SNAPSHOT_KEY,
    serializeLocalAppSnapshot(snapshot, savedAt),
  );
}

export async function copyLocalAppSnapshotToClipboard(
  snapshot: Omit<LocalAppSnapshot, 'savedAt'>,
  savedAt = new Date().toISOString(),
): Promise<string> {
  const json = serializeLocalAppSnapshot(snapshot, savedAt);

  writeLocalAppSnapshot(snapshot, savedAt);
  await navigator.clipboard.writeText(json);

  return json;
}

export function readLocalAppSnapshot(): LocalAppSnapshot | undefined {
  if (!canUseLocalStorage()) return undefined;

  return (
    parseLocalAppSnapshot(window.localStorage.getItem(LOCAL_SNAPSHOT_KEY)) ??
    parseLocalAppSnapshot(window.localStorage.getItem(LOCAL_SNAPSHOT_RESCUE_KEY))
  );
}
