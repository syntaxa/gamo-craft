import { makeId } from '../../shared/lib/id';
import { nowIso } from '../../shared/lib/time';
import type { CurrencyTxn, TxnType } from './model';
import type { PlayerId } from '../../shared/types/common';

export function makeTxn(input: {
  playerId: PlayerId;
  type: TxnType;
  amount: number;
  balanceAfter: number;
  meta?: Record<string, string | number | boolean>;
}): CurrencyTxn {
  return {
    id: makeId('txn'),
    playerId: input.playerId,
    type: input.type,
    amount: input.amount,
    balanceAfter: input.balanceAfter,
    meta: input.meta,
    createdAt: nowIso(),
  };
}
