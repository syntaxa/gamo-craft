import path from 'node:path';
import { parseArgs, readJsonIfExists, writeJson, validateLexiconEntries, RULE_IDS } from './lib.mjs';

const root = process.cwd();
const __dirname = path.resolve(root, 'scripts/orthography');

const args = parseArgs(process.argv);
const inFile = path.resolve(root, args.in || 'tmp/orthography/build/lexicon.raw.json');
const outFile = path.resolve(root, args.out || 'src/content/learning/orthography-1.v1.json');

const payload = readJsonIfExists(inFile);
if (!payload) {
  throw new Error(`[orth:program] input file not found: ${path.relative(root, inFile)}`);
}

const entries = Array.isArray(payload) ? payload : payload.entries;
if (!Array.isArray(entries)) {
  throw new Error('[orth:program] expected lexicon array or { entries: [] } payload');
}

const { normalized } = validateLexiconEntries(entries, { strict: true });

const ruleTitles = {
  zhi_shi: 'Р–Р-РЁР',
  cha_sha: 'Р§Рђ-Р©Рђ',
  chu_shu: 'Р§РЈ-Р©РЈ',
  unstressed_vowel_root: 'Р‘РµР·СѓРґР°СЂРЅР°СЏ РіР»Р°СЃРЅР°СЏ',
  paired_consonants: 'РџР°СЂРЅС‹Рµ СЃРѕРіР»Р°СЃРЅС‹Рµ',
  unpronounceable_consonants: 'РќРµРїСЂРѕРёР·РЅРѕСЃРёРјС‹Рµ СЃРѕРіР»Р°СЃРЅС‹Рµ',
  hard_soft_sign: 'Р Р°Р·РґРµР»РёС‚РµР»СЊРЅС‹Рµ Р¬/РЄ',
  double_consonants: 'РЈРґРІРѕРµРЅРЅС‹Рµ СЃРѕРіР»Р°СЃРЅС‹Рµ',
};

const program = {
  version: 1,
  programId: 'orthography-1',
  meta: {
    locale: 'ru-RU',
    age: '7-9',
    taskFormat: 'choice_3',
    generatedAt: new Date().toISOString(),
  },
  rules: RULE_IDS.map((id) => ({ id, title: ruleTitles[id] })),
  lesson: {
    minTasks: 5,
    maxTasks: 10,
    taskType: 'choice_3',
    antiRepeatWindow: 20,
    levelRuleWeights: {
      A: {
        zhi_shi: 1.2,
        cha_sha: 1.2,
        chu_shu: 1.2,
        unstressed_vowel_root: 1,
        paired_consonants: 1,
        unpronounceable_consonants: 0.8,
        hard_soft_sign: 0.9,
        double_consonants: 0.8,
      },
      B: {
        zhi_shi: 1,
        cha_sha: 1,
        chu_shu: 1,
        unstressed_vowel_root: 1.1,
        paired_consonants: 1.1,
        unpronounceable_consonants: 1,
        hard_soft_sign: 1,
        double_consonants: 1,
      },
      C: {
        zhi_shi: 1,
        cha_sha: 1,
        chu_shu: 1,
        unstressed_vowel_root: 1.2,
        paired_consonants: 1.2,
        unpronounceable_consonants: 1.1,
        hard_soft_sign: 1.1,
        double_consonants: 1.1,
      },
    },
  },
  lexicon: normalized,
};

writeJson(outFile, program);
console.log(`[orth:program] wrote ${normalized.length} entries to ${path.relative(root, outFile)}`);