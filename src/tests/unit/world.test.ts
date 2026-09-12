import { describe, expect, it } from 'vitest';
import { normalizeWorldState } from '../../app/store';
import {
  canPlacePoster,
  createInitialWorld,
  playerIntersectsSolidVoxel,
  placePosterInWorld,
  stepPlayerVerticalPhysics,
} from '../../domains/world/service';
import { voxelKey } from '../../domains/world/voxelGrid';
import type { WorldState } from '../../domains/world/model';

describe('world domain', () => {
  it('creates a grass-dirt starter surface with default player transform', () => {
    const world = createInitialWorld('player-1', 3, 4, 2);

    expect(world.voxels).toHaveLength(6);
    expect(world.voxels.every((voxel) => voxel.y === 0 && voxel.blockId === 'block_grass_dirt')).toBe(true);
    expect(world.playerTransform.position).toMatchObject({ x: 0, y: 2.62, z: 8 });
    expect(world.playerPhysics).toEqual({ velocityY: 0, isGrounded: true });
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
    expect(normalizeWorldState(legacy as WorldState).playerPhysics).toEqual({
      velocityY: 0,
      isGrounded: true,
    });
  });

  it('starts a single jump only while grounded', () => {
    const world = createInitialWorld('player-1', 24, 4, 24);

    const jumped = stepPlayerVerticalPhysics({
      position: { x: 0, y: 2.62, z: 8 },
      physics: { velocityY: 0, isGrounded: true },
      voxels: world.voxels,
      deltaSeconds: 1 / 60,
      jumpRequested: true,
      isFlying: false,
    });

    expect(jumped.position.y).toBeGreaterThan(2.62);
    expect(jumped.physics.velocityY).toBeGreaterThan(0);
    expect(jumped.physics.isGrounded).toBe(false);

    const airJumpAttempt = stepPlayerVerticalPhysics({
      position: jumped.position,
      physics: jumped.physics,
      voxels: world.voxels,
      deltaSeconds: 1 / 60,
      jumpRequested: true,
      isFlying: false,
    });

    expect(airJumpAttempt.physics.velocityY).toBeLessThan(jumped.physics.velocityY);
  });

  it('falls continuously under gravity before landing on the next surface', () => {
    const world = createInitialWorld('player-1', 24, 4, 24);

    const firstFrame = stepPlayerVerticalPhysics({
      position: { x: 0, y: 5, z: 8 },
      physics: { velocityY: 0, isGrounded: false },
      voxels: world.voxels,
      deltaSeconds: 1 / 60,
      jumpRequested: false,
      isFlying: false,
    });

    expect(firstFrame.position.y).toBeLessThan(5);
    expect(firstFrame.position.y).toBeGreaterThan(2.62);
    expect(firstFrame.physics.velocityY).toBeLessThan(0);
    expect(firstFrame.physics.isGrounded).toBe(false);

    let falling = firstFrame;
    for (let frame = 0; frame < 120 && !falling.physics.isGrounded; frame += 1) {
      falling = stepPlayerVerticalPhysics({
        position: falling.position,
        physics: falling.physics,
        voxels: world.voxels,
        deltaSeconds: 1 / 60,
        jumpRequested: false,
        isFlying: false,
      });
    }

    expect(falling.position.y).toBe(2.62);
    expect(falling.physics).toEqual({ velocityY: 0, isGrounded: true });
  });

  it('lands on a floating block instead of falling through it', () => {
    const world = createInitialWorld('player-1', 24, 8, 24);
    world.voxels.push({ x: 12, y: 2, z: 20, blockId: 'block_brick_red' });

    let falling = {
      position: { x: 0, y: 6, z: 8 },
      physics: { velocityY: 0, isGrounded: false },
    };

    for (let frame = 0; frame < 120 && !falling.physics.isGrounded; frame += 1) {
      falling = stepPlayerVerticalPhysics({
        position: falling.position,
        physics: falling.physics,
        voxels: world.voxels,
        deltaSeconds: 1 / 60,
        jumpRequested: false,
        isFlying: false,
      });
    }

    expect(falling.position.y).toBe(4.62);
    expect(falling.physics).toEqual({ velocityY: 0, isGrounded: true });
  });

  it('lands on a floating block while descending from a jump', () => {
    const world = createInitialWorld('player-1', 24, 8, 24);
    world.voxels.push({ x: 12, y: 1, z: 20, blockId: 'block_brick_red' });

    let jumping = {
      position: { x: 0, y: 2.62, z: 8 },
      physics: { velocityY: 0, isGrounded: true },
    };

    for (let frame = 0; frame < 120 && (frame === 0 || !jumping.physics.isGrounded); frame += 1) {
      jumping = stepPlayerVerticalPhysics({
        position: jumping.position,
        physics: jumping.physics,
        voxels: world.voxels,
        deltaSeconds: 1 / 60,
        jumpRequested: frame === 0,
        isFlying: false,
      });
    }

    expect(jumping.position.y).toBe(3.62);
    expect(jumping.physics).toEqual({ velocityY: 0, isGrounded: true });
  });

  it('stops upward motion at the underside of a floating block during a jump', () => {
    const world = createInitialWorld('player-1', 24, 8, 24);
    world.voxels.push({ x: 12, y: 3, z: 20, blockId: 'block_brick_red' });

    let jumping = {
      position: { x: 0, y: 2.62, z: 8 },
      physics: { velocityY: 0, isGrounded: true },
    };

    for (let frame = 0; frame < 30; frame += 1) {
      jumping = stepPlayerVerticalPhysics({
        position: jumping.position,
        physics: jumping.physics,
        voxels: world.voxels,
        deltaSeconds: 1 / 60,
        jumpRequested: frame === 0,
        isFlying: false,
      });
    }

    expect(jumping.position.y).toBeLessThanOrEqual(3);
  });

  it('detects a side collision with a solid block while the player is airborne', () => {
    const world = createInitialWorld('player-1', 24, 8, 24);
    world.voxels.push({ x: 12, y: 2, z: 20, blockId: 'block_brick_red' });

    expect(
      playerIntersectsSolidVoxel(
        { x: -0.83, y: 3.4, z: 8 },
        world.voxels,
      ),
    ).toBe(false);

    expect(
      playerIntersectsSolidVoxel(
        { x: -0.8, y: 3.4, z: 8 },
        world.voxels,
      ),
    ).toBe(true);
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
