import { useMemo, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import { useAppStore } from '../../app/store';
import { BuildHUD } from './BuildHUD';
import { VirtualJoystick } from './VirtualJoystick';

type MaterialPreset = { color: string; emissive?: string; metalness?: number; roughness?: number };

const blockMaterials: Record<string, MaterialPreset> = {
  block_brick_red: { color: '#9b5f35' },
  res_wood: { color: '#b38b5f' },
  block_glow_blue: { color: '#5ba7ff', emissive: '#2e7cff', metalness: 0.15, roughness: 0.35 },
  block_rainbow: { color: '#f0a1ff', emissive: '#a75dff', metalness: 0.2, roughness: 0.2 },
  block_cat_gold: { color: '#f7c948', emissive: '#c2901e', metalness: 0.45, roughness: 0.25 },
};

function placeFromGround(point: [number, number, number]) {
  const x = Math.round(point[0] + 12);
  const z = Math.round(point[2] + 12);
  return { x, y: 0, z };
}

function Scene({
  selectedBlockId,
}: {
  selectedBlockId: string | null;
}) {
  const voxels = useAppStore((s) => s.world.voxels);
  const placeVoxel = useAppStore((s) => s.placeVoxel);
  const removeVoxel = useAppStore((s) => s.removeVoxel);

  function handleGroundPointerDown(e: ThreeEvent<PointerEvent>) {
    if (e.button !== 0 || !selectedBlockId) return;
    const { x, y, z } = placeFromGround([e.point.x, e.point.y, e.point.z]);
    placeVoxel(x, y, z, selectedBlockId);
  }

  function handleVoxelPointerDown(e: ThreeEvent<PointerEvent>, x: number, y: number, z: number) {
    e.stopPropagation();
    if (e.button === 2) {
      removeVoxel(x, y, z);
      return;
    }
    if (e.button !== 0 || !selectedBlockId || !e.face) return;

    const nx = x + Math.round(e.face.normal.x);
    const ny = y + Math.round(e.face.normal.y);
    const nz = z + Math.round(e.face.normal.z);
    placeVoxel(nx, ny, nz, selectedBlockId);
  }

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight intensity={1.1} position={[8, 10, 6]} />
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.5, 0]}
        receiveShadow
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
  const selectedCount = selectedBlockId ? (blocks[selectedBlockId] ?? 0) : 0;

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
        <Canvas camera={{ position: [0, 2, 8], fov: 70 }}>
          <Scene selectedBlockId={effectiveSelected} />
        </Canvas>
        <VirtualJoystick />
      </div>

      <BuildHUD />

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
        ЛКМ: поставить блок. ПКМ: удалить блок. Награды из яиц можно сразу использовать в строительстве.
      </p>
    </div>
  );
}
