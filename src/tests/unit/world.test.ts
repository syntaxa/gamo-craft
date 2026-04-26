import { describe, expect, it } from 'vitest';
import { normalizeWorldState } from '../../app/store';
import { createInitialWorld } from '../../domains/world/service';
import { voxelKey } from '../../domains/world/voxelGrid';
import type { WorldState } from '../../domains/world/model';

describe('world domain', () => {
  it('creates a grass-dirt starter surface with default player transform', () => {
    const world = createInitialWorld('player-1', 3, 4, 2);

    expect(world.voxels).toHaveLength(6);
    expect(world.voxels.every((voxel) => voxel.y === 0 && voxel.blockId === 'block_grass_dirt')).toBe(true);
    expect(world.playerTransform.position).toMatchObject({ x: 0, y: 2.62, z: 8 });
    expect(new Set(world.voxels.map(voxelKey)).size).toBe(6);
  });

  it('normalizes legacy worlds without player transform', () => {
    const legacy = createInitialWorld('player-1', 1, 2, 1) as Partial<WorldState>;
    delete legacy.playerTransform;

    expect(normalizeWorldState(legacy as WorldState).playerTransform).toMatchObject({
      position: { x: 0, y: 2.62, z: 8 },
      rotation: { yaw: 0, pitch: 0 },
      isFlying: false,
    });
  });
});
