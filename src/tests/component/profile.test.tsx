import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileScreen } from '../../features/profile/ProfileScreen';
import { useAppStore } from '../../app/store';
import { resetAppStore } from '../testUtils';
import { serializeAppSave, createAppSave } from '../../persistence/saveFile';

describe('ProfileScreen save/load', () => {
  beforeEach(() => {
    resetAppStore();
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders save and load controls', () => {
    render(<ProfileScreen />);

    expect(screen.getByRole('button', { name: 'Сохранить игру в файл' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Загрузить из файла' })).toBeInTheDocument();
  });

  it('saves the full current app state to a file', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL, revokeObjectURL });

    const user = userEvent.setup();
    resetAppStore({ player: { currencyCatCoins: 777 } });
    render(<ProfileScreen />);

    await user.click(screen.getByRole('button', { name: 'Сохранить игру в файл' }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByText('Игра сохранена в файл.')).toBeInTheDocument();
  });

  it('restores the full app state from a file after confirmation', async () => {
    const user = userEvent.setup();
    resetAppStore();
    render(<ProfileScreen />);

    const imported = createAppSave(
      {
        player: useAppStore.getState().player,
        inventory: useAppStore.getState().inventory,
        world: useAppStore.getState().world,
      },
      '2026-09-12T10:00:00.000Z',
    );

    const file = new File([serializeAppSave(imported)], 'gamo-save.txt', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(window.confirm).toHaveBeenCalled();
    expect(useAppStore.getState().player.currencyCatCoins).toBe(100);
    expect(screen.getByText('Сохранение загружено.')).toBeInTheDocument();
  });

  it('alerts and keeps the current state when the file is invalid', async () => {
    const user = userEvent.setup();
    resetAppStore();
    render(<ProfileScreen />);

    const file = new File(['{broken'], 'bad.txt', { type: 'application/json' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    const alertMock = window.alert as unknown as ReturnType<typeof vi.fn>;
    expect(alertMock).toHaveBeenCalled();
    expect(useAppStore.getState().player.currencyCatCoins).toBe(100);
  });
});