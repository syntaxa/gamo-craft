import { makeId } from '../../../shared/lib/id';
import { randomInt } from '../../../shared/lib/rng';
import type { MathLessonLevel, MathTask } from '../model';

export function generateAddTask(level: MathLessonLevel): MathTask {
  const max = level === 'A' ? 10 : level === 'bronze' ? 40 : 20;
  const a = randomInt(1, max - 1);
  const b = randomInt(1, max - a);
  return {
    id: makeId('task'),
    operation: 'add',
    a,
    b,
    answer: a + b,
    maxValue: level === 'bronze' ? 40 : 20,
    level,
  };
}
