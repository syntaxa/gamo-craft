export interface VoxelCoordinate {
  x: number;
  y: number;
  z: number;
}

export function voxelKey(c: VoxelCoordinate): string {
  return `${c.x}:${c.y}:${c.z}`;
}
