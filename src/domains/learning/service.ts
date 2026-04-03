import { generateAddTask } from './generators/mathAdd';
import { generateSubTask } from './generators/mathSub';
import type { MathTask } from './model';

export function generateMathLesson(level: 'A' | 'B' | 'C', count = 5): MathTask[] {
  return Array.from({ length: count }, (_, i) =>
    i % 2 === 0 ? generateAddTask(level) : generateSubTask(level),
  );
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
