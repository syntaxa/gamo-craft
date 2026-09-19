import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EggsScreen } from '../../features/eggs/EggsScreen';
import {
  EGG_LAND_HIGHLIGHT_MS,
  EGG_REWARD_FADE_MS,
  EGG_REWARD_SHOW_MS,
  EGG_SPIN_DURATION_MS,
} from '../../features/eggs/reel';
import { useAppStore } from '../../app/store';
import { resetAppStore } from '../testUtils';

const EGG_SPIN_MS = EGG_SPIN_DURATION_MS;
const EGG_LANDED_MS = EGG_LAND_HIGHLIGHT_MS;

describe('EggsScreen', () => {
  beforeEach(() => {
    resetAppStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens an egg, spins the prize ribbon, grants the block reward and closes the modal', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const { container } = render(<EggsScreen />);

    fireEvent.click(screen.getByRole('button', { name: 'Открыть обычное яйцо' }));

    expect(useAppStore.getState().player.currencyCatCoins).toBe(80);
    expect(useAppStore.getState().inventory.blocks.block_coin).toBe(3);
    expect(useAppStore.getState().inventory.resources.block_coin).toBeUndefined();
    expect(screen.getByRole('dialog', { name: 'Открытие яйца' })).toBeInTheDocument();
    expect(container.querySelector('.egg-spin-track')).toBeTruthy();

    act(() => vi.advanceTimersByTime(EGG_SPIN_MS));
    expect(container.querySelector('.egg-spin-cell-winner')).toBeTruthy();

    act(() => vi.advanceTimersByTime(EGG_LANDED_MS));
    expect(screen.getByText('Монетный блок')).toBeInTheDocument();
    expect(container.querySelector('.egg-spin-reward')).toBeTruthy();

    act(() => vi.advanceTimersByTime(EGG_REWARD_SHOW_MS));
    expect(container.querySelector('.egg-spin-reward')).toHaveClass('egg-reward-fading');

    act(() => vi.advanceTimersByTime(EGG_REWARD_FADE_MS));
    expect(screen.queryByRole('dialog', { name: 'Открытие яйца' })).not.toBeInTheDocument();
  });

  it('shows an error and keeps balance non-negative when there are not enough cat coins', async () => {
    const user = userEvent.setup();
    resetAppStore({ player: { currencyCatCoins: 0 } });
    render(<EggsScreen />);

    await user.click(screen.getByRole('button', { name: 'Открыть обычное яйцо' }));

    expect(screen.getByText('Недостаточно котокоинов')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Открытие яйца' })).not.toBeInTheDocument();
    expect(useAppStore.getState().player.currencyCatCoins).toBe(0);
  });

  it('opens a cat egg and grants a poster item into inventory slots', async () => {
    const user = userEvent.setup();
    resetAppStore({ player: { currencyCatCoins: 220 } });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<EggsScreen />);

    await user.click(screen.getByRole('button', { name: 'Открыть котовое яйцо' }));

    expect(useAppStore.getState().player.currencyCatCoins).toBe(20);
    expect(useAppStore.getState().inventory.posters.poster_meme_cat_1).toBe(1);
    expect(useAppStore.getState().inventory.slots).toContainEqual(
      expect.objectContaining({
        itemKind: 'poster',
        itemId: 'poster_meme_cat_1',
        count: 1,
      }),
    );
    expect(screen.getByRole('dialog', { name: 'Открытие яйца' })).toBeInTheDocument();
    expect(screen.getAllByText('Мемный кот 1').length).toBeGreaterThan(0);
  });

  it('opens a Super bear egg and grants a sbearadventure poster item into inventory slots', async () => {
    const user = userEvent.setup();
    resetAppStore({ player: { currencyCatCoins: 420 } });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<EggsScreen />);

    await user.click(screen.getByRole('button', { name: 'Открыть яйцо Super bear' }));

    expect(useAppStore.getState().player.currencyCatCoins).toBe(20);
    expect(useAppStore.getState().inventory.posters.poster_meme_cat_21).toBe(1);
    expect(screen.getByRole('dialog', { name: 'Открытие яйца' })).toBeInTheDocument();
    expect(screen.getAllByText('Super bear adventure 21').length).toBeGreaterThan(0);
  });

  it('refunds coins and shows an error when the Super bear egg reward cannot fit in the inventory', async () => {
    const user = userEvent.setup();
    const fullSlots = [
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `slot-hotbar-${i + 1}`,
        area: 'hotbar',
        index: i + 1,
        itemKind: 'block',
        itemId: 'block_brick_red',
        count: 64,
      })),
      ...Array.from({ length: 27 }, (_, i) => ({
        id: `slot-main-${i}`,
        area: 'main',
        index: i,
        itemKind: 'block',
        itemId: 'block_brick_red',
        count: 64,
      })),
    ] as never;
    resetAppStore({ player: { currencyCatCoins: 420 }, inventory: { slots: fullSlots } });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    render(<EggsScreen />);

    await user.click(screen.getByRole('button', { name: 'Открыть яйцо Super bear' }));

    expect(useAppStore.getState().player.currencyCatCoins).toBe(420);
    expect(useAppStore.getState().inventory.posters.poster_meme_cat_21).toBe(0);
    expect(useAppStore.getState().inventory.slots.filter((slot) => slot.itemKind === 'poster')).toHaveLength(0);
    expect(screen.getByText('В инвентаре нет места — награда не выдана, котокоины возвращены')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Открытие яйца' })).not.toBeInTheDocument();
  });

  it('still plays the spin animation when the OS prefers reduced motion', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const hadMatchMedia = typeof window.matchMedia === 'function';
    const originalMatchMedia = hadMatchMedia ? window.matchMedia : undefined;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () =>
        ({
          matches: true,
          media: '(prefers-reduced-motion: reduce)',
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    });

    try {
      const { container } = render(<EggsScreen />);
      fireEvent.click(screen.getByRole('button', { name: 'Открыть обычное яйцо' }));

      expect(screen.getByRole('dialog', { name: 'Открытие яйца' })).toBeInTheDocument();
      expect(container.querySelector('.egg-spin-track')).toBeTruthy();
      expect(container.querySelector('.egg-spin-reward')).toBeNull();

      act(() => vi.advanceTimersByTime(EGG_SPIN_MS));
      expect(container.querySelector('.egg-spin-cell-winner')).toBeTruthy();

      act(() => vi.advanceTimersByTime(EGG_LANDED_MS));
      expect(container.querySelector('.egg-spin-reward')).toBeTruthy();

      act(() => vi.advanceTimersByTime(EGG_REWARD_SHOW_MS));
      act(() => vi.advanceTimersByTime(EGG_REWARD_FADE_MS));
      expect(screen.queryByRole('dialog', { name: 'Открытие яйца' })).not.toBeInTheDocument();
    } finally {
      if (hadMatchMedia) {
        Object.defineProperty(window, 'matchMedia', {
          configurable: true,
          writable: true,
          value: originalMatchMedia,
        });
      } else {
        delete (window as { matchMedia?: unknown }).matchMedia;
      }
    }
  });
});