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
import type { PlayerTransformState } from '../../domains/world/model';

type ControlKey = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down';
type GridTarget = { x: number; y: number; z: number };
type HitResult = {
  kind: 'voxel';
  point: Vector3;
  faceNormal?: Vector3;
  voxel?: GridTarget;
};
type HotbarSlot =
  | { kind: 'eraser'; label: string }
  | { kind: 'item'; itemId: string; count: number; label: string }
  | { kind: 'empty'; label: string };

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

const PLAYER_HEIGHT = 1.62;
const PLAYER_RADIUS = 0.32;
const STANDING_EYE_Y = 2.62;

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
  if (selectedSlot.kind === 'item') return placeFromHit(hit);
  if (selectedSlot.kind === 'eraser') return hit.voxel ?? null;
  return null;
}

function sameTarget(a: GridTarget | null, b: GridTarget | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

function collidesWithVoxel(position: Vector3, voxels: Array<{ x: number; y: number; z: number }>): boolean {
  const minX = position.x - PLAYER_RADIUS;
  const maxX = position.x + PLAYER_RADIUS;
  const minY = position.y - PLAYER_HEIGHT;
  const maxY = position.y;
  const minZ = position.z - PLAYER_RADIUS;
  const maxZ = position.z + PLAYER_RADIUS;

  return voxels.some((voxel) => {
    const cx = voxel.x - 12;
    const cy = voxel.y + 0.5;
    const cz = voxel.z - 12;

    const voxelMinX = cx - 0.5;
    const voxelMaxX = cx + 0.5;
    const voxelMinY = cy - 0.5;
    const voxelMaxY = cy + 0.5;
    const voxelMinZ = cz - 0.5;
    const voxelMaxZ = cz + 0.5;

    return (
      maxX > voxelMinX &&
      minX < voxelMaxX &&
      maxY > voxelMinY &&
      minY < voxelMaxY &&
      maxZ > voxelMinZ &&
      minZ < voxelMaxZ
    );
  });
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

function PlayerController({
  isFlying,
  isKeyboardInputArmed,
  isWorldPaused,
  voxels,
}: {
  isFlying: boolean;
  isKeyboardInputArmed: boolean;
  isWorldPaused: boolean;
  voxels: Array<{ x: number; y: number; z: number }>;
}) {
  const [, getKeys] = useKeyboardControls<ControlKey>();
  const forwardVec = useRef(new Vector3());
  const rightVec = useRef(new Vector3());
  const moveVec = useRef(new Vector3());

  useFrame(({ camera }, delta) => {
    if (isWorldPaused || !isKeyboardInputArmed) {
      if (!isFlying) {
        camera.position.y = STANDING_EYE_Y;
      }
      return;
    }

    const { forward, backward, left, right, up, down } = getKeys();

    const forwardAxis = (forward ? 1 : 0) - (backward ? 1 : 0);
    const sideAxis = (right ? 1 : 0) - (left ? 1 : 0);
    const verticalAxis = (up ? 1 : 0) - (down ? 1 : 0);

    if (forwardAxis === 0 && sideAxis === 0 && (!isFlying || verticalAxis === 0)) return;

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
      if (!collidesWithVoxel(target, voxels)) {
        camera.position.copy(target);
      } else {
        const slideX = basePosition.clone().add(new Vector3(step.x, 0, 0));
        if (!collidesWithVoxel(slideX, voxels)) {
          camera.position.copy(slideX);
        }

        const slideZ = camera.position.clone().add(new Vector3(0, 0, step.z));
        if (!collidesWithVoxel(slideZ, voxels)) {
          camera.position.copy(slideZ);
        }

        if (isFlying) {
          const slideY = camera.position.clone().add(new Vector3(0, step.y, 0));
          if (!collidesWithVoxel(slideY, voxels)) {
            camera.position.copy(slideY);
          }
        }
      }
    }

    if (!isFlying) {
      camera.position.y = STANDING_EYE_Y;
    }
  });

  return null;
}

function Scene({
  selectedSlot,
  isFlying,
  isKeyboardInputArmed,
  isWorldPaused,
  resourcePack,
  initialPlayerTransform,
}: {
  selectedSlot: HotbarSlot;
  isFlying: boolean;
  isKeyboardInputArmed: boolean;
  isWorldPaused: boolean;
  resourcePack: ResourcePackSpec;
  initialPlayerTransform: PlayerTransformState;
}) {
  const voxels = useAppStore((s) => s.world.voxels);
  const placeVoxel = useAppStore((s) => s.placeVoxel);
  const removeVoxel = useAppStore((s) => s.removeVoxel);
  const setPlayerTransform = useAppStore((s) => s.setPlayerTransform);

  const [previewTarget, setPreviewTarget] = useState<GridTarget | null>(null);

  const { camera, gl, scene } = useThree();
  const raycasterRef = useRef(new Raycaster());
  const mouseNdcRef = useRef(new Vector2(0, 0));
  const currentHitRef = useRef<HitResult | null>(null);
  const lastPersistedTransformRef = useRef<PlayerTransformState>(initialPlayerTransform);
  const lastPersistTsRef = useRef(0);

  const isFreeLookRef = useRef(false);
  const yawPitchRef = useRef({ yaw: 0, pitch: 0 });
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const previewEdgesGeometry = useMemo(() => new EdgesGeometry(new BoxGeometry(1.02, 1.02, 1.02)), []);
  const previewEdgesMaterial = useMemo(
    () => new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthTest: false }),
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
      previewEdgesMaterial.dispose();
    };
  }, [previewEdgesGeometry, previewEdgesMaterial]);

  useEffect(() => {
    if (isWorldPaused) {
      isFreeLookRef.current = false;
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

      if (event.button === 2) {
        isFreeLookRef.current = true;
        lastMouseRef.current = { x: event.clientX, y: event.clientY };

        const euler = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        yawPitchRef.current = { yaw: euler.y, pitch: euler.x };
        return;
      }

      if (event.button !== 0 || !currentHitRef.current) return;

      if (selectedSlot.kind === 'item') {
        const target = placeFromHit(currentHitRef.current);
        if (!target) return;
        placeVoxel(target.x, target.y, target.z, selectedSlot.itemId);
        return;
      }

      if (selectedSlot.kind === 'eraser') {
        if (currentHitRef.current.kind !== 'voxel' || !currentHitRef.current.voxel) return;
        const t = currentHitRef.current.voxel;
        removeVoxel(t.x, t.y, t.z);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
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
  }, [camera, gl, isWorldPaused, persistCurrentPlayerTransform, placeVoxel, removeVoxel, selectedSlot]);

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

  useFrame(({ camera }) => {
    const raycaster = raycasterRef.current;
    raycaster.setFromCamera(mouseNdcRef.current, camera);

    const hits = raycaster.intersectObjects(scene.children, true);
    const hit = hits.find((candidate) => {
      const kind = candidate.object.userData?.kind as 'voxel' | undefined;
      return kind === 'voxel';
    });

    let currentHit: HitResult | null = null;

    if (!hit) {
      currentHitRef.current = null;
    } else {
      const hitKind = hit.object.userData?.kind as 'voxel' | undefined;

      if (hitKind === 'voxel') {
        const voxel = {
          x: hit.object.userData?.x as number,
          y: hit.object.userData?.y as number,
          z: hit.object.userData?.z as number,
        };
        currentHit = {
          kind: 'voxel',
          point: hit.point.clone(),
          faceNormal: hit.face?.normal.clone(),
          voxel,
        };
      }

      currentHitRef.current = currentHit;
    }

    const nextPreview = previewFromHit(currentHit, selectedSlot);
    if (!sameTarget(previewTarget, nextPreview)) {
      setPreviewTarget(nextPreview);
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
            position={[v.x - 12, v.y + 0.5, v.z - 12]}
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

      {previewTarget ? (
        <lineSegments
          geometry={previewEdgesGeometry}
          material={previewEdgesMaterial}
          position={[previewTarget.x - 12, previewTarget.y + 0.5, previewTarget.z - 12]}
          raycast={() => null}
          renderOrder={10}
        />
      ) : null}

      <PlayerController isFlying={isFlying} isKeyboardInputArmed={isKeyboardInputArmed} isWorldPaused={isWorldPaused} voxels={voxels} />
    </>
  );
}

function makeHotbarSlots(
  blockEntries: Array<[string, number]>,
  nameByItemId: Record<string, string>,
): HotbarSlot[] {
  const slots: HotbarSlot[] = [{ kind: 'eraser', label: 'Ластик' }];

  for (let i = 0; i < 8; i += 1) {
    const item = blockEntries[i];
    if (!item) {
      slots.push({ kind: 'empty', label: 'Пусто' });
      continue;
    }
    const itemId = item[0];
    slots.push({
      kind: 'item',
      itemId,
      count: item[1],
      label: nameByItemId[itemId] ?? itemId,
    });
  }

  return slots;
}

function getSlotIconUrl(slot: HotbarSlot, resourcePack: ResourcePackSpec): string | null {
  if (slot.kind !== 'item') return null;
  const spec = resourcePack.world.blocks[slot.itemId] ?? resourcePack.world.defaultBlock;
  if (slot.itemId === 'block_grass_dirt') {
    return spec.faceTextures?.side ?? spec.textureUrl;
  }
  return spec.faceTextures?.top ?? spec.textureUrl;
}

export function BuildScreen() {
  const blocks = useAppStore((s) => s.inventory.blocks);
  const playerTransform = useAppStore((s) => s.world.playerTransform);
  const resourcePack = useResourcePack();
  const itemNameById = useMemo(() => {
    const entries = resourceItemsCatalog.items.map((item) => [item.id, item.name] as const);
    return Object.fromEntries(entries);
  }, []);

  const blockEntries = useMemo(
    () => Object.entries(blocks).filter(([, count]) => count > 0),
    [blocks],
  );
  const hotbarSlots = useMemo(() => makeHotbarSlots(blockEntries, itemNameById), [blockEntries, itemNameById]);

  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(1);
  const [isFlying, setIsFlying] = useState(playerTransform.isFlying);
  const [isWorldPaused, setIsWorldPaused] = useState(false);
  const [isKeyboardInputArmed, setIsKeyboardInputArmed] = useState(true);
  const lastSpacePressRef = useRef(0);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pauseWorld = useCallback(() => {
    setIsWorldPaused(true);
    setIsKeyboardInputArmed(false);
    releaseStuckMovementKeys();
  }, []);
  const resumeWorld = useCallback(() => {
    setIsWorldPaused(false);
    releaseStuckMovementKeys();
  }, []);

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
  }, [pauseWorld, resumeWorld]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (MOVEMENT_KEY_CODES.has(event.code)) {
        setIsKeyboardInputArmed(true);
      }

      if (event.code === 'Space' && !event.repeat) {
        const now = Date.now();
        if (now - lastSpacePressRef.current <= 300) {
          setIsFlying((prev) => !prev);
        }
        lastSpacePressRef.current = now;
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
  }, []);

  const selectedSlot = hotbarSlots[selectedSlotIndex] ?? hotbarSlots[1];

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        ref={stageRef}
        className="build-stage"
        style={{
          height: '64vh',
          minHeight: 360,
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
        onPointerDownCapture={resumeWorld}
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
              resourcePack={resourcePack}
              initialPlayerTransform={playerTransform}
            />
          </Canvas>
        </KeyboardControls>
        <VirtualJoystick />

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
      </div>

      <BuildHUD isFlying={isFlying} packName={resourcePack.displayName} />

      <p style={{ margin: 0 }}>
        ЛКМ: действие выбранного слота. Слот 1: ластик (удаление). Удержание ПКМ: свободный обзор камеры. WASD: движение. Двойной Space: режим полета. В полете: Space вверх, Shift вниз.
      </p>
      {isWorldPaused ? <p style={{ margin: 0 }}>Мир на паузе: кликните по окну мира, чтобы продолжить.</p> : null}
    </div>
  );
}




