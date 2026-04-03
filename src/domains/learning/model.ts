import type { LessonProgramId, PlayerId, SessionId } from '../../shared/types/common';

export interface MathTask {
  id: string;
  operation: 'add' | 'sub';
  a: number;
  b: number;
  answer: number;
  maxValue: 20;
  level: 'A' | 'B' | 'C';
}

export interface LessonSession {
  id: SessionId;
  playerId: PlayerId;
  programId: LessonProgramId;
  startedAt: string;
  finishedAt?: string;
  tasks: MathTask[];
  answers: Array<{
    taskId: string;
    value: number;
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
