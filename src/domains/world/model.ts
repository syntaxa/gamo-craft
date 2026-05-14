import type { ItemId, PlayerId } from '../../shared/types/common';

export interface WorldCell {
  x: number;
  y: number;
  z: number;
  blockId: ItemId | null;
}

export interface PlayerTransformState {
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    yaw: number;
    pitch: number;
  };
  isFlying: boolean;
}

export interface PlayerPhysicsState {
  velocityY: number;
  isGrounded: boolean;
}

export interface GridPosition {
  x: number;
  y: number;
  z: number;
}

export interface PosterPlacement {
  id: string;
  itemId: ItemId;
  anchor: GridPosition;
  faceNormal: GridPosition;
  widthBlocks: number;
  heightBlocks: number;
}

export interface WorldState {
  id: string;
  playerId: PlayerId;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  voxels: WorldCell[];
  decorations: Array<{ id: string; x: number; y: number; z: number }>;
  posters: PosterPlacement[];
  playerTransform: PlayerTransformState;
  playerPhysics: PlayerPhysicsState;
  updatedAt: string;
}
