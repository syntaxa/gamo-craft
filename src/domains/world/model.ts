import type { ItemId, PlayerId } from '../../shared/types/common';

export interface WorldCell {
  x: number;
  y: number;
  z: number;
  blockId: ItemId | null;
}

export interface WorldState {
  id: string;
  playerId: PlayerId;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  voxels: WorldCell[];
  decorations: Array<{ id: string; x: number; y: number; z: number }>;
  updatedAt: string;
}
