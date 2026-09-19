import type { ResourcePackSpec } from '../../theme/resourcePacks';

export type EggRewardKind = 'block' | 'poster';

export interface EggReward {
  id: string;
  label: string;
  count: number;
  weight: number;
  kind: EggRewardKind;
  imageUrl?: string;
}

export function rewardTextureFor(reward: EggReward, resourcePack: ResourcePackSpec): string {
  if (reward.kind === 'poster') return reward.imageUrl ?? '';
  const spec = resourcePack.world.blocks[reward.id] ?? resourcePack.world.defaultBlock;
  return spec.faceTextures?.top ?? spec.faceTextures?.side ?? spec.textureUrl;
}