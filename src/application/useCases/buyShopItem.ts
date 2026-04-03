export interface BuyShopItemInput {
  playerId: string;
  shopItemId: string;
}

export async function buyShopItem(input: BuyShopItemInput): Promise<{ newBalance: number }> {
  void input;
  return { newBalance: 0 };
}
