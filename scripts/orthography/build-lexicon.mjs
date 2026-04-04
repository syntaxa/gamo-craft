import path from 'node:path';
import { parseArgs, readJsonIfExists, writeJson, validateLexiconEntries } from './lib.mjs';

const root = process.cwd();
const __dirname = path.resolve(root, 'scripts/orthography');

const args = parseArgs(process.argv);
const inputDir = path.resolve(root, args.inputDir || 'tmp/orthography/input');
const outFile = path.resolve(root, args.out || 'tmp/orthography/build/lexicon.raw.json');
const seedFile = path.resolve(__dirname, 'seed-lexicon.json');

const seedLexicon = readJsonIfExists(seedFile, []);
const manualLexicon = readJsonIfExists(path.join(inputDir, 'lexicon.manual.json'), []);

const merged = [...seedLexicon, ...manualLexicon];
const { normalized, errors } = validateLexiconEntries(merged, { strict: false });

if (errors.length > 0) {
  console.warn('[orth:build] validation warnings during build:');
  for (const issue of errors) {
    console.warn(`- ${issue}`);
  }
}

writeJson(outFile, {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: {
    seedFile: path.relative(root, seedFile),
    manualFile: path.relative(root, path.join(inputDir, 'lexicon.manual.json')),
  },
  entries: normalized,
});

console.log(`[orth:build] wrote ${normalized.length} entries to ${path.relative(root, outFile)}`);