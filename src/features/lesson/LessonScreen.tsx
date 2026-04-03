import { useMemo, useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { generateMathLesson, evaluateLesson } from '../../domains/learning/service';
import { useAppStore } from '../../app/store';

export function LessonScreen() {
  const [running, setRunning] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState<{ correct: number; total: number; accuracy: number } | null>(null);
  const addCatCoins = useAppStore((s) => s.addCatCoins);
  const level = useAppStore((s) => s.player.learning.mathLevel);

  const tasks = useMemo(() => generateMathLesson(level, 5), [level]);

  function finish() {
    const result = evaluateLesson(tasks, answers);
    const reward = result.correct * 2 + (result.accuracy >= 0.8 ? 10 : 0);
    addCatCoins(reward);
    setDone(result);
  }

  return (
    <div className="layout-grid">
      <Card>
        <h2>Математика до 20</h2>
        <p>Сложение и вычитание. За правильные ответы даются кото-монетки.</p>
        {!running ? (
          <Button
            onClick={() => {
              setRunning(true);
              setDone(null);
              setAnswers({});
            }}
          >
            Начать мини-урок
          </Button>
        ) : (
          <>
            {tasks.map((t, idx) => (
              <label key={t.id} style={{ display: 'block', marginBottom: 8 }}>
                <span>
                  {idx + 1}. {t.a} {t.operation === 'add' ? '+' : '-'} {t.b} ={' '}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  onChange={(e) => setAnswers((a) => ({ ...a, [t.id]: Number(e.target.value) }))}
                />
              </label>
            ))}
            <Button onClick={finish}>Проверить</Button>
          </>
        )}
      </Card>

      <Card>
        <h3>Результат</h3>
        {done ? (
          <p>
            Верно: {done.correct}/{done.total} ({Math.round(done.accuracy * 100)}%)
          </p>
        ) : (
          <p>Реши задачи и получи награду.</p>
        )}
      </Card>
    </div>
  );
}
