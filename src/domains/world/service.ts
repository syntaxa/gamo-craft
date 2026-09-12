import { makeId } from '../../shared/lib/id';
import { nowIso } from '../../shared/lib/time';
import type { GridPosition, PlayerPhysicsState, PlayerTransformState, PosterPlacement, WorldState } from './model';

const DEFAULT_PLAYER_EYE_Y = 2.62;
const PLAYER_HEIGHT = 1.62;
const PLAYER_RADIUS = 0.32;
const WORLD_RENDER_OFFSET = 12;
const GRAVITY = -20;
const JUMP_VELOCITY = 7.2;
const MAX_FALL_SPEED = -28;

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

export function createDefaultPlayerPhysics(): PlayerPhysicsState {
  return {
    velocityY: 0,
    isGrounded: true,
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
    playerPhysics: createDefaultPlayerPhysics(),
    updatedAt: nowIso(),
  };
}

function horizontallyOverlapsPlayer(
  position: GridPosition,
  voxel: GridPosition,
): boolean {
  const minX = position.x - PLAYER_RADIUS;
  const maxX = position.x + PLAYER_RADIUS;
  const minZ = position.z - PLAYER_RADIUS;
  const maxZ = position.z + PLAYER_RADIUS;
  const centerX = voxel.x - WORLD_RENDER_OFFSET;
  const centerZ = voxel.z - WORLD_RENDER_OFFSET;

  return (
    maxX > centerX - 0.5 &&
    minX < centerX + 0.5 &&
    maxZ > centerZ - 0.5 &&
    minZ < centerZ + 0.5
  );
}

export function playerIntersectsSolidVoxel(
  position: GridPosition,
  voxels: Array<GridPosition>,
): boolean {
  const minX = position.x - PLAYER_RADIUS;
  const maxX = position.x + PLAYER_RADIUS;
  const minY = position.y - PLAYER_HEIGHT;
  const maxY = position.y;
  const minZ = position.z - PLAYER_RADIUS;
  const maxZ = position.z + PLAYER_RADIUS;

  return voxels.some((voxel) => {
    const centerX = voxel.x - WORLD_RENDER_OFFSET;
    const centerY = voxel.y + 0.5;
    const centerZ = voxel.z - WORLD_RENDER_OFFSET;

    const voxelMinX = centerX - 0.5;
    const voxelMaxX = centerX + 0.5;
    const voxelMinY = centerY - 0.5;
    const voxelMaxY = centerY + 0.5;
    const voxelMinZ = centerZ - 0.5;
    const voxelMaxZ = centerZ + 0.5;

    return (
      maxX > voxelMinX &&
      minX < voxelMaxX &&
      maxY > voxelMinY &&
      minY < voxelMaxY &&
      maxZ > voxelMinZ &&
      minZ < voxelMaxZ
    );
  });
}

function findLandingEyeY(
  position: GridPosition,
  nextY: number,
  voxels: Array<GridPosition>,
): number | null {
  const currentFootY = position.y - PLAYER_HEIGHT;
  const nextFootY = nextY - PLAYER_HEIGHT;
  let landingEyeY: number | null = null;

  for (const voxel of voxels) {
    if (!horizontallyOverlapsPlayer(position, voxel)) continue;

    const surfaceY = voxel.y + 1;
    if (currentFootY >= surfaceY && nextFootY <= surfaceY) {
      const eyeY = surfaceY + PLAYER_HEIGHT;
      if (landingEyeY === null || eyeY > landingEyeY) {
        landingEyeY = eyeY;
      }
    }
  }

  return landingEyeY;
}

function findCeilingEyeY(
  position: GridPosition,
  nextY: number,
  voxels: Array<GridPosition>,
): number | null {
  const currentHeadY = position.y;
  const nextHeadY = nextY;
  let ceilingEyeY: number | null = null;

  for (const voxel of voxels) {
    if (!horizontallyOverlapsPlayer(position, voxel)) continue;

    const undersideY = voxel.y;
    if (currentHeadY <= undersideY && nextHeadY >= undersideY) {
      if (ceilingEyeY === null || undersideY < ceilingEyeY) {
        ceilingEyeY = undersideY;
      }
    }
  }

  return ceilingEyeY;
}

export function stepPlayerVerticalPhysics({
  position,
  physics,
  voxels,
  deltaSeconds,
  jumpRequested,
  isFlying,
}: {
  position: GridPosition;
  physics: PlayerPhysicsState;
  voxels: Array<GridPosition>;
  deltaSeconds: number;
  jumpRequested: boolean;
  isFlying: boolean;
}): { position: GridPosition; physics: PlayerPhysicsState } {
  if (isFlying) {
    return {
      position,
      physics: { velocityY: 0, isGrounded: false },
    };
  }

  let velocityY = physics.velocityY;
  let isGrounded = physics.isGrounded;

  if (jumpRequested && isGrounded) {
    velocityY = JUMP_VELOCITY;
    isGrounded = false;
  }

  velocityY = Math.max(velocityY + GRAVITY * deltaSeconds, MAX_FALL_SPEED);
  const nextY = position.y + velocityY * deltaSeconds;

  if (velocityY > 0) {
    const ceilingEyeY = findCeilingEyeY(position, nextY, voxels);
    if (ceilingEyeY !== null) {
      return {
        position: { ...position, y: ceilingEyeY },
        physics: { velocityY: 0, isGrounded: false },
      };
    }
  }

  if (velocityY <= 0) {
    const landingEyeY = findLandingEyeY(position, nextY, voxels);
    if (landingEyeY !== null) {
      return {
        position: { ...position, y: landingEyeY },
        physics: { velocityY: 0, isGrounded: true },
      };
    }
  }

  return {
    position: { ...position, y: nextY },
    physics: {
      velocityY,
      isGrounded: false,
    },
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

function overlapsSolidVoxel(world: WorldState, placement: Omit<PosterPlacement, 'id'>): boolean {
  const nextCells = getPosterCells(placement);
  return world.voxels.some(
    (voxel) => voxel.blockId !== null && nextCells.some((cell) => samePosition(cell, voxel)),
  );
}

export function canPlacePoster(world: WorldState, placement: Omit<PosterPlacement, 'id'>): boolean {
  const isVerticalFace = placement.faceNormal.y === 0 && (placement.faceNormal.x !== 0 || placement.faceNormal.z !== 0);
  if (!isVerticalFace) return false;
  if (!hasSupportingFace(world, placement)) return false;
  if (!getPosterCells(placement).every((cell) => inWorldBounds(world, cell))) return false;
  if (overlapsExistingPoster(world, placement)) return false;
  if (overlapsDecor(world, placement)) return false;
  if (overlapsSolidVoxel(world, placement)) return false;

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
