import type { PlayerId } from '../../shared/types/common';

export interface PlayerProfile {
  id: PlayerId;
  nickname: string;
  createdAt: string;
  updatedAt: string;
  currencyCatCoins: number;
  learning: {
    mathLevel: 'A' | 'B' | 'C';
    totalSolved: number;
    totalCorrect: number;
    currentStreak: number;
    bestStreak: number;
  };
}
