import type { LessonProgramId, PlayerId, SessionId } from '../../shared/types/common';

export type LessonLevel = 'A' | 'B' | 'C';
export type MathLessonLevel = LessonLevel | 'bronze' | 'silver';
export type MathOperation = 'add' | 'sub' | 'mul' | 'div';

export interface MathTask {
  id: string;
  operation: MathOperation;
  a: number;
  b: number;
  answer: number;
  maxValue: 20 | 40 | 81;
  level: MathLessonLevel;
}

export type OrthographyRuleId =
  | 'zhi_shi'
  | 'cha_sha'
  | 'chu_shu'
  | 'unstressed_vowel_root'
  | 'paired_consonants'
  | 'unpronounceable_consonants'
  | 'hard_soft_sign'
  | 'double_consonants';

export interface OrthographyTask {
  id: string;
  type: 'choice_3';
  ruleId: OrthographyRuleId;
  prompt: string;
  word: string;
  options: [string, string, string];
  correctOptionIndex: 0 | 1 | 2;
  level: LessonLevel;
}

export type OrthographyLevel = LessonLevel | 'legendary';

export interface LetterGapTask {
  id: string;
  type: 'letter_gap';
  ruleId: OrthographyRuleId;
  prompt: string;
  word: string;
  stem: string;
  options: [string, string, string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3 | 4 | 5;
  level: 'legendary';
}

export type LessonTask = MathTask | OrthographyTask | LetterGapTask;

export interface LessonSession {
  id: SessionId;
  playerId: PlayerId;
  programId: LessonProgramId;
  startedAt: string;
  finishedAt?: string;
  tasks: LessonTask[];
  answers: Array<{
    taskId: string;
    value: number | string;
    isCorrect: boolean;
    attempts: number;
  }>;
  reward?: {
    baseCatCoins: number;
    streakBonusCatCoins: number;
    lessonBonusCatCoins: number;
    totalCatCoins: number;
  };
}
