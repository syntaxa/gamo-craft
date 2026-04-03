import { Card } from '../../shared/ui/Card';
import { useAppStore } from '../../app/store';

export function ProfileScreen() {
  const player = useAppStore((s) => s.player);
  const inventory = useAppStore((s) => s.inventory);

  return (
    <Card>
      <h2>Профиль</h2>
      <p>Ник: {player.nickname}</p>
      <p>Уровень математики: {player.learning.mathLevel}</p>
      <p>Решено задач: {player.learning.totalSolved}</p>
      <p>Ресурсы в инвентаре: {Object.keys(inventory.resources).length}</p>
    </Card>
  );
}
