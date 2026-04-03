import { db } from '../db';
import type { CurrencyTxn } from '../../domains/economy/model';

export async function addTxn(txn: CurrencyTxn): Promise<void> {
  await db.txns.put(txn);
}
