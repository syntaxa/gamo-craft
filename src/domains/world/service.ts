import { makeId } from '../../shared/lib/id';
import { nowIso } from '../../shared/lib/time';
import type { GridPosition, PlayerTransformState, PosterPlacement, WorldState } from './model';

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
    posters: [],
    playerTransform: createDefaultPlayerTransform(),
    updatedAt: nowIso(),
  };
}

function samePosition(a: GridPosition, b: GridPosition): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

function hasSupportingFace(world: WorldState, placement: Omit<PosterPlacement, 'id'>): boolean {
  const supportingBlock = {
    x: placement.anchor.x - placement.faceNormal.x,
    y: placement.anchor.y - placement.faceNormal.y,
    z: placement.anchor.z - placement.faceNormal.z,
  };

  return world.voxels.some((voxel) => samePosition(voxel, supportingBlock) && voxel.blockId !== null);
}

export function getPosterCells(placement: Omit<PosterPlacement, 'id'>): GridPosition[] {
  const cells: GridPosition[] = [];
  const widthAxis =
    Math.abs(placement.faceNormal.x) > 0
      ? { x: 0, y: 0, z: 1 }
      : { x: 1, y: 0, z: 0 };

  for (let w = 0; w < placement.widthBlocks; w += 1) {
    for (let h = 0; h < placement.heightBlocks; h += 1) {
      cells.push({
        x: placement.anchor.x + widthAxis.x * w,
        y: placement.anchor.y + h,
        z: placement.anchor.z + widthAxis.z * w,
      });
    }
  }

  return cells;
}

function inWorldBounds(world: WorldState, cell: GridPosition): boolean {
  return (
    cell.x >= 0 &&
    cell.y >= 0 &&
    cell.z >= 0 &&
    cell.x < world.sizeX &&
    cell.y < world.sizeY &&
    cell.z < world.sizeZ
  );
}

function overlapsExistingPoster(world: WorldState, placement: Omit<PosterPlacement, 'id'>): boolean {
  const nextCells = getPosterCells(placement);
  return (world.posters ?? []).some((existing) => {
    if (!samePosition(existing.faceNormal, placement.faceNormal)) {
      return false;
    }

    return getPosterCells(existing).some((cell) => nextCells.some((nextCell) => samePosition(cell, nextCell)));
  });
}

function overlapsDecor(world: WorldState, placement: Omit<PosterPlacement, 'id'>): boolean {
  const nextCells = getPosterCells(placement);
  return world.decorations.some((decor) => nextCells.some((cell) => samePosition(cell, decor)));
}

export function canPlacePoster(world: WorldState, placement: Omit<PosterPlacement, 'id'>): boolean {
  const isVerticalFace = placement.faceNormal.y === 0 && (placement.faceNormal.x !== 0 || placement.faceNormal.z !== 0);
  if (!isVerticalFace) return false;
  if (!hasSupportingFace(world, placement)) return false;
  if (!getPosterCells(placement).every((cell) => inWorldBounds(world, cell))) return false;
  if (overlapsExistingPoster(world, placement)) return false;
  if (overlapsDecor(world, placement)) return false;

  return true;
}

export function placePosterInWorld(world: WorldState, placement: Omit<PosterPlacement, 'id'>): WorldState {
  if (!canPlacePoster(world, placement)) {
    return world;
  }

  return {
    ...world,
    posters: [
      ...(world.posters ?? []),
      {
        ...placement,
        id: makeId('poster'),
      },
    ],
    updatedAt: nowIso(),
  };
}
