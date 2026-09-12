import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonScreen } from '../../features/lesson/LessonScreen';
import { useAppStore } from '../../app/store';
import { resetAppStore } from '../testUtils';

function solveExpression(expression: string): number {
  const match = expression.match(/(\d+)\s*([+\-×:])\s*(\d+)/);
  if (!match) throw new Error(`Cannot parse expression: ${expression}`);
  const left = Number(match[1]);
  const right = Number(match[3]);
  const op = match[2];
  if (op === '+') return left + right;
  if (op === '-') return left - right;
  if (op === '×') return left * right;
  return left / right;
}

describe('LessonScreen', () => {
  beforeEach(() => {
    resetAppStore();
  });

  it('completes a math mini lesson and grants the reward only once', async () => {
    const user = userEvent.setup();
    render(<LessonScreen />);

    const mathCard = screen.getByText('Математика до 20').closest('article');
    expect(mathCard).not.toBeNull();
    await user.click(within(mathCard as HTMLElement).getByRole('button', { name: 'Войти в урок' }));

    const inputs = screen.getAllByLabelText(/Ответ для примера/);
    const expressions = document.querySelectorAll('.lesson-expr');
    expect(inputs).toHaveLength(5);

    for (let index = 0; index < inputs.length; index += 1) {
      await user.type(inputs[index]!, String(solveExpression(expressions[index]!.textContent ?? '')));
    }

    await user.click(screen.getByRole('button', { name: 'Проверить' }));

    expect(screen.getByText(/Верно: 5\/5/)).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(useAppStore.getState().player.currencyCatCoins).toBe(120);
    expect(screen.queryByRole('button', { name: 'Проверить' })).not.toBeInTheDocument();
  });

  it('starts the bronze math card with addition up to 40 and grants the boosted reward', async () => {
    const user = userEvent.setup();
    render(<LessonScreen />);

    const bronzeCard = screen.getByText('Математика - бронзовый').closest('article');
    expect(bronzeCard).not.toBeNull();
    expect(within(bronzeCard as HTMLElement).getByText('50')).toBeInTheDocument();
    await user.click(within(bronzeCard as HTMLElement).getByRole('button', { name: 'Войти в урок' }));

    expect(screen.getByRole('heading', { name: 'Математика - бронзовый' })).toBeInTheDocument();
    const inputs = screen.getAllByLabelText(/Ответ для примера/);
    const expressions = document.querySelectorAll('.lesson-expr');
    expect(inputs).toHaveLength(5);

    for (let index = 0; index < inputs.length; index += 1) {
      const expression = expressions[index]!.textContent ?? '';
      expect(expression).toContain('+');
      expect(expression).not.toContain('-');
      await user.type(inputs[index]!, String(solveExpression(expression)));
    }

    await user.click(screen.getByRole('button', { name: 'Проверить' }));

    expect(screen.getByText(/Верно: 5\/5/)).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(useAppStore.getState().player.currencyCatCoins).toBe(150);
  });

  it('starts the silver math card with multiplication and division up to 20 and grants the boosted reward', async () => {
    const user = userEvent.setup();
    render(<LessonScreen />);

    const silverCard = screen.getByText('Математика - серебряный').closest('article');
    expect(silverCard).not.toBeNull();
    expect(within(silverCard as HTMLElement).getByText('150')).toBeInTheDocument();
    await user.click(within(silverCard as HTMLElement).getByRole('button', { name: 'Войти в урок' }));

    expect(screen.getByRole('heading', { name: 'Математика - серебряный' })).toBeInTheDocument();
    const inputs = screen.getAllByLabelText(/Ответ для примера/);
    const expressions = document.querySelectorAll('.lesson-expr');
    expect(inputs).toHaveLength(5);

    for (let index = 0; index < inputs.length; index += 1) {
      const expression = expressions[index]!.textContent ?? '';
      expect(expression).toMatch(/[×:]/);
      await user.type(inputs[index]!, String(solveExpression(expression)));
    }

    await user.click(screen.getByRole('button', { name: 'Проверить' }));

    expect(screen.getByText(/Верно: 5\/5/)).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(useAppStore.getState().player.currencyCatCoins).toBe(250);
  });

  it('starts an orthography card with three choice_3 tasks and applies reward penalties', async () => {
    const user = userEvent.setup();
    render(<LessonScreen />);

    const easyCard = screen.getByText('Учим слова - Легко').closest('article');
    expect(easyCard).not.toBeNull();
    await user.click(within(easyCard as HTMLElement).getByRole('button', { name: 'Войти в урок' }));

    const tasks = document.querySelectorAll('.lesson-orth-task');
    expect(tasks).toHaveLength(3);

    for (const task of Array.from(tasks)) {
      const options = within(task as HTMLElement).getAllByRole('button');
      expect(options).toHaveLength(3);
      await user.click(options[0]!);
    }

    await user.click(screen.getByRole('button', { name: 'Проверить' }));

    expect(screen.getByText(/Верно: \d\/3/)).toBeInTheDocument();
    expect(useAppStore.getState().player.currencyCatCoins).toBeGreaterThanOrEqual(100);
    expect(useAppStore.getState().player.currencyCatCoins).toBeLessThanOrEqual(120);
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    expect(screen.queryByText('Результат урока')).not.toBeInTheDocument();
  });

  it('starts the legendary word card with 5 letter_gap tasks and 6 letter options each', async () => {
    const user = userEvent.setup();
    render(<LessonScreen />);

    const legendaryCard = screen.getByText('Учим слова - Легендарно').closest('article');
    expect(legendaryCard).not.toBeNull();
    expect(within(legendaryCard as HTMLElement).getByText('150')).toBeInTheDocument();
    await user.click(within(legendaryCard as HTMLElement).getByRole('button', { name: 'Войти в урок' }));

    expect(screen.getByRole('heading', { name: 'Учим слова - Легендарно' })).toBeInTheDocument();
    const tasks = document.querySelectorAll('.lesson-orth-task');
    expect(tasks).toHaveLength(5);

    for (const task of Array.from(tasks)) {
      const options = within(task as HTMLElement).getAllByRole('button');
      expect(options).toHaveLength(6);
      await user.click(options[0]!);
    }

    await user.click(screen.getByRole('button', { name: 'Проверить' }));

    expect(screen.getByText(/Верно: \d\/5/)).toBeInTheDocument();
    expect(useAppStore.getState().player.currencyCatCoins).toBeGreaterThanOrEqual(100);
    expect(useAppStore.getState().player.currencyCatCoins).toBeLessThanOrEqual(250);
  });
});
