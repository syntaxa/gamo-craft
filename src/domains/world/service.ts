import { makeId } from '../../shared/lib/id';
import { nowIso } from '../../shared/lib/time';
import type { WorldState } from './model';

export function createInitialWorld(
  playerId: string,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
): WorldState {
  return {
    id: makeId('world'),
    playerId,
    sizeX,
    sizeY,
    sizeZ,
    voxels: [],
    decorations: [],
    updatedAt: nowIso(),
  };
}
