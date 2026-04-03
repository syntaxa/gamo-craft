import type { CompleteLessonResult } from './types';

export interface CompleteLessonInput {
  sessionId: string;
  answers: Array<{ taskId: string; value: number }>;
}

export async function completeLesson(input: CompleteLessonInput): Promise<CompleteLessonResult> {
  void input;
  return {
    correct: 0,
    total: 0,
    accuracy: 0,
    rewardCatCoins: 0,
    newBalance: 0,
  };
}
