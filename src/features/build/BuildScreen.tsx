import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { KeyboardControls, useKeyboardControls, useTexture, type KeyboardControlsEntry } from '@react-three/drei';
import {
  BackSide,
  BoxGeometry,
  EdgesGeometry,
  Euler,
  LineBasicMaterial,
  Raycaster,
  Vector2,
  Vector3,
  Texture,
} from 'three';
import { useAppStore } from '../../app/store';
import { BuildHUD } from './BuildHUD';
import { VirtualJoystick } from './VirtualJoystick';
import type { ResourcePackSpec } from '../../theme/resourcePacks';
import { useResourcePack } from '../../theme/useResourcePack';
import resourceItemsCatalog from '../../content/catalogs/items.resources.v1.json';
import posterItemsCatalog from '../../content/catalogs/items.posters.v1.json';
import type { PlayerPhysicsState, PlayerTransformState, PosterPlacement } from '../../domains/world/model';
import { canPlacePoster, playerIntersectsSolidVoxel, stepPlayerVerticalPhysics } from '../../domains/world/service';
import type { InventorySlot } from '../../domains/inventory/model';
import {
  applyInventoryAction,
  deleteCarriedInventoryStack,
  deleteInventoryStack,
  moveInventoryStack,
  type InventorySlotAddress,
} from '../../domains/inventory/slotActions';
import { copyLocalAppSnapshotToClipboard } from '../../persistence/localSnapshot';
import { hasTouchMovementInput, touchInput } from './touchInput';

type ControlKey = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down';
type GridTarget = { x: number; y: number; z: number };
type HitResult = {
  kind: 'voxel' | 'poster';
  point: Vector3;
  faceNormal?: Vector3;
  voxel?: GridTarget;
  posterId?: string;
};
type HotbarSlot =
  | { kind: 'eraser'; label: string }
  | { kind: 'item'; itemKind: 'block' | 'poster'; itemId: string; count: number; label: string; iconUrl?: string; widthBlocks?: number; heightBlocks?: number }
  | { kind: 'empty'; label: string };
type InventoryDragState = {
  source: InventorySlotAddress;
  slot: InventorySlot;
  startX: number;
  startY: number;
  x: number;
  y: number;
  hasMoved: boolean;
};
type PendingDeleteState = {
  source: InventorySlotAddress | null;
  slot: InventorySlot;
};

const keyMap: KeyboardControlsEntry<ControlKey>[] = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'up', keys: ['Space'] },
  { name: 'down', keys: ['ShiftLeft', 'ShiftRight'] },
];
const MOVEMENT_KEY_CODES = new Set(['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight']);
const MOVEMENT_KEYUP_EVENTS: Array<{ code: string; key: string }> = [
  { code: 'KeyW', key: 'w' },
  { code: 'ArrowUp', key: 'ArrowUp' },
  { code: 'KeyS', key: 's' },
  { code: 'ArrowDown', key: 'ArrowDown' },
  { code: 'KeyA', key: 'a' },
  { code: 'ArrowLeft', key: 'ArrowLeft' },
  { code: 'KeyD', key: 'd' },
  { code: 'ArrowRight', key: 'ArrowRight' },
  { code: 'Space', key: ' ' },
  { code: 'ShiftLeft', key: 'Shift' },
  { code: 'ShiftRight', key: 'Shift' },
];

function releaseStuckMovementKeys() {
  for (const { code, key } of MOVEMENT_KEYUP_EVENTS) {
    window.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true }));
  }
}

const WORLD_RENDER_OFFSET = 12;
const POSTER_THICKNESS = 0.08;

function placeFromHit(hit: HitResult): GridTarget | null {
  if (!hit.voxel || !hit.faceNormal) return null;

  return {
    x: hit.voxel.x + Math.round(hit.faceNormal.x),
    y: hit.voxel.y + Math.round(hit.faceNormal.y),
    z: hit.voxel.z + Math.round(hit.faceNormal.z),
  };
}

function previewFromHit(hit: HitResult | null, selectedSlot: HotbarSlot): GridTarget | null {
  if (!hit) return null;
  if (selectedSlot.kind === 'item' && selectedSlot.itemKind === 'block') return placeFromHit(hit);
  if (selectedSlot.kind === 'eraser') return hit.voxel ?? null;
  return null;
}

function posterPlacementFromHit(hit: HitResult | null, selectedSlot: HotbarSlot): Omit<PosterPlacement, 'id'> | null {
  if (!hit || !hit.faceNormal || selectedSlot.kind !== 'item' || selectedSlot.itemKind !== 'poster') return null;

  const target = placeFromHit(hit);
  if (!target) return null;

  return {
    itemId: selectedSlot.itemId,
    anchor: target,
    faceNormal: {
      x: Math.round(hit.faceNormal.x),
      y: Math.round(hit.faceNormal.y),
      z: Math.round(hit.faceNormal.z),
    },
    widthBlocks: selectedSlot.widthBlocks ?? 2,
    heightBlocks: selectedSlot.heightBlocks ?? 2,
  };
}

function samePosterPlacement(a: Omit<PosterPlacement, 'id'> | null, b: Omit<PosterPlacement, 'id'> | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.itemId === b.itemId &&
    a.anchor.x === b.anchor.x &&
    a.anchor.y === b.anchor.y &&
    a.anchor.z === b.anchor.z &&
    a.faceNormal.x === b.faceNormal.x &&
    a.faceNormal.y === b.faceNormal.y &&
    a.faceNormal.z === b.faceNormal.z &&
    a.widthBlocks === b.widthBlocks &&
    a.heightBlocks === b.heightBlocks
  );
}

function sameTarget(a: GridTarget | null, b: GridTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

function samePlayerTransform(a: PlayerTransformState, b: PlayerTransformState): boolean {
  return (
    a.position.x === b.position.x &&
    a.position.y === b.position.y &&
    a.position.z === b.position.z &&
    a.rotation.yaw === b.rotation.yaw &&
    a.rotation.pitch === b.rotation.pitch &&
    a.isFlying === b.isFlying
  );
}

function samePlayerPhysics(a: PlayerPhysicsState, b: PlayerPhysicsState): boolean {
  return a.velocityY === b.velocityY && a.isGrounded === b.isGrounded;
}

function PlayerController({
  isFlying,
  isKeyboardInputArmed,
  isWorldPaused,
  jumpRequestId,
  voxels,
}: {
  isFlying: boolean;
  isKeyboardInputArmed: boolean;
  isWorldPaused: boolean;
  jumpRequestId: number;
  voxels: Array<{ x: number; y: number; z: number }>;
}) {
  const [, getKeys] = useKeyboardControls<ControlKey>();
  const playerPhysics = useAppStore((s) => s.world.playerPhysics);
  const setPlayerPhysics = useAppStore((s) => s.setPlayerPhysics);
  const forwardVec = useRef(new Vector3());
  const rightVec = useRef(new Vector3());
  const moveVec = useRef(new Vector3());
  const physicsRef = useRef<PlayerPhysicsState>(playerPhysics);
  const lastPersistedPhysicsRef = useRef<PlayerPhysicsState>(playerPhysics);
  const lastPhysicsPersistTsRef = useRef(0);
  const handledJumpRequestIdRef = useRef(jumpRequestId);

  useEffect(() => {
    physicsRef.current = playerPhysics;
    lastPersistedPhysicsRef.current = playerPhysics;
  }, [playerPhysics]);

useFrame(({ camera }, delta) => {
    if (isWorldPaused || (!isKeyboardInputArmed && !hasTouchMovementInput())) {
      return;
    }

    const { forward, backward, left, right, up, down } = getKeys();
    const touch = touchInput.movement;

    const forwardAxis = (forward ? 1 : 0) - (backward ? 1 : 0) + (touch.forward ? 1 : 0) - (touch.backward ? 1 : 0);
    const sideAxis = (right ? 1 : 0) - (left ? 1 : 0) + (touch.right ? 1 : 0) - (touch.left ? 1 : 0);
    const verticalAxis = (up ? 1 : 0) - (down ? 1 : 0) + (touch.up ? 1 : 0) - (touch.down ? 1 : 0);

    const hasMovementInput = forwardAxis !== 0 || sideAxis !== 0 || (isFlying && verticalAxis !== 0);

    if (hasMovementInput) {
      camera.getWorldDirection(forwardVec.current);
      moveVec.current.set(0, 0, 0);

      if (isFlying) {
        if (forwardVec.current.lengthSq() > 0) {
          forwardVec.current.normalize();
        }
        rightVec.current.crossVectors(forwardVec.current, camera.up).normalize();
        moveVec.current.addScaledVector(forwardVec.current, forwardAxis);
        moveVec.current.addScaledVector(rightVec.current, sideAxis);
        moveVec.current.addScaledVector(camera.up, verticalAxis);
      } else {
        forwardVec.current.y = 0;
        if (forwardVec.current.lengthSq() > 0) {
          forwardVec.current.normalize();
        }
        rightVec.current.crossVectors(forwardVec.current, camera.up).normalize();
        moveVec.current.addScaledVector(forwardVec.current, forwardAxis);
        moveVec.current.addScaledVector(rightVec.current, sideAxis);
      }

      if (moveVec.current.lengthSq() > 0) {
        const speed = isFlying ? 7.2 : 4.8;
        const step = moveVec.current.normalize().multiplyScalar(speed * delta);
        const basePosition = camera.position.clone();

        const target = basePosition.clone().add(step);
        if (!playerIntersectsSolidVoxel(target, voxels)) {
          camera.position.copy(target);
        } else {
          const slideX = basePosition.clone().add(new Vector3(step.x, 0, 0));
          if (!playerIntersectsSolidVoxel(slideX, voxels)) {
            camera.position.copy(slideX);
          }

          const slideZ = camera.position.clone().add(new Vector3(0, 0, step.z));
          if (!playerIntersectsSolidVoxel(slideZ, voxels)) {
            camera.position.copy(slideZ);
          }

          if (isFlying) {
            const slideY = camera.position.clone().add(new Vector3(0, step.y, 0));
            if (!playerIntersectsSolidVoxel(slideY, voxels)) {
              camera.position.copy(slideY);
            }
          }
        }
      }
    }

    if (!isFlying) {
      const jumpRequested = jumpRequestId !== handledJumpRequestIdRef.current;
      handledJumpRequestIdRef.current = jumpRequestId;
      const nextVertical = stepPlayerVerticalPhysics({
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        physics: physicsRef.current,
        voxels,
        deltaSeconds: Math.min(delta, 0.05),
        jumpRequested,
        isFlying,
      });
      camera.position.set(nextVertical.position.x, nextVertical.position.y, nextVertical.position.z);
      physicsRef.current = nextVertical.physics;
    } else if (!samePlayerPhysics(physicsRef.current, { velocityY: 0, isGrounded: false })) {
      physicsRef.current = { velocityY: 0, isGrounded: false };
    }

    const now = performance.now();
    if (
      now - lastPhysicsPersistTsRef.current > 250 &&
      !samePlayerPhysics(physicsRef.current, lastPersistedPhysicsRef.current)
    ) {
      lastPhysicsPersistTsRef.current = now;
      lastPersistedPhysicsRef.current = physicsRef.current;
      setPlayerPhysics(physicsRef.current);
    }
  });

  return null;
}

function Scene({
  selectedSlot,
  isFlying,
  isKeyboardInputArmed,
  isWorldPaused,
  jumpRequestId,
  resourcePack,
  initialPlayerTransform,
}: {
  selectedSlot: HotbarSlot;
  isFlying: boolean;
  isKeyboardInputArmed: boolean;
  isWorldPaused: boolean;
  jumpRequestId: number;
  resourcePack: ResourcePackSpec;
  initialPlayerTransform: PlayerTransformState;
}) {
  const world = useAppStore((s) => s.world);
  const voxels = world.voxels;
  const posters = world.posters ?? [];
  const placeVoxel = useAppStore((s) => s.placeVoxel);
  const removeVoxel = useAppStore((s) => s.removeVoxel);
  const placePoster = useAppStore((s) => s.placePoster);
  const removePoster = useAppStore((s) => s.removePoster);
  const setPlayerTransform = useAppStore((s) => s.setPlayerTransform);

  const [previewTarget, setPreviewTarget] = useState<GridTarget | null>(null);
  const [posterPreview, setPosterPreview] = useState<Omit<PosterPlacement, 'id'> | null>(null);

  const { camera, gl, scene } = useThree();
  const raycasterRef = useRef(new Raycaster());
  const mouseNdcRef = useRef(new Vector2(0, 0));
  const currentHitRef = useRef<HitResult | null>(null);
  const lastPersistedTransformRef = useRef<PlayerTransformState>(initialPlayerTransform);
  const lastPersistTsRef = useRef(0);

  const isFreeLookRef = useRef(false);
  const yawPitchRef = useRef({ yaw: 0, pitch: 0 });
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const touchLookRef = useRef<{ pointerId: number; lastX: number; lastY: number; moved: boolean } | null>(null);
  const TOUCH_LOOK_SENSITIVITY = 0.0042;
  const TOUCH_DRAG_THRESHOLD = 8;

  const findHit = useCallback(
    (ndc: Vector2): HitResult | null => {
      const raycaster = raycasterRef.current;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const hit = hits.find((candidate) => {
        const kind = candidate.object.userData?.kind as 'voxel' | 'poster' | undefined;
        if (selectedSlot.kind === 'eraser') {
          return kind === 'voxel' || kind === 'poster';
        }
        return kind === 'voxel';
      });
      if (!hit) return null;

      const hitKind = hit.object.userData?.kind as 'voxel' | 'poster' | undefined;
      if (hitKind === 'voxel') {
        return {
          kind: 'voxel',
          point: hit.point.clone(),
          faceNormal: hit.face?.normal.clone(),
          voxel: {
            x: hit.object.userData?.x as number,
            y: hit.object.userData?.y as number,
            z: hit.object.userData?.z as number,
          },
        };
      }
      if (hitKind === 'poster') {
        return {
          kind: 'poster',
          point: hit.point.clone(),
          posterId: hit.object.userData?.posterId as string,
        };
      }
      return null;
    },
    [camera, scene, selectedSlot],
  );

  const performSlotAction = useCallback(
    (hit: HitResult | null) => {
      if (!hit) return;
      if (selectedSlot.kind === 'item' && selectedSlot.itemKind === 'block') {
        const target = placeFromHit(hit);
        if (!target) return;
        placeVoxel(target.x, target.y, target.z, selectedSlot.itemId);
        return;
      }
      if (selectedSlot.kind === 'item' && selectedSlot.itemKind === 'poster') {
        const placement = posterPlacementFromHit(hit, selectedSlot);
        if (!placement) return;
        placePoster(placement);
        return;
      }
      if (selectedSlot.kind === 'eraser') {
        if (hit.kind === 'poster' && hit.posterId) {
          removePoster(hit.posterId);
          return;
        }
        if (hit.kind !== 'voxel' || !hit.voxel) return;
        removeVoxel(hit.voxel.x, hit.voxel.y, hit.voxel.z);
      }
    },
    [placePoster, placeVoxel, removePoster, removeVoxel, selectedSlot],
  );

  const previewEdgesGeometry = useMemo(() => new EdgesGeometry(new BoxGeometry(1.02, 1.02, 1.02)), []);
  const posterPreviewEdgesGeometry = useMemo(() => new EdgesGeometry(new BoxGeometry(2.02, 2.02, 0.04)), []);
  const previewEdgesMaterial = useMemo(
    () => new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthTest: false }),
    [],
  );
  const validPosterPreviewMaterial = useMemo(
    () => new LineBasicMaterial({ color: '#8cff91', transparent: true, opacity: 0.95, depthTest: false }),
    [],
  );
  const invalidPosterPreviewMaterial = useMemo(
    () => new LineBasicMaterial({ color: '#ff6b6b', transparent: true, opacity: 0.95, depthTest: false }),
    [],
  );

  const textureUrls = useMemo(() => {
    const faceUrls = Object.values(resourcePack.world.blocks)
      .flatMap((spec) => [
        spec.faceTextures?.top,
        spec.faceTextures?.bottom,
        spec.faceTextures?.side,
      ])
      .filter((url): url is string => Boolean(url));

    const urls = [
      resourcePack.world.skyTextureUrl,
      resourcePack.world.defaultBlock.textureUrl,
      ...Object.values(resourcePack.world.blocks).map((spec) => spec.textureUrl),
      ...faceUrls,
      ...posterItemsCatalog.items.map((poster) => poster.image),
    ];
    return [...new Set(urls)];
  }, [resourcePack]);

  const loadedTextures = useTexture(textureUrls);

  const textureByUrl = useMemo<Record<string, Texture>>(() => {
    const result: Record<string, Texture> = {};
    textureUrls.forEach((url, idx) => {
      const texture = loadedTextures[idx];
      if (texture) {
        result[url] = texture;
      }
    });
    return result;
  }, [loadedTextures, textureUrls]);

  const rotatedTextureByKey = useMemo(() => {
    const rotatedTextures = new Map<string, Texture>();

    for (const spec of Object.values(resourcePack.world.blocks)) {
      const candidates = [
        [spec.faceTextures?.top ?? spec.textureUrl, spec.faceTextureRotationDeg?.top],
        [spec.faceTextures?.bottom ?? spec.textureUrl, spec.faceTextureRotationDeg?.bottom],
        [spec.faceTextures?.side ?? spec.textureUrl, spec.faceTextureRotationDeg?.side],
      ] as const;

      for (const [url, rotationDeg] of candidates) {
        if (!url || !rotationDeg || rotationDeg % 360 === 0 || rotatedTextures.has(`${url}|${rotationDeg}`)) {
          continue;
        }

        const source = textureByUrl[url];
        if (!source) {
          continue;
        }

        const rotated = source.clone();
        rotated.center.set(0.5, 0.5);
        rotated.rotation = (rotationDeg * Math.PI) / 180;
        rotated.needsUpdate = true;
        rotatedTextures.set(`${url}|${rotationDeg}`, rotated);
      }
    }

    return rotatedTextures;
  }, [resourcePack, textureByUrl]);

  useEffect(() => {
    return () => {
      for (const texture of rotatedTextureByKey.values()) {
        texture.dispose();
      }
    };
  }, [rotatedTextureByKey]);

  function resolveTexture(url: string, rotationDeg?: number): Texture | null {
    const source = textureByUrl[url] ?? null;
    if (!source) return null;
    if (!rotationDeg || rotationDeg % 360 === 0) return source;

    return rotatedTextureByKey.get(`${url}|${rotationDeg}`) ?? source;
  }

  const skyTexture = textureByUrl[resourcePack.world.skyTextureUrl] ?? null;

  const persistCurrentPlayerTransform = useCallback(
    (force = false) => {
      const now = performance.now();
      if (!force && now - lastPersistTsRef.current < 150) {
        return;
      }

      const euler = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      yawPitchRef.current = {
        yaw: euler.y,
        pitch: euler.x,
      };

      const nextPlayerTransform: PlayerTransformState = {
        position: {
          x: Number(camera.position.x.toFixed(4)),
          y: Number(camera.position.y.toFixed(4)),
          z: Number(camera.position.z.toFixed(4)),
        },
        rotation: {
          yaw: Number(euler.y.toFixed(4)),
          pitch: Number(euler.x.toFixed(4)),
        },
        isFlying,
      };

      if (samePlayerTransform(nextPlayerTransform, lastPersistedTransformRef.current)) {
        return;
      }

      lastPersistTsRef.current = now;
      lastPersistedTransformRef.current = nextPlayerTransform;
      setPlayerTransform(nextPlayerTransform);
    },
    [camera, isFlying, setPlayerTransform],
  );

  useEffect(() => {
    camera.position.set(
      initialPlayerTransform.position.x,
      initialPlayerTransform.position.y,
      initialPlayerTransform.position.z,
    );
    camera.rotation.set(
      initialPlayerTransform.rotation.pitch,
      initialPlayerTransform.rotation.yaw,
      0,
      'YXZ',
    );
    yawPitchRef.current = {
      yaw: initialPlayerTransform.rotation.yaw,
      pitch: initialPlayerTransform.rotation.pitch,
    };
    lastPersistedTransformRef.current = initialPlayerTransform;
  }, [camera, initialPlayerTransform]);

  useEffect(() => {
    return () => {
      previewEdgesGeometry.dispose();
      posterPreviewEdgesGeometry.dispose();
      previewEdgesMaterial.dispose();
      validPosterPreviewMaterial.dispose();
      invalidPosterPreviewMaterial.dispose();
    };
  }, [invalidPosterPreviewMaterial, posterPreviewEdgesGeometry, previewEdgesGeometry, previewEdgesMaterial, validPosterPreviewMaterial]);

  useEffect(() => {
    if (isWorldPaused) {
      isFreeLookRef.current = false;
      touchLookRef.current = null;
    }
  }, [isWorldPaused]);

  useEffect(() => {
    const canvas = gl.domElement;

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      mouseNdcRef.current.x = (x / rect.width) * 2 - 1;
      mouseNdcRef.current.y = -(y / rect.height) * 2 + 1;

      const touchLook = touchLookRef.current;
      if (touchLook && event.pointerId === touchLook.pointerId) {
        const dx = event.clientX - touchLook.lastX;
        const dy = event.clientY - touchLook.lastY;
        touchLook.lastX = event.clientX;
        touchLook.lastY = event.clientY;

        if (!touchLook.moved && Math.hypot(dx, dy) < TOUCH_DRAG_THRESHOLD) {
          return;
        }
        touchLook.moved = true;

        yawPitchRef.current.yaw -= dx * TOUCH_LOOK_SENSITIVITY;
        yawPitchRef.current.pitch -= dy * TOUCH_LOOK_SENSITIVITY;
        yawPitchRef.current.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, yawPitchRef.current.pitch));

        camera.rotation.set(yawPitchRef.current.pitch, yawPitchRef.current.yaw, 0, 'YXZ');
        return;
      }

      if (!isFreeLookRef.current) return;

      const dx = event.clientX - lastMouseRef.current.x;
      const dy = event.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: event.clientX, y: event.clientY };

      const sensitivity = 0.0026;
      yawPitchRef.current.yaw -= dx * sensitivity;
      yawPitchRef.current.pitch -= dy * sensitivity;
      yawPitchRef.current.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, yawPitchRef.current.pitch));

      camera.rotation.set(yawPitchRef.current.pitch, yawPitchRef.current.yaw, 0, 'YXZ');
    };

    const onPointerDown = (event: PointerEvent) => {
      if (isWorldPaused) return;

      if (event.pointerType === 'touch') {
        if (event.button !== 0) return;
        touchLookRef.current = {
          pointerId: event.pointerId,
          lastX: event.clientX,
          lastY: event.clientY,
          moved: false,
        };
        return;
      }

      if (event.button === 2) {
        isFreeLookRef.current = true;
        lastMouseRef.current = { x: event.clientX, y: event.clientY };

        const euler = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        yawPitchRef.current = { yaw: euler.y, pitch: euler.x };
        return;
      }

      if (event.button !== 0) return;

      performSlotAction(currentHitRef.current);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        const touchLook = touchLookRef.current;
        if (!touchLook || touchLook.pointerId !== event.pointerId) return;
        touchLookRef.current = null;

        if (!touchLook.moved) {
          const rect = canvas.getBoundingClientRect();
          mouseNdcRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouseNdcRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          const hit = findHit(mouseNdcRef.current);
          currentHitRef.current = hit;
          performSlotAction(hit);
        }
        persistCurrentPlayerTransform(true);
        return;
      }

      if (event.button === 2) {
        isFreeLookRef.current = false;
        persistCurrentPlayerTransform(true);
      }
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [camera, findHit, gl, isWorldPaused, performSlotAction, persistCurrentPlayerTransform]);

  useEffect(() => {
    const flushTransform = () => persistCurrentPlayerTransform(true);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushTransform();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', flushTransform);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', flushTransform);
      flushTransform();
    };
  }, [persistCurrentPlayerTransform]);

  useFrame(() => {
    const currentHit = findHit(mouseNdcRef.current);
    currentHitRef.current = currentHit;

    const nextPreview = previewFromHit(currentHit, selectedSlot);
    if (!sameTarget(previewTarget, nextPreview)) {
      setPreviewTarget(nextPreview);
    }

    const nextPosterPreview = posterPlacementFromHit(currentHit, selectedSlot);
    if (!samePosterPlacement(posterPreview, nextPosterPreview)) {
      setPosterPreview(nextPosterPreview);
    }

    persistCurrentPlayerTransform();
  });

  return (
    <>
      <color attach="background" args={['#9ed8ff']} />
      <ambientLight intensity={0.92} />
      <directionalLight intensity={1.05} position={[8, 10, 6]} />

      <mesh position={[0, 12, 0]}>
        <sphereGeometry args={[72, 28, 22]} />
        <meshBasicMaterial map={skyTexture} side={BackSide} />
      </mesh>

      {voxels.map((v) => {
        const materialKey = v.blockId ?? 'default';
        const spec = resourcePack.world.blocks[materialKey] ?? resourcePack.world.defaultBlock;
        const sideTextureUrl = spec.faceTextures?.side ?? spec.textureUrl;
        const topTextureUrl = spec.faceTextures?.top ?? spec.textureUrl;
        const bottomTextureUrl = spec.faceTextures?.bottom ?? spec.textureUrl;
        const sideTexture =
          resolveTexture(sideTextureUrl, spec.faceTextureRotationDeg?.side) ??
          textureByUrl[spec.textureUrl] ??
          null;
        const topTexture =
          resolveTexture(topTextureUrl, spec.faceTextureRotationDeg?.top) ??
          textureByUrl[spec.textureUrl] ??
          null;
        const bottomTexture =
          resolveTexture(bottomTextureUrl, spec.faceTextureRotationDeg?.bottom) ??
          textureByUrl[spec.textureUrl] ??
          null;

        return (
          <mesh
            key={`${v.x}:${v.y}:${v.z}`}
            position={[v.x - WORLD_RENDER_OFFSET, v.y + 0.5, v.z - WORLD_RENDER_OFFSET]}
            userData={{ kind: 'voxel', x: v.x, y: v.y, z: v.z }}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              attach="material-0"
              map={sideTexture}
              color={spec.color}
              emissive={spec.emissive ?? '#000000'}
              metalness={spec.metalness ?? 0.05}
              roughness={spec.roughness ?? 0.88}
              transparent={spec.transparent}
              opacity={spec.opacity ?? 1}
              depthWrite={spec.transparent ? false : undefined}
            />
            <meshStandardMaterial
              attach="material-1"
              map={sideTexture}
              color={spec.color}
              emissive={spec.emissive ?? '#000000'}
              metalness={spec.metalness ?? 0.05}
              roughness={spec.roughness ?? 0.88}
              transparent={spec.transparent}
              opacity={spec.opacity ?? 1}
              depthWrite={spec.transparent ? false : undefined}
            />
            <meshStandardMaterial
              attach="material-2"
              map={topTexture}
              color={spec.color}
              emissive={spec.emissive ?? '#000000'}
              metalness={spec.metalness ?? 0.05}
              roughness={spec.roughness ?? 0.88}
              transparent={spec.transparent}
              opacity={spec.opacity ?? 1}
              depthWrite={spec.transparent ? false : undefined}
            />
            <meshStandardMaterial
              attach="material-3"
              map={bottomTexture}
              color={spec.color}
              emissive={spec.emissive ?? '#000000'}
              metalness={spec.metalness ?? 0.05}
              roughness={spec.roughness ?? 0.88}
              transparent={spec.transparent}
              opacity={spec.opacity ?? 1}
              depthWrite={spec.transparent ? false : undefined}
            />
            <meshStandardMaterial
              attach="material-4"
              map={sideTexture}
              color={spec.color}
              emissive={spec.emissive ?? '#000000'}
              metalness={spec.metalness ?? 0.05}
              roughness={spec.roughness ?? 0.88}
              transparent={spec.transparent}
              opacity={spec.opacity ?? 1}
              depthWrite={spec.transparent ? false : undefined}
            />
            <meshStandardMaterial
              attach="material-5"
              map={sideTexture}
              color={spec.color}
              emissive={spec.emissive ?? '#000000'}
              metalness={spec.metalness ?? 0.05}
              roughness={spec.roughness ?? 0.88}
              transparent={spec.transparent}
              opacity={spec.opacity ?? 1}
              depthWrite={spec.transparent ? false : undefined}
            />
          </mesh>
        );
      })}

      {posters.map((poster) => {
        const posterSpec = posterItemsCatalog.items.find((item) => item.id === poster.itemId);
        const texture = posterSpec ? textureByUrl[posterSpec.image] : null;
        return (
          <group key={poster.id}>
            <mesh
              position={posterBoardPosition(poster)}
              rotation={[0, posterRotationY(poster), 0]}
              userData={{ kind: 'poster', posterId: poster.id }}
            >
              <boxGeometry args={[poster.widthBlocks, poster.heightBlocks, POSTER_THICKNESS]} />
              <meshStandardMaterial color="#f2ead8" roughness={0.82} metalness={0.03} />
            </mesh>
            <mesh
              position={posterFrontPosition(poster)}
              rotation={[0, posterRotationY(poster), 0]}
              raycast={() => null}
              renderOrder={6}
            >
              <planeGeometry args={[poster.widthBlocks, poster.heightBlocks]} />
              <meshBasicMaterial map={texture} transparent alphaTest={0.08} depthWrite />
            </mesh>
          </group>
        );
      })}

      {previewTarget ? (
        <lineSegments
          geometry={previewEdgesGeometry}
          material={previewEdgesMaterial}
          position={[previewTarget.x - WORLD_RENDER_OFFSET, previewTarget.y + 0.5, previewTarget.z - WORLD_RENDER_OFFSET]}
          raycast={() => null}
          renderOrder={10}
        />
      ) : null}

      {posterPreview ? (
        <lineSegments
          geometry={posterPreviewEdgesGeometry}
          material={canPlacePoster(world, posterPreview) ? validPosterPreviewMaterial : invalidPosterPreviewMaterial}
          position={posterPosition(posterPreview)}
          rotation={[0, posterRotationY(posterPreview), 0]}
          raycast={() => null}
          renderOrder={11}
        />
      ) : null}

      <PlayerController
        isFlying={isFlying}
        isKeyboardInputArmed={isKeyboardInputArmed}
        isWorldPaused={isWorldPaused}
        jumpRequestId={jumpRequestId}
        voxels={voxels}
      />
    </>
  );
}

function makeHotbarSlots(inventorySlots: InventorySlot[], nameByItemId: Record<string, string>): HotbarSlot[] {
  const slots: HotbarSlot[] = [{ kind: 'eraser', label: 'Ластик' }];
  const slotByIndex = new Map(
    inventorySlots
      .filter((slot) => slot.area === 'hotbar' && slot.count > 0)
      .map((slot) => [slot.index, slot]),
  );

  for (let i = 0; i < 8; i += 1) {
    const item = slotByIndex.get(i + 1);
    if (!item) {
      slots.push({ kind: 'empty', label: 'Пусто' });
      continue;
    }
    const posterSpec = posterItemsCatalog.items.find((poster) => poster.id === item.itemId);
    slots.push({
      kind: 'item',
      itemKind: item.itemKind === 'poster' ? 'poster' : 'block',
      itemId: item.itemId,
      count: item.count,
      label: nameByItemId[item.itemId] ?? item.itemId,
      iconUrl: posterSpec?.image,
      widthBlocks: posterSpec?.widthBlocks,
      heightBlocks: posterSpec?.heightBlocks,
    });
  }

  return slots;
}

function getSlotIconUrl(slot: HotbarSlot, resourcePack: ResourcePackSpec): string | null {
  if (slot.kind !== 'item') return null;
  if (slot.itemKind === 'poster') return slot.iconUrl ?? null;
  const spec = resourcePack.world.blocks[slot.itemId] ?? resourcePack.world.defaultBlock;
  if (slot.itemId === 'block_grass_dirt') {
    return spec.faceTextures?.side ?? spec.textureUrl;
  }
  return spec.faceTextures?.top ?? spec.textureUrl;
}

function posterPosition(placement: Omit<PosterPlacement, 'id'>): [number, number, number] {
  const normal = placement.faceNormal;
  const widthOffset = (placement.widthBlocks - 1) / 2;
  const y = placement.anchor.y + placement.heightBlocks / 2;

  if (Math.abs(normal.x) > 0) {
    return [
      placement.anchor.x - WORLD_RENDER_OFFSET - normal.x * 0.5,
      y,
      placement.anchor.z - WORLD_RENDER_OFFSET + widthOffset,
    ];
  }

  return [
    placement.anchor.x - WORLD_RENDER_OFFSET + widthOffset,
    y,
    placement.anchor.z - WORLD_RENDER_OFFSET - normal.z * 0.5,
  ];
}

function posterBoardPosition(placement: Omit<PosterPlacement, 'id'>): [number, number, number] {
  const [x, y, z] = posterPosition(placement);
  return [
    x + placement.faceNormal.x * (POSTER_THICKNESS / 2),
    y,
    z + placement.faceNormal.z * (POSTER_THICKNESS / 2),
  ];
}

function posterFrontPosition(placement: Omit<PosterPlacement, 'id'>): [number, number, number] {
  const [x, y, z] = posterPosition(placement);
  return [
    x + placement.faceNormal.x * (POSTER_THICKNESS + 0.004),
    y,
    z + placement.faceNormal.z * (POSTER_THICKNESS + 0.004),
  ];
}

function posterRotationY(placement: Omit<PosterPlacement, 'id'>): number {
  const normal = placement.faceNormal;
  if (normal.x > 0) return Math.PI / 2;
  if (normal.x < 0) return -Math.PI / 2;
  if (normal.z < 0) return Math.PI;
  return 0;
}

export function BuildScreen() {
  const inventorySlots = useAppStore((s) => s.inventory.slots);
  const playerTransform = useAppStore((s) => s.world.playerTransform);
  const setInventorySlots = useAppStore((s) => s.setInventorySlots);
  const resourcePack = useResourcePack();
  const itemNameById = useMemo(() => {
    const entries = [
      ...resourceItemsCatalog.items.map((item) => [item.id, item.name] as const),
      ...posterItemsCatalog.items.map((item) => [item.id, item.name] as const),
    ];
    return Object.fromEntries(entries);
  }, []);

  const hotbarSlots = useMemo(() => makeHotbarSlots(inventorySlots ?? [], itemNameById), [inventorySlots, itemNameById]);

  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(1);
  const [isFlying, setIsFlying] = useState(playerTransform.isFlying);
  const [isWorldPaused, setIsWorldPaused] = useState(false);
  const [isKeyboardInputArmed, setIsKeyboardInputArmed] = useState(true);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [cursorSlot, setCursorSlot] = useState<InventorySlot | null>(null);
  const [dragState, setDragState] = useState<InventoryDragState | null>(null);
  const [carriedPointer, setCarriedPointer] = useState({ x: 0, y: 0 });
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);
  const [jumpRequestId, setJumpRequestId] = useState(0);
  const lastSpacePressRef = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const suppressSlotClickRef = useRef(false);
  const pauseWorld = useCallback(() => {
    setIsWorldPaused(true);
    setIsKeyboardInputArmed(false);
    releaseStuckMovementKeys();
  }, []);
  const resumeWorld = useCallback(() => {
    setIsWorldPaused(false);
    releaseStuckMovementKeys();
  }, []);
const requestJump = useCallback(() => {
    setJumpRequestId((prev) => prev + 1);
  }, []);
  const toggleFly = useCallback(() => {
    setIsFlying((prev) => !prev);
  }, []);
  const closeInventory = useCallback(() => {
    if (cursorSlot) {
      const result = applyInventoryAction(inventorySlots, cursorSlot, cursorSlot.area, cursorSlot.index);
      setInventorySlots(result.slots);
      setCursorSlot(result.cursor);
    } else {
      setCursorSlot(null);
    }
    setDragState(null);
    setPendingDelete(null);
    setIsInventoryOpen(false);
    resumeWorld();
  }, [cursorSlot, inventorySlots, resumeWorld, setInventorySlots]);
  const toggleInventory = useCallback(() => {
    if (isInventoryOpen) {
      closeInventory();
    } else {
      setIsInventoryOpen(true);
      pauseWorld();
    }
  }, [closeInventory, isInventoryOpen, pauseWorld]);

  useEffect(() => {
    const onWindowBlur = () => {
      pauseWorld();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pauseWorld();
      }
    };

    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [pauseWorld]);

  useEffect(() => {
    const isInsideStage = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      const stage = stageRef.current;
      if (!stage) return false;
      return stage.contains(target);
    };

    const onPointerDownAnywhere = (event: PointerEvent) => {
      if (isInventoryOpen) {
        pauseWorld();
        return;
      }
      if (isInsideStage(event.target)) {
        resumeWorld();
        return;
      }
      pauseWorld();
    };

    const onContextMenuAnywhere = (event: MouseEvent) => {
      if (isInsideStage(event.target)) return;
      pauseWorld();
    };

    window.addEventListener('pointerdown', onPointerDownAnywhere, true);
    window.addEventListener('contextmenu', onContextMenuAnywhere);
    return () => {
      window.removeEventListener('pointerdown', onPointerDownAnywhere, true);
      window.removeEventListener('contextmenu', onContextMenuAnywhere);
    };
  }, [isInventoryOpen, pauseWorld, resumeWorld]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (MOVEMENT_KEY_CODES.has(event.code)) {
        setIsKeyboardInputArmed(true);
      }

      if (event.code === 'KeyE' && !event.repeat) {
        if (isInventoryOpen) {
          closeInventory();
        } else {
          setIsInventoryOpen(true);
          pauseWorld();
        }
        return;
      }

      if (event.code === 'Escape' && !event.repeat && isInventoryOpen) {
        closeInventory();
        return;
      }

      if (event.code === 'Space' && !event.repeat) {
        if (!isFlying) {
          requestJump();
        }
        const now = Date.now();
        if (now - lastSpacePressRef.current <= 300) {
          setIsFlying((prev) => !prev);
        }
        lastSpacePressRef.current = now;
        return;
      }

      if (event.code === 'KeyM' && !event.repeat) {
        const { player, inventory, world } = useAppStore.getState();
        void copyLocalAppSnapshotToClipboard({ player, inventory, world }).catch((error) => {
          console.error('Failed to copy debug snapshot', error);
        });
        return;
      }

      if (event.code.startsWith('Digit')) {
        const digit = Number(event.code.replace('Digit', ''));
        if (digit >= 1 && digit <= 9) {
          setSelectedSlotIndex(digit - 1);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeInventory, isFlying, isInventoryOpen, pauseWorld, requestJump]);

  const selectedSlot = hotbarSlots[selectedSlotIndex] ?? hotbarSlots[1];

  const inventorySlotToHotbarSlot = (slot: InventorySlot, label: string): HotbarSlot => ({
    kind: 'item',
    itemKind: slot.itemKind === 'poster' ? 'poster' : 'block',
    itemId: slot.itemId,
    count: slot.count,
    label,
    iconUrl: posterItemsCatalog.items.find((poster) => poster.id === slot.itemId)?.image,
  });

  const findDropTarget = (clientX: number, clientY: number): InventorySlotAddress | null => {
    const element = document.elementFromPoint(clientX, clientY);
    if (element?.closest('[data-inventory-delete-slot]')) {
      return { area: 'main', index: -1 };
    }
    const slotElement = element?.closest<HTMLElement>('[data-inventory-area][data-inventory-index]');
    if (!slotElement) return null;
    const area = slotElement.dataset.inventoryArea;
    const index = Number(slotElement.dataset.inventoryIndex);
    if ((area !== 'hotbar' && area !== 'main') || !Number.isInteger(index)) return null;
    return { area, index };
  };

  const renderInventorySlot = (area: 'hotbar' | 'main', index: number) => {
    const address = { area, index };
    const slot = inventorySlots.find((item) => item.area === area && item.index === index);
    const label = slot ? (itemNameById[slot.itemId] ?? slot.itemId) : '-';
    const iconUrl = slot ? getSlotIconUrl(inventorySlotToHotbarSlot(slot, label), resourcePack) : null;
    const isDragSource =
      dragState?.source.area === area &&
      dragState.source.index === index &&
      dragState.hasMoved;

    const applyAction = (splitMode = false, pointer?: { clientX: number; clientY: number }) => {
      if (pointer) {
        setCarriedPointer({ x: pointer.clientX, y: pointer.clientY });
      }
      const result = applyInventoryAction(inventorySlots, cursorSlot, area, index, splitMode);
      setInventorySlots(result.slots);
      setCursorSlot(result.cursor);
      setPendingDelete(null);
    };

    return (
      <button
        key={`${area}-${index}`}
        type="button"
        className={`inventory-slot ${isDragSource ? 'is-drag-source' : ''}`}
        data-inventory-area={area}
        data-inventory-index={index}
        onClick={(e) => {
          if (suppressSlotClickRef.current) {
            suppressSlotClickRef.current = false;
            return;
          }
          applyAction(false, e);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          applyAction(true, e);
        }}
        onPointerDown={(e) => {
          if (e.button !== 0 || !slot || cursorSlot) return;
          setDragState({
            source: address,
            slot,
            startX: e.clientX,
            startY: e.clientY,
            x: e.clientX,
            y: e.clientY,
            hasMoved: false,
          });
          setCarriedPointer({ x: e.clientX, y: e.clientY });
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragState || dragState.source.area !== area || dragState.source.index !== index) return;
          const hasMoved =
            dragState.hasMoved ||
            Math.abs(e.clientX - dragState.startX) > 4 ||
            Math.abs(e.clientY - dragState.startY) > 4;
          setDragState({ ...dragState, x: e.clientX, y: e.clientY, hasMoved });
          setCarriedPointer({ x: e.clientX, y: e.clientY });
        }}
        onPointerUp={(e) => {
          if (!dragState || dragState.source.area !== area || dragState.source.index !== index) return;
          if (dragState.hasMoved) {
            suppressSlotClickRef.current = true;
            const target = findDropTarget(e.clientX, e.clientY);
            if (target?.index === -1) {
              setPendingDelete({ source: dragState.source, slot: dragState.slot });
            } else if (target) {
              setInventorySlots(moveInventoryStack(inventorySlots, dragState.source, target));
              setPendingDelete(null);
            }
          }
          setDragState(null);
        }}
        title={slot ? `${label}: ${slot.count}` : 'Пусто'}
      >
        {iconUrl ? <span className="inventory-slot-icon" aria-hidden style={{ backgroundImage: `url("${iconUrl}")` }} /> : null}
        {slot ? <span className="inventory-slot-count">{slot.count}</span> : null}
      </button>
    );
  };

  const carriedSlot = dragState?.hasMoved ? dragState.slot : cursorSlot;
  const carriedLabel = carriedSlot ? (itemNameById[carriedSlot.itemId] ?? carriedSlot.itemId) : '';
  const carriedIconUrl = carriedSlot ? getSlotIconUrl(inventorySlotToHotbarSlot(carriedSlot, carriedLabel), resourcePack) : null;

  return (
    <div className="build-screen">
      <div
        ref={stageRef}
        className="build-stage"
        style={{
          overflow: 'hidden',
          position: 'relative',
        }}
        onPointerDownCapture={(event) => {
          if (event.target instanceof Element && event.target.closest('.inventory-overlay')) return;
          resumeWorld();
        }}
        onFocusCapture={resumeWorld}
        onContextMenu={(e) => e.preventDefault()}
      >
        <KeyboardControls map={keyMap}>
          <Canvas
            camera={{
              position: [
                playerTransform.position.x,
                playerTransform.position.y,
                playerTransform.position.z,
              ],
              fov: 70,
            }}
          >
            <Scene
              selectedSlot={selectedSlot}
              isFlying={isFlying}
              isKeyboardInputArmed={isKeyboardInputArmed}
              isWorldPaused={isWorldPaused}
              jumpRequestId={jumpRequestId}
              resourcePack={resourcePack}
              initialPlayerTransform={playerTransform}
            />
          </Canvas>
        </KeyboardControls>
        <VirtualJoystick
          onJump={requestJump}
          onToggleFly={toggleFly}
          onToggleInventory={toggleInventory}
          isFlying={isFlying}
        />

        <div className="hotbar" aria-label="Инвентарь">
          {hotbarSlots.map((slot, idx) => {
            const selected = idx === selectedSlotIndex;
            return (
              <button
                key={`slot-${idx}`}
                type="button"
                className={`hotbar-slot ${selected ? 'selected' : ''}`}
                onClick={() => setSelectedSlotIndex(idx)}
                title={`${idx + 1}: ${slot.label}`}
              >
                <span className="hotbar-slot-index">{idx + 1}</span>
                {slot.kind === 'item' ? (
                  <span
                    className="hotbar-slot-icon"
                    aria-hidden
                    style={{ backgroundImage: `url("${getSlotIconUrl(slot, resourcePack)}")` }}
                  />
                ) : slot.kind === 'eraser' ? (
                  <span className="hotbar-eraser-icon" aria-hidden />
                ) : (
                  <span className="hotbar-slot-label">-</span>
                )}
                {slot.kind === 'item' ? <span className="hotbar-slot-count">{slot.count}</span> : null}
              </button>
            );
          })}
        </div>

        {isInventoryOpen ? (
          <div
            className="inventory-overlay"
            role="dialog"
            aria-label="Полный инвентарь"
            onPointerMove={(e) => {
              if (cursorSlot && !dragState) {
                setCarriedPointer({ x: e.clientX, y: e.clientY });
              }
            }}
          >
            <div className="inventory-panel">
              <div className="inventory-cursor" aria-live="polite">
                {cursorSlot ? `${itemNameById[cursorSlot.itemId] ?? cursorSlot.itemId} x${cursorSlot.count}` : ' '}
              </div>
              <div className="inventory-grid">
                {Array.from({ length: 27 }, (_, index) => renderInventorySlot('main', index))}
              </div>
              <div className="inventory-hotbar-grid">
                {Array.from({ length: 8 }, (_, index) => renderInventorySlot('hotbar', index + 1))}
              </div>
              <button
                type="button"
                className={`inventory-delete-slot ${pendingDelete ? 'is-confirming' : ''}`}
                data-inventory-delete-slot
                onClick={() => {
                  if (pendingDelete?.source) {
                    setInventorySlots(deleteInventoryStack(inventorySlots, pendingDelete.source));
                    setPendingDelete(null);
                    return;
                  }
                  if (pendingDelete && cursorSlot) {
                    const result = deleteCarriedInventoryStack(inventorySlots);
                    setInventorySlots(result.slots);
                    setCursorSlot(result.cursor);
                    setPendingDelete(null);
                    return;
                  }
                  if (cursorSlot) {
                    setPendingDelete({ source: null, slot: cursorSlot });
                  }
                }}
                onPointerUp={(e) => {
                  if (!dragState?.hasMoved) return;
                  suppressSlotClickRef.current = true;
                  setPendingDelete({ source: dragState.source, slot: dragState.slot });
                  setDragState(null);
                  setCarriedPointer({ x: e.clientX, y: e.clientY });
                }}
                onContextMenu={(e) => e.preventDefault()}
                title={pendingDelete ? 'Нажмите еще раз, чтобы подтвердить удаление' : 'Перетащите или положите сюда стек для удаления'}
              >
                <span className="inventory-delete-icon" aria-hidden />
                {pendingDelete ? <span className="inventory-delete-badge">{pendingDelete.slot.count}</span> : null}
              </button>
            </div>
            {carriedSlot ? (
              <div
                className="inventory-carried-stack"
                aria-hidden
                style={{ left: carriedPointer.x + 12, top: carriedPointer.y + 12 }}
              >
                {carriedIconUrl ? <span className="inventory-carried-icon" style={{ backgroundImage: `url("${carriedIconUrl}")` }} /> : null}
                <span className="inventory-carried-count">{carriedSlot.count}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      <div className="build-touch-hint" aria-hidden>
          Джойстик — движение · свайп — обзор · тап — действие слота
        </div>
        {isWorldPaused ? (
          <div className="build-pause-hint">Мир на паузе: кликните по окну мира, чтобы продолжить.</div>
        ) : null}
      </div>

      <div className="build-hud">
        <BuildHUD isFlying={isFlying} packName={resourcePack.displayName} />
      </div>

      <p className="build-controls-hint">
        ЛКМ: действие выбранного слота. Слот 1: ластик (удаление). Удержание ПКМ: свободный обзор камеры. WASD: движение. Двойной Space: режим полета. В полете: Space вверх, Shift вниз.
      </p>
    </div>
  );
}




