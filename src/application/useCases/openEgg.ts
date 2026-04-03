export interface OpenEggInput {
  playerId: string;
  eggTypeId: 'egg_common' | 'egg_rare' | 'egg_epic';
}

export interface OpenEggResult {
  rewardItemId: string;
  rewardWasDuplicate: boolean;
  duplicateCompensationCatCoins: number;
  newBalance: number;
}

export async function openEgg(input: OpenEggInput): Promise<OpenEggResult> {
  void input;
  return {
    rewardItemId: 'sticker_cat_star',
    rewardWasDuplicate: false,
    duplicateCompensationCatCoins: 0,
    newBalance: 0,
  };
}
