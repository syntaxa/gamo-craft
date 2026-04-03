import { db } from '../db';
import type { LessonSession } from '../../domains/learning/model';

export async function upsertLesson(session: LessonSession): Promise<void> {
  await db.lessons.put(session);
}
