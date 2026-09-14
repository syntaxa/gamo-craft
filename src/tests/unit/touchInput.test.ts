import { describe, expect, it, beforeEach } from 'vitest';
import { touchInput, hasTouchMovementInput } from '../../features/build/touchInput';

function reset() {
  touchInput.movement.forward = false;
  touchInput.movement.backward = false;
  touchInput.movement.left = false;
  touchInput.movement.right = false;
  touchInput.movement.up = false;
  touchInput.movement.down = false;
}

beforeEach(() => {
  reset();
});

describe('touchInput', () => {
  it('returns false when no movement', () => {
    expect(hasTouchMovementInput()).toBe(false);
  });

  it('returns true when forward is active', () => {
    touchInput.movement.forward = true;
    expect(hasTouchMovementInput()).toBe(true);
  });

  it('returns true for every movement direction', () => {
    for (const key of ['forward', 'backward', 'left', 'right', 'up', 'down'] as const) {
      reset();
      touchInput.movement[key] = true;
      expect(hasTouchMovementInput(), `expected ${key} to count as movement`).toBe(true);
    }
  });

  it('is reset when state is cleared', () => {
    touchInput.movement.forward = true;
    reset();
    expect(hasTouchMovementInput()).toBe(false);
  });
});