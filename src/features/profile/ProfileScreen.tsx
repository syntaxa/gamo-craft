import { useRef, useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useAppStore } from '../../app/store';
import { db } from '../../persistence/db';
import {
  createAppSave,
  downloadAppSaveFile,
  readAppSaveFile,
} from '../../persistence/saveFile';
import { writeLocalAppSnapshot } from '../../persistence/localSnapshot';

export function ProfileScreen() {
  const player = useAppStore((s) => s.player);
  const inventory = useAppStore((s) => s.inventory);
  const restoreSave = useAppStore((s) => s.restoreSave);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSaveToFile() {
    const state = useAppStore.getState();
    const save = createAppSave({
      player: state.player,
      inventory: state.inventory,
      world: state.world,
    });
    downloadAppSaveFile(save);
    writeLocalAppSnapshot({
      player: state.player,
      inventory: state.inventory,
      world: state.world,
    });
    setMessage('Игра сохранена в файл.');
  }

  function handleLoadButton() {
    fileInputRef.current?.click();
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const save = await readAppSaveFile(file);
    if (!save) {
      window.alert('Не удалось прочитать файл сохранения.');
      return;
    }

    const savedLabel = new Date(save.savedAt).toLocaleString('ru-RU');
    const ok = window.confirm(
      `Загрузить сохранение от ${savedLabel}? Текущий прогресс будет заменен.`,
    );
    if (!ok) return;

    restoreSave(save);
    writeLocalAppSnapshot({
      player: save.player,
      inventory: save.inventory,
      world: save.world,
    });
    setMessage('Сохранение загружено.');
  }

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

      <Button onClick={handleSaveToFile}>Сохранить игру в файл</Button>
      <Button onClick={handleLoadButton}>Загрузить из файла</Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.txt,application/json"
        onChange={(e) => void handleFileSelect(e)}
        style={{ display: 'none' }}
      />

      {message && <p>{message}</p>}

      <Button className="btn-danger" onClick={() => void handleResetStorage()}>
        Сбросить локальное хранилище (debug)
      </Button>
    </Card>
  );
}