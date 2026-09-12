import type { InventoryState } from '../domains/inventory/model';
import type { PlayerProfile } from '../domains/player/model';
import type { WorldState } from '../domains/world/model';

export interface AppSave {
  player: PlayerProfile;
  inventory: InventoryState;
  world: WorldState;
  savedAt: string;
}

export type AppSaveInput = Omit<AppSave, 'savedAt'>;

export function createAppSave(input: AppSaveInput, savedAt = new Date().toISOString()): AppSave {
  return {
    ...input,
    savedAt,
  };
}

export function serializeAppSave(save: AppSave): string {
  return JSON.stringify(save);
}

export function parseAppSave(raw: string): AppSave | undefined {
  let parsed: Partial<AppSave>;
  try {
    parsed = JSON.parse(raw) as Partial<AppSave>;
  } catch {
    return undefined;
  }

  if (!parsed.player || !parsed.inventory || !parsed.world) {
    return undefined;
  }

  return {
    player: parsed.player,
    inventory: parsed.inventory,
    world: parsed.world,
    savedAt: parsed.savedAt ?? parsed.world.updatedAt ?? new Date(0).toISOString(),
  };
}

function makeSaveFileName(savedAt: string): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) {
    return 'gamo-save.txt';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `gamo-save-${day}-${month}-${date.getFullYear()}.txt`;
}

export function downloadAppSaveFile(save: AppSave): void {
  const blob = new Blob([serializeAppSave(save)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = makeSaveFileName(save.savedAt);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function readAppSaveFile(file: File): Promise<AppSave | undefined> {
  const text = await file.text();
  return parseAppSave(text);
}