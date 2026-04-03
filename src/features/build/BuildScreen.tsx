import { useEffect, useMemo, useRef, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  KeyboardControls,
  PointerLockControls,
  useKeyboardControls,
  type KeyboardControlsEntry,
} from '@react-three/drei';
import { Vector3 } from 'three';
import { useAppStore } from '../../app/store';
import { BuildHUD } from './BuildHUD';
import { VirtualJoystick } from './VirtualJoystick';

type MaterialPreset = { color: string; emissive?: string; metalness?: number; roughness?: number };
type ControlKey = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down';
type GridTarget = { x: number; y: number; z: number };

const keyMap: KeyboardControlsEntry<ControlKey>[] = [
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'up', keys: ['Space'] },
  { name: 'down', keys: ['ShiftLeft', 'ShiftRight'] },
];

const blockMaterials: Record<string, MaterialPreset> = {
  block_brick_red: { color: '#9b5f35' },
  res_wood: { color: '#b38b5f' },
  block_glow_blue: { color: '#5ba7ff', emissive: '#2e7cff', metalness: 0.15, roughness: 0.35 },
  block_rainbow: { color: '#f0a1ff', emissive: '#a75dff', metalness: 0.2, roughness: 0.2 },
  block_cat_gold: { color: '#f7c948', emissive: '#c2901e', metalness: 0.45, roughness: 0.25 },
};

function placeFromGround(point: [number, number, number]): GridTarget {
  const x = Math.round(point[0] + 12);
  const z = Math.round(point[2] + 12);
  return { x, y: 0, z };
}

function placeFromFace(x: number, y: number, z: number, e: ThreeEvent<PointerEvent>): GridTarget | null {
  if (!e.face) return null;
  return {
    x: x + Math.round(e.face.normal.x),
    y: y + Math.round(e.face.normal.y),
    z: z + Math.round(e.face.normal.z),
  };
}

function PlayerController({ isFlying }: { isFlying: boolean }) {
  const [, getKeys] = useKeyboardControls<ControlKey>();
  const forwardVec = useRef(new Vector3());
  const rightVec = useRef(new Vector3());
  const moveVec = useRef(new Vector3());

  useFrame(({ camera }, delta) => {
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
      moveVec.current.normalize().multiplyScalar(speed * delta);
      camera.position.add(moveVec.current);
    }

    if (!isFlying) {
      camera.position.y = 1.8;
    }
  });

  return null;
}

function Scene({
  selectedBlockId,
  isFlying,
}: {
  selectedBlockId: string | null;
  isFlying: boolean;
}) {
  const voxels = useAppStore((s) => s.world.voxels);
  const placeVoxel = useAppStore((s) => s.placeVoxel);
  const removeVoxel = useAppStore((s) => s.removeVoxel);
  const [previewTarget, setPreviewTarget] = useState<GridTarget | null>(null);

  function handleGroundPointerMove(e: ThreeEvent<PointerEvent>) {
    const target = placeFromGround([e.point.x, e.point.y, e.point.z]);
    setPreviewTarget(target);
  }

  function handleGroundPointerDown(e: ThreeEvent<PointerEvent>) {
    if (e.button !== 0 || !selectedBlockId) return;
    const target = placeFromGround([e.point.x, e.point.y, e.point.z]);
    setPreviewTarget(target);
    placeVoxel(target.x, target.y, target.z, selectedBlockId);
  }

  function handleVoxelPointerMove(e: ThreeEvent<PointerEvent>, x: number, y: number, z: number) {
    const target = placeFromFace(x, y, z, e);
    if (!target) return;
    setPreviewTarget(target);
  }

  function handleVoxelPointerDown(e: ThreeEvent<PointerEvent>, x: number, y: number, z: number) {
    e.stopPropagation();
    if (e.button === 2) {
      setPreviewTarget({ x, y, z });
      removeVoxel(x, y, z);
      return;
    }
    if (e.button !== 0 || !selectedBlockId) return;

    const target = placeFromFace(x, y, z, e);
    if (!target) return;

    setPreviewTarget(target);
    placeVoxel(target.x, target.y, target.z, selectedBlockId);
  }

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight intensity={1.1} position={[8, 10, 6]} />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.5, 0]}
        receiveShadow
        onPointerMove={handleGroundPointerMove}
        onPointerDown={handleGroundPointerDown}
      >
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#8ccf8a" />
      </mesh>

      {voxels.map((v) => {
        const materialKey = v.blockId ?? 'default';
        const m = blockMaterials[materialKey] ?? { color: '#b2b2b2' };
        return (
          <mesh
            key={`${v.x}:${v.y}:${v.z}`}
            position={[v.x - 12, v.y + 0.5, v.z - 12]}
            onPointerMove={(e) => handleVoxelPointerMove(e, v.x, v.y, v.z)}
            onPointerDown={(e) => handleVoxelPointerDown(e, v.x, v.y, v.z)}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={m.color}
              emissive={m.emissive ?? '#000000'}
              metalness={m.metalness ?? 0.05}
              roughness={m.roughness ?? 0.9}
            />
          </mesh>
        );
      })}

      {selectedBlockId && previewTarget ? (
        <mesh
          position={[previewTarget.x - 12, previewTarget.y + 0.5, previewTarget.z - 12]}
          raycast={() => {}}
          renderOrder={10}
        >
          <boxGeometry args={[1.02, 1.02, 1.02]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.75} depthTest={false} />
        </mesh>
      ) : null}

      <PlayerController isFlying={isFlying} />
      <PointerLockControls />
    </>
  );
}

export function BuildScreen() {
  const blocks = useAppStore((s) => s.inventory.blocks);
  const blockEntries = useMemo(
    () => Object.entries(blocks).filter(([, count]) => count > 0),
    [blocks],
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const lastSpacePressRef = useRef(0);
  const selectedCount = selectedBlockId ? (blocks[selectedBlockId] ?? 0) : 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat) return;
      const now = Date.now();
      if (now - lastSpacePressRef.current <= 300) {
        setIsFlying((prev) => !prev);
      }
      lastSpacePressRef.current = now;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const effectiveSelected =
    selectedBlockId && selectedCount > 0
      ? selectedBlockId
      : (blockEntries[0]?.[0] ?? null);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div
        style={{
          height: '64vh',
          minHeight: 360,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #cfdced',
          position: 'relative',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <KeyboardControls map={keyMap}>
          <Canvas camera={{ position: [0, 1.8, 8], fov: 70 }}>
            <Scene selectedBlockId={effectiveSelected} isFlying={isFlying} />
          </Canvas>
        </KeyboardControls>
        <VirtualJoystick />
        <div className="crosshair" aria-hidden>
          <span />
          <span />
        </div>
      </div>

      <BuildHUD isFlying={isFlying} />

      <div className="card">
        <strong>Блоки для строительства</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {blockEntries.length === 0 ? (
            <span>Нет блоков. Получи их в уроках, магазине или из яиц.</span>
          ) : (
            blockEntries.map(([id, count]) => {
              const selected = id === effectiveSelected;
              return (
                <button
                  key={id}
                  className="btn"
                  style={{
                    background: selected ? '#0060d9' : '#1a84ff',
                    borderColor: selected ? '#004ca9' : '#1a84ff',
                  }}
                  onClick={() => setSelectedBlockId(id)}
                >
                  {id} ({count})
                </button>
              );
            })
          )}
        </div>
      </div>

      <p style={{ margin: 0 }}>
        ЛКМ: поставить блок. ПКМ: удалить блок. WASD: движение. Двойной Space: режим полета. В полете: Space вверх, Shift вниз.
      </p>
    </div>
  );
}
