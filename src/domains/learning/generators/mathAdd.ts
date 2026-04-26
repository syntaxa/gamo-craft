import { makeId } from '../../../shared/lib/id';
import { randomInt } from '../../../shared/lib/rng';
import type { MathTask } from '../model';

export function generateAddTask(level: 'A' | 'B' | 'C'): MathTask {
  const max = level === 'A' ? 10 : 20;
  const a = randomInt(1, max - 1);
  const b = randomInt(1, max - a);
  return {
    id: makeId('task'),
    operation: 'add',
    a,
    b,
    answer: a + b,
    maxValue: 20,
    level,
  };
}
