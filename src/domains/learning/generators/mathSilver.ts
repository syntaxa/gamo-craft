import { makeId } from '../../../shared/lib/id';
import { randomInt } from '../../../shared/lib/rng';
import type { MathTask } from '../model';

const LOWER = 2;
const UPPER = 9;
const MAX_PRODUCT = 20;

function maxB(a: number): number {
  return Math.min(UPPER, Math.floor(MAX_PRODUCT / a));
}

export function generateMulTask(): MathTask {
  const a = randomInt(LOWER, UPPER);
  const b = randomInt(LOWER, maxB(a));
  return {
    id: makeId('task'),
    operation: 'mul',
    a,
    b,
    answer: a * b,
    maxValue: MAX_PRODUCT,
    level: 'silver',
  };
}

export function generateDivTask(): MathTask {
  const quotient = randomInt(LOWER, UPPER);
  const divisor = randomInt(LOWER, maxB(quotient));
  return {
    id: makeId('task'),
    operation: 'div',
    a: quotient * divisor,
    b: divisor,
    answer: quotient,
    maxValue: MAX_PRODUCT,
    level: 'silver',
  };
}