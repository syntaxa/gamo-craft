import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EggsScreen } from '../../features/eggs/EggsScreen';
import { useAppStore } from '../../app/store';
import { resetAppStore } from '../testUtils';

describe('EggsScreen', () => {
  beforeEach(() => {
    resetAppStore();
  });

  it('opens an egg, grants a build block reward, then fades the reward card out', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const { container } = render(<EggsScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Открыть обычное яйцо' }));

    expect(useAppStore.getState().player.currencyCatCoins).toBe(80);
    expect(useAppStore.getState().inventory.blocks.block_coin).toBe(3);
    expect(useAppStore.getState().inventory.resources.block_coin).toBeUndefined();
    expect(screen.getByText('Монетный блок')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));
    expect(container.querySelector('.egg-reward')).toHaveClass('egg-reward-fading');

    act(() => vi.advanceTimersByTime(800));
    expect(screen.queryByText('Монетный блок')).not.toBeInTheDocument();
  });

  it('shows an error and keeps balance non-negative when there are not enough cat coins', async () => {
    const user = userEvent.setup();
    resetAppStore({ player: { currencyCatCoins: 0 } });
    render(<EggsScreen />);

    await user.click(screen.getByRole('button', { name: 'Открыть обычное яйцо' }));

    expect(screen.getByText('Недостаточно котокоинов')).toBeInTheDocument();
    expect(useAppStore.getState().player.currencyCatCoins).toBe(0);
  });
});
