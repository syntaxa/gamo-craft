import fs from 'node:fs';
import path from 'node:path';

export const RULE_IDS = [
  'zhi_shi',
  'cha_sha',
  'chu_shu',
  'unstressed_vowel_root',
  'paired_consonants',
  'unpronounceable_consonants',
  'hard_soft_sign',
  'double_consonants',
];

const LETTERS = {
  soft: '\u044c',
  hard: '\u044a',
};

const VOWELS = '\u0430\u0435\u0451\u0438\u043e\u0443\u044b\u044d\u044e\u044f';
const CONSONANTS = '\u0431\u0432\u0433\u0434\u0436\u0437\u0439\u043a\u043b\u043c\u043d\u043f\u0440\u0441\u0442\u0444\u0445\u0446\u0447\u0448\u0449';
const IOTATED_VOWELS = '\u0435\u0451\u044e\u044f\u0438';

const ALLOWED_RULE_CHAIN = {
  zhi_shi: ['zhi_shi', 'unstressed_vowel_root'],
  cha_sha: ['cha_sha', 'unstressed_vowel_root'],
  chu_shu: ['chu_shu', 'unstressed_vowel_root'],
  unstressed_vowel_root: ['unstressed_vowel_root'],
  paired_consonants: ['paired_consonants'],
  unpronounceable_consonants: ['unpronounceable_consonants'],
  hard_soft_sign: ['hard_soft_sign'],
  double_consonants: ['double_consonants', 'unstressed_vowel_root'],
};

const PAIRED_MAP = {
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

const UNSTRESSED_PAIRS = [
  ['\u043e', '\u0430'],
  ['\u0430', '\u043e'],
  ['\u0435', '\u0438'],
  ['\u0438', '\u0435'],
  ['\u044f', '\u0435'],
  ['\u0435', '\u044f'],
];

export function createSeededRng(seed) {
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

export function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith('--')) continue;
    const key = part.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function normalizeWord(word) {
  return String(word ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function dedupe(items) {
  return Array.from(new Set(items.filter((item) => item && item.trim().length > 0)));
}

function replaceAt(source, index, replacement) {
  return source.slice(0, index) + replacement + source.slice(index + 1);
}

function replaceChunk(source, from, to) {
  const variants = [];
  let cursor = source.indexOf(from);
  while (cursor !== -1) {
    variants.push(source.slice(0, cursor) + to + source.slice(cursor + from.length));
    cursor = source.indexOf(from, cursor + 1);
  }
  return variants;
}

function mutateZhiShi(word) {
  return dedupe([
    ...replaceChunk(word, '\u0436\u0438', '\u0436\u044b'),
    ...replaceChunk(word, '\u0448\u0438', '\u0448\u044b'),
  ]);
}

function mutateChaSha(word) {
  return dedupe([
    ...replaceChunk(word, '\u0447\u0430', '\u0449\u0430'),
    ...replaceChunk(word, '\u0449\u0430', '\u0447\u0430'),
    ...replaceChunk(word, '\u0447\u0430', '\u0447\u044f'),
    ...replaceChunk(word, '\u0449\u0430', '\u0449\u044f'),
  ]);
}

function mutateChuShu(word) {
  return dedupe([
    ...replaceChunk(word, '\u0447\u0443', '\u0449\u0443'),
    ...replaceChunk(word, '\u0449\u0443', '\u0447\u0443'),
    ...replaceChunk(word, '\u0449\u0443', '\u0449\u044e'),
    ...replaceChunk(word, '\u0447\u0443', '\u0447\u044e'),
  ]);
}

function mutateUnstressed(word) {
  const variants = [];
  for (let i = 1; i < word.length; i += 1) {
    const current = word[i];
    for (const [from, to] of UNSTRESSED_PAIRS) {
      if (current === from) variants.push(replaceAt(word, i, to));
    }
  }
  return dedupe(variants);
}

function mutatePairedConsonants(word) {
  const variants = [];
  for (let i = 0; i < word.length; i += 1) {
    const current = word[i];
    const mapped = PAIRED_MAP[current];
    if (!mapped) continue;
    variants.push(replaceAt(word, i, mapped));
  }
  return dedupe(variants);
}

function mutateUnpronounceable(word) {
  const patterns = [
    ['\u0441\u0442\u043d', ['\u0441\u043d', '\u0442\u043d']],
    ['\u0437\u0434\u043d', ['\u0437\u043d', '\u0434\u043d']],
    ['\u043b\u043d\u0446', ['\u043b\u0446', '\u043d\u0446']],
    ['\u0432\u0441\u0442\u0432', ['\u0441\u0442\u0432', '\u0432\u0442\u0432']],
    ['\u0440\u0434\u0446', ['\u0440\u0446', '\u0434\u0446']],
  ];

  const variants = [];
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

function mutateHardSoftSign(word) {
  const variants = [];

  for (let i = 0; i < word.length; i += 1) {
    const current = word[i];
    if (current === LETTERS.soft || current === LETTERS.hard) {
      variants.push(word.slice(0, i) + word.slice(i + 1));
      variants.push(replaceAt(word, i, current === LETTERS.soft ? LETTERS.hard : LETTERS.soft));
    }
  }

  for (let i = 1; i < word.length; i += 1) {
    const prev = word[i - 1];
    const current = word[i];
    if (CONSONANTS.includes(prev) && IOTATED_VOWELS.includes(current)) {
      variants.push(word.slice(0, i) + LETTERS.soft + word.slice(i));
      variants.push(word.slice(0, i) + LETTERS.hard + word.slice(i));
    }
  }

  return dedupe(variants).filter((variant) => variant !== word);
}

function mutateDoubleConsonants(word) {
  const variants = [];

  for (let i = 0; i < word.length - 1; i += 1) {
    if (word[i] === word[i + 1] && CONSONANTS.includes(word[i])) {
      variants.push(word.slice(0, i) + word.slice(i + 1));
    }
  }

  for (let i = 1; i < word.length - 1; i += 1) {
    if (VOWELS.includes(word[i - 1]) && CONSONANTS.includes(word[i]) && VOWELS.includes(word[i + 1]) && word[i] !== word[i + 1]) {
      variants.push(word.slice(0, i + 1) + word[i] + word.slice(i + 1));
    }
  }

  return dedupe(variants);
}

export const mutators = {
  zhi_shi: mutateZhiShi,
  cha_sha: mutateChaSha,
  chu_shu: mutateChuShu,
  unstressed_vowel_root: mutateUnstressed,
  paired_consonants: mutatePairedConsonants,
  unpronounceable_consonants: mutateUnpronounceable,
  hard_soft_sign: mutateHardSoftSign,
  double_consonants: mutateDoubleConsonants,
};

function diffPositions(a, b) {
  if (a.length !== b.length) return [];
  const diffs = [];
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) diffs.push(i);
  }
  return diffs;
}

function isRulePlausible(ruleId, correct, candidate) {
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
    const index = diffs[0];
    return index > 0 && VOWELS.includes(correct[index]) && VOWELS.includes(candidate[index]);
  }

  if (ruleId === 'paired_consonants') {
    if (candidate.length !== correct.length) return false;
    const diffs = diffPositions(correct, candidate);
    if (diffs.length !== 1) return false;
    const index = diffs[0];
    return PAIRED_MAP[correct[index]] === candidate[index];
  }

  if (ruleId === 'unpronounceable_consonants') {
    return Math.abs(candidate.length - correct.length) <= 1 && candidate.length >= correct.length - 1;
  }

  if (ruleId === 'hard_soft_sign') {
    return candidate.includes(LETTERS.soft) || candidate.includes(LETTERS.hard) || correct.includes(LETTERS.soft) || correct.includes(LETTERS.hard);
  }

  if (ruleId === 'double_consonants') {
    return /([\u0431-\u044f\u0451])\1/u.test(candidate) || /([\u0431-\u044f\u0451])\1/u.test(correct);
  }

  return false;
}

export function buildDistractors(correct, primaryRule, dictionaryWords = new Set()) {
  const clean = normalizeWord(correct);
  const candidates = [];

  for (const ruleId of ALLOWED_RULE_CHAIN[primaryRule]) {
    const generated = mutators[ruleId](clean)
      .map(normalizeWord)
      .filter((candidate) => candidate !== clean)
      .filter((candidate) => !dictionaryWords.has(candidate))
      .filter((candidate) => isRulePlausible(ruleId, clean, candidate));

    for (const candidate of generated) {
      candidates.push(candidate);
    }

    if (dedupe(candidates).length >= 2) break;
  }

  return dedupe(candidates).slice(0, 2);
}

function weightedRule(ruleWeights, rng) {
  const entries = Object.entries(ruleWeights || {}).filter(([, weight]) => Number(weight) > 0);
  if (entries.length === 0) {
    return 'zhi_shi';
  }

  const total = entries.reduce((sum, [, weight]) => sum + Number(weight), 0);
  let cursor = rng() * total;

  for (const [ruleId, weight] of entries) {
    cursor -= Number(weight);
    if (cursor <= 0) return ruleId;
  }

  return entries[entries.length - 1][0];
}

function levelRank(level) {
  if (level === 'A') return 0;
  if (level === 'B') return 1;
  return 2;
}

function shuffle3(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

export function generateSampleTasks(program, options = {}) {
  const {
    count = 30,
    level = 'A',
    seed,
    mode = 'mixed',
    rule: fixedRule,
  } = options;

  const rng = createSeededRng(seed);
  const lexicon = (program.lexicon || []).filter((entry) => levelRank(entry.difficulty) <= levelRank(level));
  const dictionaryWords = new Set(lexicon.map((entry) => normalizeWord(entry.correct)));
  const targetCount = Number(count);
  const tasks = [];

  const antiRepeatWindow = Math.max(1, Number(program.lesson?.antiRepeatWindow ?? 20));
  const recentIds = [];

  const levelWeights = program.lesson?.levelRuleWeights?.[level] ?? {};
  const balancedRules = [...RULE_IDS];

  for (let i = 0; i < targetCount; i += 1) {
    const ruleId = fixedRule || (mode === 'balanced' ? balancedRules[i % balancedRules.length] : weightedRule(levelWeights, rng));
    let pool = lexicon.filter((entry) => entry.ruleTags.includes(ruleId) && !recentIds.includes(entry.id));
    if (pool.length === 0) pool = lexicon.filter((entry) => entry.ruleTags.includes(ruleId));
    if (pool.length === 0) continue;

    let entry = pool[Math.floor(rng() * pool.length)];
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

    if (distractors.length < 2) continue;

    const options3 = shuffle3([entry.correct, distractors[0], distractors[1]], rng);
    const correctOptionIndex = options3.indexOf(entry.correct);

    tasks.push({
      id: `sample-${String(i + 1).padStart(3, '0')}`,
      ruleId,
      type: 'choice_3',
      level,
      prompt: '\u0412\u044b\u0431\u0435\u0440\u0438 \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u043e\u0435 \u043d\u0430\u043f\u0438\u0441\u0430\u043d\u0438\u0435 \u0441\u043b\u043e\u0432\u0430.',
      word: entry.lemma,
      options: options3,
      correctOptionIndex,
      sourceWordId: entry.id,
    });

    recentIds.push(entry.id);
    if (recentIds.length > antiRepeatWindow) {
      recentIds.shift();
    }
  }

  return tasks;
}

export function validateLexiconEntries(lexicon, { strict = true } = {}) {
  const errors = [];
  const seenIds = new Set();
  const seenWords = new Set();

  const normalizedEntries = lexicon.map((entry) => ({
    ...entry,
    id: String(entry.id ?? '').trim(),
    lemma: normalizeWord(entry.lemma || entry.correct),
    correct: normalizeWord(entry.correct),
    ruleTags: dedupe(Array.isArray(entry.ruleTags) ? entry.ruleTags : []),
    difficulty: entry.difficulty || 'A',
    flags: entry.flags || { dictionaryWord: false },
  }));

  const dictionaryWords = new Set(normalizedEntries.map((entry) => entry.correct));

  for (const entry of normalizedEntries) {
    if (!entry.id) errors.push('entry without id');
    if (!entry.correct) errors.push(`entry ${entry.id || '<no-id>'} has empty correct`);
    if (seenIds.has(entry.id)) errors.push(`duplicate id: ${entry.id}`);
    if (seenWords.has(entry.correct)) errors.push(`duplicate correct word: ${entry.correct}`);
    if (entry.ruleTags.length === 0) errors.push(`entry ${entry.id} has no ruleTags`);

    for (const ruleId of entry.ruleTags) {
      if (!RULE_IDS.includes(ruleId)) {
        errors.push(`entry ${entry.id} has unknown ruleId: ${ruleId}`);
      }
      const distractors = buildDistractors(entry.correct, ruleId, dictionaryWords);
      if (distractors.length < 2) {
        errors.push(`entry ${entry.id} cannot build 2 distractors for rule ${ruleId}`);
      }
    }

    seenIds.add(entry.id);
    seenWords.add(entry.correct);
  }

  if (strict && errors.length > 0) {
    const message = `Lexicon validation failed:\n- ${errors.join('\n- ')}`;
    throw new Error(message);
  }

  return { errors, normalized: normalizedEntries };
}