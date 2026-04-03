import type { PlayerId, TxnId } from '../../shared/types/common';

export type TxnType =
  | 'lesson_reward'
  | 'streak_bonus'
  | 'lesson_bonus'
  | 'shop_purchase'
  | 'egg_purchase'
  | 'duplicate_compensation';

export interface CurrencyTxn {
  id: TxnId;
  playerId: PlayerId;
  type: TxnType;
  amount: number;
  balanceAfter: number;
  meta?: Record<string, string | number | boolean>;
  createdAt: string;
}
