import { describe, expect, it } from 'vitest';
import { normalizeWorldState } from '../../app/store';
import {
  canPlacePoster,
  createInitialWorld,
  placePosterInWorld,
} from '../../domains/world/service';
import { voxelKey } from '../../domains/world/voxelGrid';
import type { WorldState } from '../../domains/world/model';

describe('world domain', () => {
  it('creates a grass-dirt starter surface with default player transform', () => {
    const world = createInitialWorld('player-1', 3, 4, 2);

    expect(world.voxels).toHaveLength(6);
    expect(world.voxels.every((voxel) => voxel.y === 0 && voxel.blockId === 'block_grass_dirt')).toBe(true);
    expect(world.playerTransform.position).toMatchObject({ x: 0, y: 2.62, z: 8 });
    expect(world.posters).toEqual([]);
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

  it('allows poster placement on one vertical supporting face without requiring four wall blocks', () => {
    const world = createInitialWorld('player-1', 6, 6, 6);
    world.voxels.push({ x: 2, y: 1, z: 2, blockId: 'block_brick_red' });

    const placement = {
      itemId: 'poster_meme_cat_1',
      anchor: { x: 3, y: 1, z: 2 },
      faceNormal: { x: 1, y: 0, z: 0 },
      widthBlocks: 2,
      heightBlocks: 2,
    };

    expect(canPlacePoster(world, placement)).toBe(true);

    const nextWorld = placePosterInWorld(world, placement);
    expect(nextWorld.posters).toHaveLength(1);
    expect(nextWorld.posters[0]).toMatchObject(placement);
  });

  it('rejects poster placement on horizontal faces or overlapping another poster', () => {
    const world = createInitialWorld('player-1', 6, 6, 6);
    world.voxels.push({ x: 2, y: 1, z: 2, blockId: 'block_brick_red' });

    const verticalPlacement = {
      itemId: 'poster_meme_cat_1',
      anchor: { x: 3, y: 1, z: 2 },
      faceNormal: { x: 1, y: 0, z: 0 },
      widthBlocks: 2,
      heightBlocks: 2,
    };
    const worldWithPoster = placePosterInWorld(world, verticalPlacement);

    expect(
      canPlacePoster(worldWithPoster, {
        ...verticalPlacement,
        itemId: 'poster_meme_cat_2',
      }),
    ).toBe(false);

    expect(
      canPlacePoster(worldWithPoster, {
        ...verticalPlacement,
        anchor: { x: 2, y: 2, z: 2 },
        faceNormal: { x: 0, y: 1, z: 0 },
      }),
    ).toBe(false);
  });

  it('rejects poster placement over decor occupancy', () => {
    const world = createInitialWorld('player-1', 6, 6, 6);
    world.voxels.push({ x: 2, y: 1, z: 2, blockId: 'block_brick_red' });
    world.decorations.push({ id: 'decor-1', x: 3, y: 2, z: 2 });

    expect(
      canPlacePoster(world, {
        itemId: 'poster_meme_cat_1',
        anchor: { x: 3, y: 1, z: 2 },
        faceNormal: { x: 1, y: 0, z: 0 },
        widthBlocks: 2,
        heightBlocks: 2,
      }),
    ).toBe(false);
  });

  it('rejects poster placement through solid world blocks', () => {
    const world = createInitialWorld('player-1', 6, 6, 6);
    world.voxels.push({ x: 2, y: 1, z: 2, blockId: 'block_brick_red' });
    world.voxels.push({ x: 3, y: 2, z: 2, blockId: 'block_brick_red' });

    expect(
      canPlacePoster(world, {
        itemId: 'poster_meme_cat_1',
        anchor: { x: 3, y: 1, z: 2 },
        faceNormal: { x: 1, y: 0, z: 0 },
        widthBlocks: 2,
        heightBlocks: 2,
      }),
    ).toBe(false);
  });
});
