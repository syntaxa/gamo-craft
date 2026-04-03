import { useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useAppStore } from '../../app/store';

type EggReward = {
  id: string;
  label: string;
  count: number;
  weight: number;
};

const commonEggRewards: EggReward[] = [
  { id: 'block_glow_blue', label: 'Светящийся синий блок', count: 6, weight: 45 },
  { id: 'block_rainbow', label: 'Радужный блок', count: 4, weight: 35 },
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
  const [lastReward, setLastReward] = useState<string>('');

  function openCommonEgg() {
    if (!spend(20)) {
      setLastReward('Недостаточно кото-монеток');
      return;
    }
    const reward = rollReward(commonEggRewards);
    addBlockRewardItem(reward.id, reward.count);
    setLastReward(`Награда: ${reward.label} x${reward.count}. Доступно в режиме строительства.`);
  }

  return (
    <Card>
      <h2>Яйца с призами</h2>
      <p>Обычное яйцо: 20 кото-монеток.</p>
      <p>Яйца дают FPV-награды: специальные блоки, которые можно ставить в мире.</p>
      <Button onClick={openCommonEgg}>Открыть обычное яйцо</Button>
      {lastReward ? <p style={{ marginTop: 12 }}>{lastReward}</p> : null}
    </Card>
  );
}
