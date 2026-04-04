import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useAppStore } from '../../app/store';
import { useResourcePack } from '../../theme/useResourcePack';

type EggReward = {
  id: string;
  label: string;
  count: number;
  weight: number;
};

const commonEggRewards: EggReward[] = [
  { id: 'block_glow_blue', label: 'Светящийся синий блок', count: 6, weight: 45 },
  { id: 'block_rainbow', label: 'Радужный куб', count: 4, weight: 35 },
  { id: 'block_cat_gold', label: 'Кот-золотой блок', count: 2, weight: 20 },
];

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
  const addBlockRewardItem = useAppStore((s) => s.addBlockRewardItem);
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

  function openCommonEgg() {
    if (!spend(20)) {
      setErrorMessage('Недостаточно котокоинов');
      setIsRewardFading(false);
      setLastReward(null);
      return;
    }

    const reward = rollReward(commonEggRewards);
    addBlockRewardItem(reward.id, reward.count);
    setErrorMessage('');
    setIsRewardFading(false);
    setLastReward(reward);
  }

  const rewardTexture = useMemo(() => {
    if (!lastReward) return '';
    const spec = resourcePack.world.blocks[lastReward.id] ?? resourcePack.world.defaultBlock;
    return spec.faceTextures?.top ?? spec.faceTextures?.side ?? spec.textureUrl;
  }, [lastReward, resourcePack]);

  return (
    <Card>
      <h2>Яйца с призами</h2>
      <p>Обычное яйцо: 20 котокоинов.</p>
      <Button onClick={openCommonEgg}>Открыть обычное яйцо</Button>

      {errorMessage ? <p style={{ marginTop: 12 }}>{errorMessage}</p> : null}

      {lastReward ? (
        <div className={`egg-reward ${isRewardFading ? 'egg-reward-fading' : ''}`} style={{ marginTop: 12 }}>
          <article className="shop-lot">
            <div className="shop-lot-iso" aria-hidden>
              <span className="shop-lot-shadow" />
              <span className="shop-cube-face shop-cube-top" style={{ backgroundImage: `url("${rewardTexture}")` }} />
              <span className="shop-cube-face shop-cube-left" style={{ backgroundImage: `url("${rewardTexture}")` }} />
              <span className="shop-cube-face shop-cube-right" style={{ backgroundImage: `url("${rewardTexture}")` }} />
            </div>
            <div className="shop-lot-title">{lastReward.label}</div>
            <div className="shop-lot-count">{lastReward.count} блоков</div>
          </article>
          <p style={{ marginTop: 8 }}>Награда получена и доступна в режиме строительства.</p>
        </div>
      ) : null}
    </Card>
  );
}
