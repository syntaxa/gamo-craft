import { describe, expect, it } from 'vitest';
import orthographyProgram from '../../content/learning/orthography-1.v1.json';
import {
  buildOrthographyDistractors,
  generateOrthographyLesson,
} from '../../domains/learning/generators/orthography';
import {
  calculateMathLessonReward,
  calculateOrthographyCardReward,
  evaluateLesson,
  evaluateOrthographyLesson,
  generateBronzeMathLesson,
  generateMathLesson,
} from '../../domains/learning/service';

describe('math-1 lesson generation', () => {
  it('generates addition and subtraction tasks within the MVP bounds', () => {
    const tasks = generateMathLesson('C', 20);

    expect(tasks).toHaveLength(20);
    for (const task of tasks) {
      expect(task.a).toBeGreaterThanOrEqual(1);
      expect(task.a).toBeLessThanOrEqual(20);
      expect(task.b).toBeGreaterThanOrEqual(1);
      expect(task.b).toBeLessThanOrEqual(20);
      expect(task.answer).toBe(task.operation === 'add' ? task.a + task.b : task.a - task.b);
      expect(task.answer).toBeGreaterThanOrEqual(0);
      expect(task.answer).toBeLessThanOrEqual(20);
      if (task.operation === 'sub') {
        expect(task.a).toBeGreaterThanOrEqual(task.b);
      }
    }
  });

  it('evaluates answers deterministically', () => {
    const tasks = generateMathLesson('A', 2);
    const result = evaluateLesson(tasks, {
      [tasks[0]!.id]: tasks[0]!.answer,
      [tasks[1]!.id]: tasks[1]!.answer + 1,
    });

    expect(result).toEqual({ correct: 1, total: 2, accuracy: 0.5 });
  });

  it('generates bronze math as addition up to 40 and calculates the boosted reward', () => {
    const tasks = generateBronzeMathLesson(20);

    expect(tasks).toHaveLength(20);
    for (const task of tasks) {
      expect(task.operation).toBe('add');
      expect(task.maxValue).toBe(40);
      expect(task.level).toBe('bronze');
      expect(task.a).toBeGreaterThanOrEqual(1);
      expect(task.b).toBeGreaterThanOrEqual(1);
      expect(task.answer).toBe(task.a + task.b);
      expect(task.answer).toBeLessThanOrEqual(40);
    }

    expect(calculateMathLessonReward({ correct: 5, accuracy: 1 }, 'bronze')).toBe(50);
    expect(calculateMathLessonReward({ correct: 4, accuracy: 0.8 }, 'bronze')).toBe(46);
    expect(calculateMathLessonReward({ correct: 3, accuracy: 0.6 }, 'bronze')).toBe(12);
    expect(calculateMathLessonReward({ correct: 5, accuracy: 1 }, 'basic')).toBe(20);
  });
});

describe('orthography-1 task invariants', () => {
  it('generates seeded choice_3 tasks with one correct option and two valid distractors', () => {
    const tasks = generateOrthographyLesson('A', 3, 42);
    const dictionaryWords = new Set(orthographyProgram.lexicon.map((entry) => entry.correct));

    expect(tasks).toHaveLength(3);
    for (const task of tasks) {
      expect(task.type).toBe('choice_3');
      expect(task.options).toHaveLength(3);
      expect(new Set(task.options).size).toBe(3);
      expect(task.options[task.correctOptionIndex]).toBe(task.word);

      const distractors = task.options.filter((option) => option !== task.word);
      expect(distractors).toHaveLength(2);
      for (const distractor of distractors) {
        expect(dictionaryWords.has(distractor)).toBe(false);
      }
    }
  });

  it('does not emit distractors that are dictionary-correct words', () => {
    const dictionaryWords = new Set(orthographyProgram.lexicon.map((entry) => entry.correct));
    const distractors = buildOrthographyDistractors('жираф', 'zhi_shi');

    expect(distractors.length).toBeGreaterThanOrEqual(1);
    for (const distractor of distractors) {
      expect(distractor).not.toBe('жираф');
      expect(dictionaryWords.has(distractor)).toBe(false);
    }
  });

  it('evaluates choice answers and applies orthography card reward penalties', () => {
    const tasks = generateOrthographyLesson('A', 3, 7);
    const result = evaluateOrthographyLesson(tasks, {
      [tasks[0]!.id]: tasks[0]!.correctOptionIndex,
      [tasks[1]!.id]: tasks[1]!.correctOptionIndex,
      [tasks[2]!.id]: (tasks[2]!.correctOptionIndex + 1) % 3,
    });

    expect(result).toEqual({ correct: 2, total: 3, accuracy: 2 / 3 });
    expect(calculateOrthographyCardReward(20, 0)).toBe(20);
    expect(calculateOrthographyCardReward(20, 1)).toBe(18);
    expect(calculateOrthographyCardReward(20, 2)).toBe(14);
    expect(calculateOrthographyCardReward(20, 3)).toBe(0);
  });
});
