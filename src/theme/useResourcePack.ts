import { useMemo } from 'react';
import { useAppStore } from '../app/store';
import { resolveResourcePack } from './resourcePacks';

export function useResourcePack() {
  const activeResourcePackId = useAppStore((s) => s.activeResourcePackId);
  return useMemo(() => resolveResourcePack(activeResourcePackId), [activeResourcePackId]);
}

