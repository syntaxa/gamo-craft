import { Fragment, useRef, useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import {
  calculateOrthographyCardReward,
  evaluateLesson,
  evaluateOrthographyLesson,
  generateMathLesson,
  generateOrthographyLesson,
} from '../../domains/learning/service';
import { useAppStore } from '../../app/store';
import type { LessonLevel } from '../../domains/learning/model';

type DoneState = {
  correct: number;
  total: number;
  accuracy: number;
  reward: number;
  items: Array<{
    id: string;
    label: string;
    isCorrect: boolean;
  }>;
} | null;

type RunState =
  | { type: 'math' }
  | {
      type: 'orthography';
      title: string;
      level: LessonLevel;
      baseReward: number;
    }
  | null;

const WORD_CARDS: Array<{ title: string; level: LessonLevel; baseReward: number }> = [
  { title: 'Учим слова - Легко', level: 'A', baseReward: 20 },
  { title: 'Учим слова - Средне', level: 'B', baseReward: 40 },
  { title: 'Учим слова - Сложно', level: 'C', baseReward: 80 },
];

const MATH_CARD = {
  title: 'Математика до 20',
  description: 'сложение и вычитание',
  reward: 20,
};

function buildOrthographyLesson(level: LessonLevel): ReturnType<typeof generateOrthographyLesson> {
  const merged: ReturnType<typeof generateOrthographyLesson> = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < 8 && merged.length < 3; attempt += 1) {
    const chunk = generateOrthographyLesson(level, 3);
    for (const task of chunk) {
      const signature = `${task.ruleId}|${task.options.join('|')}`;
      if (seen.has(signature)) continue;
      seen.add(signature);
      merged.push(task);
      if (merged.length === 3) break;
    }
  }

  return merged.slice(0, 3);
}

export function LessonScreen() {
  const [running, setRunning] = useState<RunState>(null);
  const [tasks, setTasks] = useState(() => [] as ReturnType<typeof generateMathLesson>);
  const [orthTasks, setOrthTasks] = useState(() => [] as ReturnType<typeof generateOrthographyLesson>);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [orthAnswers, setOrthAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState<DoneState>(null);
  const rewardClaimedRef = useRef(false);
  const addCatCoins = useAppStore((s) => s.addCatCoins);
  const level = useAppStore((s) => s.player.learning.mathLevel);

  function finishMath() {
    if (rewardClaimedRef.current) return;
    rewardClaimedRef.current = true;

    const result = evaluateLesson(tasks, answers);
    const reward = result.correct * 2 + (result.accuracy >= 0.8 ? 10 : 0);
    const items = tasks.map((task) => {
      const answer = answers[task.id];
      const isCorrect = answer === task.answer;
      const userAnswer = Number.isFinite(answer) ? String(answer) : '—';
      return {
        id: task.id,
        label: `${task.a} ${task.operation === 'add' ? '+' : '-'} ${task.b} = ${userAnswer}`,
        isCorrect,
      };
    });
    addCatCoins(reward);
    setDone({ ...result, reward, items });
    setRunning(null);
  }

  function finishOrthography(baseReward: number) {
    if (rewardClaimedRef.current) return;
    rewardClaimedRef.current = true;

    const result = evaluateOrthographyLesson(orthTasks, orthAnswers);
    const mistakes = result.total - result.correct;
    const reward = calculateOrthographyCardReward(baseReward, mistakes);
    const items = orthTasks.map((task) => {
      const selectedIndex = orthAnswers[task.id];
      const selectedValue =
        typeof selectedIndex === 'number' && task.options[selectedIndex]
          ? task.options[selectedIndex]
          : '—';
      const isCorrect = selectedIndex === task.correctOptionIndex;
      return {
        id: task.id,
        label: selectedValue,
        isCorrect,
      };
    });
    addCatCoins(reward);
    setDone({ ...result, reward, items });
    setRunning(null);
  }

  function startMathLesson() {
    rewardClaimedRef.current = false;
    setTasks(generateMathLesson(level, 5));
    setRunning({ type: 'math' });
    setDone(null);
    setAnswers({});
    setOrthTasks([]);
    setOrthAnswers({});
  }

  function startOrthographyLesson(card: { title: string; level: LessonLevel; baseReward: number }) {
    rewardClaimedRef.current = false;
    setOrthTasks(buildOrthographyLesson(card.level));
    setRunning({
      type: 'orthography',
      title: card.title,
      level: card.level,
      baseReward: card.baseReward,
    });
    setDone(null);
    setAnswers({});
    setOrthAnswers({});
    setTasks([]);
  }

  return (
    <Card>
      <section className="lesson-screen">
        {running === null ? (
          <header className="lesson-head">
            <h2>Учеба</h2>

          </header>
        ) : running.type === 'math' ? (
          <header className="lesson-head">
            <h2>Математика до 20</h2>
            <p>Сложение и вычитание. За правильные ответы даются котокоины.</p>
          </header>
        ) : (
          <header className="lesson-head">
            <h2>{running.title}</h2>
            <p>3 задания по орфографии. Награда зависит от количества ошибок.</p>
          </header>
        )}

        {running === null && done ? (
          <div className="lesson-result-card" role="status">
            <h3>Результат урока</h3>
            <p>
              Верно: {done.correct}/{done.total} ({Math.round(done.accuracy * 100)}%)
            </p>
            <div className="lesson-result-list">
              {done.items.map((item) => (
                <div
                  key={item.id}
                  className={`lesson-result-item ${item.isCorrect ? 'is-correct' : 'is-wrong'}`}
                >
                  <span className="lesson-result-mark" aria-hidden>
                    {item.isCorrect ? '✅' : '❌'}
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="lesson-result-footer">
              <div className="lesson-card-reward">
                <span className="coin lesson-card-coin" aria-hidden>
                  CAT
                </span>
                <span>{done.reward}</span>
              </div>
              <Button className="lesson-cta" onClick={() => setDone(null)}>
                Закрыть
              </Button>
            </div>
          </div>
        ) : null}

        {running === null && !done ? (
          <div className="lesson-catalog">
            <article className="lesson-program-card">
              <h3>{MATH_CARD.title}</h3>
              <p className="lesson-card-description">{MATH_CARD.description}</p>
              <div className="lesson-card-footer">
                <Button className="lesson-cta" onClick={startMathLesson}>
                  Войти в урок
                </Button>
                <div className="lesson-card-reward">
                  <span className="coin lesson-card-coin" aria-hidden>
                    CAT
                  </span>
                  <span>{MATH_CARD.reward}</span>
                </div>
              </div>
            </article>

            {WORD_CARDS.map((card) => (
              <article className="lesson-program-card" key={card.title}>
                <h3>{card.title}</h3>
                <p className="lesson-card-description">3 слова, выбери правильное</p>
                <div className="lesson-card-footer">
                  <Button className="lesson-cta" onClick={() => startOrthographyLesson(card)}>
                    Войти в урок
                  </Button>
                  <div className="lesson-card-reward">
                    <span className="coin lesson-card-coin" aria-hidden>
                      CAT
                    </span>
                    <span>{card.baseReward}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : running !== null && running.type === 'math' ? (
          <div className="lesson-body">
            <div className="lesson-left">
              <div className="lesson-task-grid">
                {tasks.map((t, idx) => (
                  <Fragment key={t.id}>
                    <span className="lesson-expr">
                      {t.a} {t.operation === 'add' ? '+' : '-'} {t.b}
                    </span>
                    <label className="lesson-answer-cell">
                      <span className="lesson-equals">=</span>
                      <input
                        className={`lesson-answer lesson-answer-${idx % 3}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        aria-label={`Ответ для примера ${idx + 1}`}
                        onChange={(e) => {
                          const normalized = e.target.value.replace(/[^\d]/g, '');
                          if (normalized !== e.target.value) e.target.value = normalized;
                          setAnswers((a) => ({ ...a, [t.id]: normalized ? Number(normalized) : Number.NaN }));
                        }}
                      />
                    </label>
                  </Fragment>
                ))}
              </div>
              <Button className="lesson-cta" onClick={finishMath}>
                Проверить
              </Button>
            </div>

            <aside className="lesson-illustration" aria-hidden>
              <div className="lesson-spark lesson-spark-one">+</div>
              <div className="lesson-spark lesson-spark-two">=</div>
              <div className="lesson-spark lesson-spark-three">:</div>
              <div className="lesson-cat">🐱</div>
              <div className="lesson-coin-stack">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </aside>
          </div>
        ) : running !== null && running.type === 'orthography' ? (
          <div className="lesson-body">
            <div className="lesson-left">
              <div className="lesson-orth-list">
                {orthTasks.map((task, taskIndex) => (
                  <section className="lesson-orth-task" key={task.id}>
                    <p className="lesson-orth-title">{taskIndex + 1}. Выбери правильное написание</p>
                    <div className="lesson-orth-options">
                      {task.options.map((option, optionIndex) => {
                        const isSelected = orthAnswers[task.id] === optionIndex;
                        return (
                          <button
                            key={`${task.id}-${option}`}
                            className={`lesson-orth-option${isSelected ? ' is-selected' : ''}`}
                            type="button"
                            onClick={() => setOrthAnswers((prev) => ({ ...prev, [task.id]: optionIndex }))}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
              <Button className="lesson-cta" onClick={() => finishOrthography(running.baseReward)}>
                Проверить
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </Card>
  );
}
