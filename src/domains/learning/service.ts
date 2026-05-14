import { generateAddTask } from './generators/mathAdd';
import { generateSubTask } from './generators/mathSub';
import { evaluateOrthographyLesson, generateOrthographyLesson } from './generators/orthography';
import type { LessonLevel, MathTask, OrthographyTask } from './model';

export function generateMathLesson(level: LessonLevel, count = 5): MathTask[] {
  return Array.from({ length: count }, (_, i) =>
    i % 2 === 0 ? generateAddTask(level) : generateSubTask(level),
  );
}

export function generateBronzeMathLesson(count = 5): MathTask[] {
  return Array.from({ length: count }, () => generateAddTask('bronze'));
}

export function evaluateLesson(
  tasks: MathTask[],
  answers: Record<string, number>,
): { correct: number; total: number; accuracy: number } {
  const correct = tasks.filter((t) => answers[t.id] === t.answer).length;
  const total = tasks.length;
  const accuracy = total > 0 ? correct / total : 0;
  return { correct, total, accuracy };
}

export function calculateMathLessonReward(
  result: Pick<ReturnType<typeof evaluateLesson>, 'correct' | 'accuracy'>,
  mode: 'basic' | 'bronze',
): number {
  const correctAnswerReward = mode === 'bronze' ? 4 : 2;
  const accuracyBonus = mode === 'bronze' ? 30 : 10;
  return result.correct * correctAnswerReward + (result.accuracy >= 0.8 ? accuracyBonus : 0);
}

export function calculateOrthographyCardReward(baseReward: number, mistakes: number): number {
  if (mistakes >= 3) return 0;
  if (mistakes === 2) return Math.round(baseReward * 0.7);
  if (mistakes === 1) return Math.round(baseReward * 0.9);
  return Math.max(0, Math.round(baseReward));
}

export { generateOrthographyLesson, evaluateOrthographyLesson };
export type { OrthographyTask };
