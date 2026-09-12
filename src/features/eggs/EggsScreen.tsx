import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useAppStore } from '../../app/store';
import { useResourcePack } from '../../theme/useResourcePack';
import lootTablesCatalog from '../../content/catalogs/lootTables.v1.json';
import posterItemsCatalog from '../../content/catalogs/items.posters.v1.json';

type EggReward = {
  id: string;
  label: string;
  count: number;
  weight: number;
  kind: 'block' | 'poster';
  imageUrl?: string;
};

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

export function EggsScreen() {
  const spend = useAppStore((s) => s.spendCatCoins);
  const addCatCoins = useAppStore((s) => s.addCatCoins);
  const addBlockRewardItem = useAppStore((s) => s.addBlockRewardItem);
  const addPosterItem = useAppStore((s) => s.addPosterItem);
  const resourcePack = useResourcePack();
  const [lastReward, setLastReward] = useState<EggReward | null>(null);
  const [isRewardFading, setIsRewardFading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!lastReward) return;

    const fadeTimerId = window.setTimeout(() => {
      setIsRewardFading(true);
    }, 2000);

    const hideTimerId = window.setTimeout(() => {
      setLastReward(null);
    }, 2800);

    return () => {
      window.clearTimeout(fadeTimerId);
      window.clearTimeout(hideTimerId);
    };
  }, [lastReward]);

  function grantReward(reward: EggReward): boolean {
    if (reward.kind === 'poster') {
      return addPosterItem(reward.id, reward.count);
    }

    return addBlockRewardItem(reward.id, reward.count);
  }

  function openEgg(priceCatCoins: number, pool: EggReward[]) {
    if (!spend(priceCatCoins)) {
      setErrorMessage('Недостаточно котокоинов');
      setIsRewardFading(false);
      setLastReward(null);
      return;
    }

    const reward = rollReward(pool);
    if (!reward || !grantReward(reward)) {
      addCatCoins(priceCatCoins);
      setErrorMessage('В инвентаре нет места — награда не выдана, котокоины возвращены');
      setIsRewardFading(false);
      setLastReward(null);
      return;
    }
    setErrorMessage('');
    setIsRewardFading(false);
    setLastReward(reward);
  }

  const rewardTexture = useMemo(() => {
    if (!lastReward) return '';
    if (lastReward.kind === 'poster') return lastReward.imageUrl ?? '';

    const spec = resourcePack.world.blocks[lastReward.id] ?? resourcePack.world.defaultBlock;
    return spec.faceTextures?.top ?? spec.faceTextures?.side ?? spec.textureUrl;
  }, [lastReward, resourcePack]);

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

      {lastReward ? (
        <div className={`egg-reward ${isRewardFading ? 'egg-reward-fading' : ''}`} style={{ marginTop: 12 }}>
          <article className="shop-lot">
            {lastReward.kind === 'poster' ? (
              <div className="egg-poster-preview" aria-hidden style={{ backgroundImage: `url("${rewardTexture}")` }} />
            ) : (
              <div className="shop-lot-iso" aria-hidden>
                <span className="shop-lot-shadow" />
                <span className="shop-cube-face shop-cube-top" style={{ backgroundImage: `url("${rewardTexture}")` }} />
                <span className="shop-cube-face shop-cube-left" style={{ backgroundImage: `url("${rewardTexture}")` }} />
                <span className="shop-cube-face shop-cube-right" style={{ backgroundImage: `url("${rewardTexture}")` }} />
              </div>
            )}
            <div className="shop-lot-title">{lastReward.label}</div>
            <div className="shop-lot-count">
              {lastReward.count} {lastReward.kind === 'poster' ? 'постер' : 'блоков'}
            </div>
          </article>
          <p style={{ marginTop: 8 }}>Награда получена и доступна в режиме строительства.</p>
        </div>
      ) : null}
    </Card>
  );
}
