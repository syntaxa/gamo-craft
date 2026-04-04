import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useAppStore } from '../../app/store';
import { db } from '../../persistence/db';

export function ProfileScreen() {
  const player = useAppStore((s) => s.player);
  const inventory = useAppStore((s) => s.inventory);

  async function handleResetStorage() {
    const ok = window.confirm(
      'Очистить локальное хранилище игры? Прогресс на этом устройстве будет удален.',
    );
    if (!ok) return;

    await db.delete();
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.location.reload();
  }

  return (
    <Card>
      <h2>Профиль</h2>
      <p>Ник: {player.nickname}</p>
      <p>Уровень математики: {player.learning.mathLevel}</p>
      <p>Решено задач: {player.learning.totalSolved}</p>
      <p>Ресурсы в инвентаре: {Object.keys(inventory.resources).length}</p>
      <Button className="btn-danger" onClick={() => void handleResetStorage()}>
        Сбросить локальное хранилище (debug)
      </Button>
    </Card>
  );
}
