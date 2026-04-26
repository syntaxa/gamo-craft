import { makeId } from '../../../shared/lib/id';
import type { LessonLevel, OrthographyRuleId, OrthographyTask } from '../model';
import orthographyProgram from '../../../content/learning/orthography-1.v1.json';

type LexiconEntry = {
  id: string;
  lemma: string;
  correct: string;
  ruleTags: OrthographyRuleId[];
  difficulty: LessonLevel;
  flags?: {
    dictionaryWord?: boolean;
  };
};

type ProgramShape = {
  lesson: {
    minTasks: number;
    maxTasks: number;
    antiRepeatWindow: number;
    levelRuleWeights: Record<LessonLevel, Partial<Record<OrthographyRuleId, number>>>;
  };
  lexicon: LexiconEntry[];
};

const program = orthographyProgram as ProgramShape;

const LETTERS = {
  soft: '\u044c',
  hard: '\u044a',
};

const VOWELS = '\u0430\u0435\u0451\u0438\u043e\u0443\u044b\u044d\u044e\u044f';
const CONSONANTS = '\u0431\u0432\u0433\u0434\u0436\u0437\u0439\u043a\u043b\u043c\u043d\u043f\u0440\u0441\u0442\u0444\u0445\u0446\u0447\u0448\u0449';
const IOTATED_VOWELS = '\u0435\u0451\u044e\u044f\u0438';

const ALLOWED_RULE_CHAIN: Record<OrthographyRuleId, OrthographyRuleId[]> = {
  zhi_shi: ['zhi_shi', 'unstressed_vowel_root'],
  cha_sha: ['cha_sha', 'unstressed_vowel_root'],
  chu_shu: ['chu_shu', 'unstressed_vowel_root'],
  unstressed_vowel_root: ['unstressed_vowel_root'],
  paired_consonants: ['paired_consonants'],
  unpronounceable_consonants: ['unpronounceable_consonants'],
  hard_soft_sign: ['hard_soft_sign'],
  double_consonants: ['double_consonants', 'unstressed_vowel_root'],
};

const PAIRED_MAP: Record<string, string> = {
  '\u0431': '\u043f',
  '\u043f': '\u0431',
  '\u0432': '\u0444',
  '\u0444': '\u0432',
  '\u0433': '\u043a',
  '\u043a': '\u0433',
  '\u0434': '\u0442',
  '\u0442': '\u0434',
  '\u0436': '\u0448',
  '\u0448': '\u0436',
  '\u0437': '\u0441',
  '\u0441': '\u0437',
};

const UNSTRESSED_PAIRS: Array<[string, string]> = [
  ['\u043e', '\u0430'],
  ['\u0430', '\u043e'],
  ['\u0435', '\u0438'],
  ['\u0438', '\u0435'],
  ['\u044f', '\u0435'],
  ['\u0435', '\u044f'],
];

function normalize(word: string): string {
  return word.trim().toLowerCase();
}

function levelRank(level: LessonLevel): number {
  if (level === 'A') return 0;
  if (level === 'B') return 1;
  return 2;
}

function createSeededRng(seed?: number): () => number {
  if (typeof seed !== 'number' || Number.isNaN(seed)) {
    return () => Math.random();
  }
  let state = (seed >>> 0) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

function pickOne<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)]!;
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.filter((item) => item.length > 0)));
}

function replaceAt(source: string, index: number, replacement: string): string {
  return source.slice(0, index) + replacement + source.slice(index + 1);
}

function replaceChunk(source: string, from: string, to: string): string[] {
  const variants: string[] = [];
  let cursor = source.indexOf(from);
  while (cursor !== -1) {
    variants.push(source.slice(0, cursor) + to + source.slice(cursor + from.length));
    cursor = source.indexOf(from, cursor + 1);
  }
  return variants;
}

function mutateZhiShi(word: string): string[] {
  return dedupe([
    ...replaceChunk(word, '\u0436\u0438', '\u0436\u044b'),
    ...replaceChunk(word, '\u0448\u0438', '\u0448\u044b'),
  ]);
}

function mutateChaSha(word: string): string[] {
  return dedupe([
    ...replaceChunk(word, '\u0447\u0430', '\u0449\u0430'),
    ...replaceChunk(word, '\u0449\u0430', '\u0447\u0430'),
    ...replaceChunk(word, '\u0447\u0430', '\u0447\u044f'),
    ...replaceChunk(word, '\u0449\u0430', '\u0449\u044f'),
  ]);
}

function mutateChuShu(word: string): string[] {
  return dedupe([
    ...replaceChunk(word, '\u0447\u0443', '\u0449\u0443'),
    ...replaceChunk(word, '\u0449\u0443', '\u0447\u0443'),
    ...replaceChunk(word, '\u0449\u0443', '\u0449\u044e'),
    ...replaceChunk(word, '\u0447\u0443', '\u0447\u044e'),
  ]);
}

function mutateUnstressed(word: string): string[] {
  const variants: string[] = [];
  for (let i = 1; i < word.length; i += 1) {
    const current = word[i]!;
    for (const [from, to] of UNSTRESSED_PAIRS) {
      if (current === from) {
        variants.push(replaceAt(word, i, to));
      }
    }
  }
  return dedupe(variants);
}

function mutatePairedConsonants(word: string): string[] {
  const variants: string[] = [];
  for (let i = 0; i < word.length; i += 1) {
    const current = word[i]!;
    const mapped = PAIRED_MAP[current];
    if (!mapped) continue;
    variants.push(replaceAt(word, i, mapped));
  }
  return dedupe(variants);
}

function mutateUnpronounceable(word: string): string[] {
  const patterns: Array<[string, string[]]> = [
    ['\u0441\u0442\u043d', ['\u0441\u043d', '\u0442\u043d']],
    ['\u0437\u0434\u043d', ['\u0437\u043d', '\u0434\u043d']],
    ['\u043b\u043d\u0446', ['\u043b\u0446', '\u043d\u0446']],
    ['\u0432\u0441\u0442\u0432', ['\u0441\u0442\u0432', '\u0432\u0442\u0432']],
    ['\u0440\u0434\u0446', ['\u0440\u0446', '\u0434\u0446']],
  ];

  const variants: string[] = [];
  for (const [cluster, replacements] of patterns) {
    let index = word.indexOf(cluster);
    while (index !== -1) {
      for (const replacement of replacements) {
        variants.push(word.slice(0, index) + replacement + word.slice(index + cluster.length));
      }
      index = word.indexOf(cluster, index + 1);
    }
  }

  return dedupe(variants);
}

function mutateHardSoftSign(word: string): string[] {
  const variants: string[] = [];

  for (let i = 0; i < word.length; i += 1) {
    const current = word[i]!;
    if (current === LETTERS.soft || current === LETTERS.hard) {
      variants.push(word.slice(0, i) + word.slice(i + 1));
      variants.push(replaceAt(word, i, current === LETTERS.soft ? LETTERS.hard : LETTERS.soft));
    }
  }

  for (let i = 1; i < word.length; i += 1) {
    const prev = word[i - 1]!;
    const current = word[i]!;
    if (CONSONANTS.includes(prev) && IOTATED_VOWELS.includes(current)) {
      variants.push(word.slice(0, i) + LETTERS.soft + word.slice(i));
      variants.push(word.slice(0, i) + LETTERS.hard + word.slice(i));
    }
  }

  return dedupe(variants).filter((variant) => variant !== word);
}

function mutateDoubleConsonants(word: string): string[] {
  const variants: string[] = [];

  for (let i = 0; i < word.length - 1; i += 1) {
    if (word[i] === word[i + 1] && CONSONANTS.includes(word[i]!)) {
      variants.push(word.slice(0, i) + word.slice(i + 1));
    }
  }

  for (let i = 1; i < word.length - 1; i += 1) {
    if (VOWELS.includes(word[i - 1]!) && CONSONANTS.includes(word[i]!) && VOWELS.includes(word[i + 1]!) && word[i] !== word[i + 1]) {
      variants.push(word.slice(0, i + 1) + word[i] + word.slice(i + 1));
    }
  }

  return dedupe(variants);
}

const mutators: Record<OrthographyRuleId, (word: string) => string[]> = {
  zhi_shi: mutateZhiShi,
  cha_sha: mutateChaSha,
  chu_shu: mutateChuShu,
  unstressed_vowel_root: mutateUnstressed,
  paired_consonants: mutatePairedConsonants,
  unpronounceable_consonants: mutateUnpronounceable,
  hard_soft_sign: mutateHardSoftSign,
  double_consonants: mutateDoubleConsonants,
};

function diffPositions(a: string, b: string): number[] {
  if (a.length !== b.length) return [];
  const diffs: number[] = [];
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) diffs.push(i);
  }
  return diffs;
}

function isRulePlausible(ruleId: OrthographyRuleId, correct: string, candidate: string): boolean {
  if (candidate === correct) return false;

  if (ruleId === 'zhi_shi') {
    return (candidate.includes('\u0436\u044b') || candidate.includes('\u0448\u044b')) && (correct.includes('\u0436\u0438') || correct.includes('\u0448\u0438'));
  }

  if (ruleId === 'cha_sha') {
    return candidate.includes('\u0449\u0430') || candidate.includes('\u0447\u044f') || candidate.includes('\u0449\u044f') || candidate.includes('\u0447\u0430');
  }

  if (ruleId === 'chu_shu') {
    return candidate.includes('\u0449\u0443') || candidate.includes('\u0447\u044e') || candidate.includes('\u0449\u044e') || candidate.includes('\u0447\u0443');
  }

  if (ruleId === 'unstressed_vowel_root') {
    if (candidate.length !== correct.length) return false;
    const diffs = diffPositions(correct, candidate);
    if (diffs.length !== 1) return false;
    const index = diffs[0]!;
    return index > 0 && VOWELS.includes(correct[index]!) && VOWELS.includes(candidate[index]!);
  }

  if (ruleId === 'paired_consonants') {
    if (candidate.length !== correct.length) return false;
    const diffs = diffPositions(correct, candidate);
    if (diffs.length !== 1) return false;
    const index = diffs[0]!;
    return PAIRED_MAP[correct[index]!] === candidate[index];
  }

  if (ruleId === 'unpronounceable_consonants') {
    return Math.abs(candidate.length - correct.length) <= 1 && candidate.length >= correct.length - 1;
  }

  if (ruleId === 'hard_soft_sign') {
    return candidate.includes(LETTERS.soft) || candidate.includes(LETTERS.hard) || correct.includes(LETTERS.soft) || correct.includes(LETTERS.hard);
  }

  if (ruleId === 'double_consonants') {
    const hasDouble = /([\u0431-\u044f\u0451])\1/u.test(candidate) || /([\u0431-\u044f\u0451])\1/u.test(correct);
    return hasDouble;
  }

  return false;
}

function weightedRule(level: LessonLevel, rng: () => number): OrthographyRuleId {
  const weights = program.lesson.levelRuleWeights[level] ?? {};
  const entries = Object.entries(weights) as Array<[OrthographyRuleId, number]>;
  const positive = entries.filter(([, value]) => value > 0);

  if (positive.length === 0) {
    return 'zhi_shi';
  }

  const total = positive.reduce((acc, [, value]) => acc + value, 0);
  let cursor = rng() * total;

  for (const [ruleId, value] of positive) {
    cursor -= value;
    if (cursor <= 0) {
      return ruleId;
    }
  }

  return positive[positive.length - 1]![0];
}

function shuffle3(items: [string, string, string], rng: () => number): [string, string, string] {
  const copy = [...items] as [string, string, string];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = temp;
  }
  return copy;
}

function resolveCount(requestedCount: number): number {
  if (Number.isFinite(requestedCount) && requestedCount > 0) {
    return Math.min(Math.floor(requestedCount), program.lesson.maxTasks);
  }

  return program.lesson.minTasks;
}

function resolveLexicon(level: LessonLevel): LexiconEntry[] {
  const maxRank = levelRank(level);
  return program.lexicon.filter((entry) => levelRank(entry.difficulty) <= maxRank);
}

function buildDistractors(correctWord: string, primaryRule: OrthographyRuleId, dictionaryWords: Set<string>): string[] {
  const correct = normalize(correctWord);
  const candidates: string[] = [];

  for (const ruleId of ALLOWED_RULE_CHAIN[primaryRule]) {
    const generated = mutators[ruleId](correct)
      .map(normalize)
      .filter((candidate) => candidate !== correct)
      .filter((candidate) => !dictionaryWords.has(candidate))
      .filter((candidate) => isRulePlausible(ruleId, correct, candidate));

    for (const candidate of generated) {
      candidates.push(candidate);
    }

    if (dedupe(candidates).length >= 2) {
      break;
    }
  }

  return dedupe(candidates).slice(0, 2);
}

export function generateOrthographyLesson(level: LessonLevel, count = 5, seed?: number): OrthographyTask[] {
  const rng = createSeededRng(seed);
  const targetCount = resolveCount(count);
  const lexicon = resolveLexicon(level);
  const dictionaryWords = new Set(lexicon.map((entry) => normalize(entry.correct)));
  const recentWordIds: string[] = [];
  const tasks: OrthographyTask[] = [];
  const antiRepeatWindow = Math.max(1, program.lesson.antiRepeatWindow);
  const maxAttempts = Math.max(12, targetCount * 12);
  let attempts = 0;

  while (tasks.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const ruleId = weightedRule(level, rng);
    let pool = lexicon.filter((entry) => entry.ruleTags.includes(ruleId) && !recentWordIds.includes(entry.id));

    if (pool.length === 0) {
      pool = lexicon.filter((entry) => entry.ruleTags.includes(ruleId));
    }

    if (pool.length === 0) {
      continue;
    }

    let entry = pickOne(pool, rng);
    let distractors = buildDistractors(entry.correct, ruleId, dictionaryWords);

    if (distractors.length < 2) {
      const fallback = pool.filter((candidate) => candidate.id !== entry.id);
      for (const candidate of fallback) {
        const probe = buildDistractors(candidate.correct, ruleId, dictionaryWords);
        if (probe.length >= 2) {
          entry = candidate;
          distractors = probe;
          break;
        }
      }
    }

    if (distractors.length < 2) {
      continue;
    }

    const options = shuffle3([entry.correct, distractors[0]!, distractors[1]!], rng);
    const correctOptionIndex = options.indexOf(entry.correct) as 0 | 1 | 2;

    tasks.push({
      id: makeId('task'),
      type: 'choice_3',
      ruleId,
      prompt: '\u0412\u044b\u0431\u0435\u0440\u0438 \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e\u0435 \u043d\u0430\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0441\u043b\u043e\u0432\u0430.',
      word: entry.lemma,
      options,
      correctOptionIndex,
      level,
    });

    recentWordIds.push(entry.id);
    if (recentWordIds.length > antiRepeatWindow) {
      recentWordIds.shift();
    }
  }

  return tasks;
}

export function evaluateOrthographyLesson(
  tasks: OrthographyTask[],
  answers: Record<string, number>,
): { correct: number; total: number; accuracy: number } {
  const correct = tasks.filter((task) => answers[task.id] === task.correctOptionIndex).length;
  const total = tasks.length;
  const accuracy = total > 0 ? correct / total : 0;
  return { correct, total, accuracy };
}

export function buildOrthographyDistractors(word: string, ruleId: OrthographyRuleId): string[] {
  const dictionaryWords = new Set(program.lexicon.map((entry) => normalize(entry.correct)));
  return buildDistractors(word, ruleId, dictionaryWords);
}
