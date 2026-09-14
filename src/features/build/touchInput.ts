export type TouchMovementState = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

export const touchInput: { movement: TouchMovementState } = {
  movement: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  },
};

export function hasTouchMovementInput(state = touchInput.movement): boolean {
  return state.forward || state.backward || state.left || state.right || state.up || state.down;
}