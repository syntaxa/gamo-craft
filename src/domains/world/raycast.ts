export interface RaycastHit {
  x: number;
  y: number;
  z: number;
  face: 'top' | 'bottom' | 'left' | 'right' | 'front' | 'back';
}
