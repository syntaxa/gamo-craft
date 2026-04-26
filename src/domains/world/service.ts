import { makeId } from '../../shared/lib/id';
import { nowIso } from '../../shared/lib/time';
import type { PlayerTransformState, WorldState } from './model';

const DEFAULT_PLAYER_EYE_Y = 2.62;

export function createDefaultPlayerTransform(): PlayerTransformState {
  return {
    position: {
      x: 0,
      y: DEFAULT_PLAYER_EYE_Y,
      z: 8,
    },
    rotation: {
      yaw: 0,
      pitch: 0,
    },
    isFlying: false,
  };
}

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
    playerTransform: createDefaultPlayerTransform(),
    updatedAt: nowIso(),
  };
}
