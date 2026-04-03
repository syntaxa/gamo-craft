import { makeId } from '../../shared/lib/id';
import { nowIso } from '../../shared/lib/time';
import type { WorldState } from './model';

export function createInitialWorld(
  playerId: string,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
): WorldState {
  const voxels: WorldState['voxels'] = [];
  for (let x = 0; x < sizeX; x += 1) {
    for (let z = 0; z < sizeZ; z += 1) {
      voxels.push({ x, y: 0, z, blockId: 'block_grass_dirt' });
    }
  }

  return {
    id: makeId('world'),
    playerId,
    sizeX,
    sizeY,
    sizeZ,
    voxels,
    decorations: [],
    updatedAt: nowIso(),
  };
}
