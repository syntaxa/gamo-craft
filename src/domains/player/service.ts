import type { PlayerProfile } from './model';

export function canSpend(profile: PlayerProfile, amount: number): boolean {
  return amount > 0 && profile.currencyCatCoins >= amount;
}
