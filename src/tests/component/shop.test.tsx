import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShopScreen } from '../../features/shop/ShopScreen';
import { useAppStore } from '../../app/store';
import { resetAppStore } from '../testUtils';

describe('ShopScreen', () => {
  beforeEach(() => {
    resetAppStore();
  });

  it('buys 10 glass blocks for 50 cat coins', async () => {
    const user = userEvent.setup();
    render(<ShopScreen />);

    expect(screen.getByText('Стекло')).toBeInTheDocument();
    expect(screen.getByText('10 блоков')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /50/ }));

    expect(useAppStore.getState().player.currencyCatCoins).toBe(50);
    expect(useAppStore.getState().inventory.resources.block_glass).toBe(10);
    expect(useAppStore.getState().inventory.blocks.block_glass).toBe(10);
  });

  it('does not mutate inventory when balance is insufficient', async () => {
    const user = userEvent.setup();
    resetAppStore({ player: { currencyCatCoins: 0 } });
    render(<ShopScreen />);

    await user.click(screen.getByRole('button', { name: /30/ }));

    expect(useAppStore.getState().player.currencyCatCoins).toBe(0);
    expect(useAppStore.getState().inventory.resources.block_brick_red).toBe(24);
    expect(useAppStore.getState().inventory.blocks.block_brick_red).toBe(24);
  });
});
