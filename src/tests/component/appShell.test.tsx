import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../app/App';
import { resetAppStore } from '../testUtils';

vi.mock('../../features/build/BuildScreen', () => ({
  BuildScreen: () => <h2>Мир</h2>,
}));

describe('App shell navigation', () => {
  beforeEach(() => {
    resetAppStore();
  });

  it('navigates between the MVP screens', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Мир' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Учеба' }));
    expect(screen.getByRole('heading', { name: 'Учеба' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Магазин' }));
    expect(screen.getByRole('heading', { name: 'Магазин ресурсов' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Яйца' }));
    expect(screen.getByRole('heading', { name: 'Яйца с призами' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Профиль' }));
    expect(screen.getByText(/Тестер/)).toBeInTheDocument();
  });
});
