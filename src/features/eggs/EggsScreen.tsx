import { useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useAppStore } from '../../app/store';
import lootTablesCatalog from '../../content/catalogs/lootTables.v1.json';
import posterItemsCatalog from '../../content/catalogs/items.posters.v1.json';
import { EggOpenModal } from './EggOpenModal';
import type { EggReward } from './types';

const posterById = new Map(posterItemsCatalog.items.map((item) => [item.id, item]));

const commonEggRewards: EggReward[] = [
  { id: 'block_glow_blue', label: 'Светящийся синий блок', count: 6, weight: 35, kind: 'block' },
  { id: 'block_rainbow', label: 'Радужный куб', count: 4, weight: 30, kind: 'block' },
  { id: 'block_cat_gold', label: 'Кот-золотой блок', count: 2, weight: 20, kind: 'block' },
  { id: 'block_coin', label: 'Монетный блок', count: 3, weight: 15, kind: 'block' },
];

const memeEggRewards: EggReward[] = posterRewardsFromLootTable('loot_meme_posters');
const sbearEggRewards: EggReward[] = posterRewardsFromLootTable('loot_sbear_posters');

function posterRewardsFromLootTable(tableId: string): EggReward[] {
  return (
    lootTablesCatalog.tables
      .find((table) => table.id === tableId)
      ?.entries.map((entry) => {
        const poster = posterById.get(entry.itemId);
        return {
          id: entry.itemId,
          label: poster?.name ?? entry.itemId,
          count: 1,
          weight: entry.weight,
          kind: 'poster' as const,
          imageUrl: poster?.image,
        };
      }) ?? []
  );
}

function rollReward(pool: EggReward[]): EggReward {
  const total = pool.reduce((acc, item) => acc + item.weight, 0);
  const target = Math.random() * total;
  let cursor = 0;
  for (const item of pool) {
    cursor += item.weight;
    if (target <= cursor) return item;
  }
  return pool[pool.length - 1];
}

interface ActiveEgg {
  pool: EggReward[];
  reward: EggReward;
}

export function EggsScreen() {
  const spend = useAppStore((s) => s.spendCatCoins);
  const addCatCoins = useAppStore((s) => s.addCatCoins);
  const addBlockRewardItem = useAppStore((s) => s.addBlockRewardItem);
  const addPosterItem = useAppStore((s) => s.addPosterItem);
  const [activeEgg, setActiveEgg] = useState<ActiveEgg | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  function grantReward(reward: EggReward): boolean {
    if (reward.kind === 'poster') {
      return addPosterItem(reward.id, reward.count);
    }

    return addBlockRewardItem(reward.id, reward.count);
  }

  function openEgg(priceCatCoins: number, pool: EggReward[]) {
    if (!spend(priceCatCoins)) {
      setErrorMessage('Недостаточно котокоинов');
      setActiveEgg(null);
      return;
    }

    const reward = rollReward(pool);
    if (!reward || !grantReward(reward)) {
      addCatCoins(priceCatCoins);
      setErrorMessage('В инвентаре нет места — награда не выдана, котокоины возвращены');
      setActiveEgg(null);
      return;
    }
    setErrorMessage('');
    setActiveEgg({ pool, reward });
  }

  return (
    <Card>
      <h2>Яйца с призами</h2>
      <p>Обычное яйцо: 20 котокоинов.</p>
      <Button onClick={() => openEgg(20, commonEggRewards)}>Открыть обычное яйцо</Button>
      <p>Котовое яйцо: 200 котокоинов.</p>
      <Button onClick={() => openEgg(200, memeEggRewards)}>Открыть котовое яйцо</Button>
      <p>Яйцо Super bear: 400 котокоинов.</p>
      <Button onClick={() => openEgg(400, sbearEggRewards)}>Открыть яйцо Super bear</Button>

      {errorMessage ? <p style={{ marginTop: 12 }}>{errorMessage}</p> : null}

      {activeEgg ? (
        <EggOpenModal pool={activeEgg.pool} reward={activeEgg.reward} onComplete={() => setActiveEgg(null)} />
      ) : null}
    </Card>
  );
}