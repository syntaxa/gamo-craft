import path from 'node:path';
import { parseArgs, readJsonIfExists, validateLexiconEntries } from './lib.mjs';

const root = process.cwd();
const __dirname = path.resolve(root, 'scripts/orthography');

const args = parseArgs(process.argv);
const inFile = path.resolve(root, args.in || 'tmp/orthography/build/lexicon.raw.json');
const payload = readJsonIfExists(inFile);

if (!payload) {
  throw new Error(`[orth:validate] input file not found: ${path.relative(root, inFile)}`);
}

const entries = Array.isArray(payload) ? payload : payload.entries;
if (!Array.isArray(entries)) {
  throw new Error('[orth:validate] expected lexicon array or { entries: [] } payload');
}

const result = validateLexiconEntries(entries, { strict: false });
if (result.errors.length > 0) {
  console.error('[orth:validate] failed with issues:');
  for (const issue of result.errors) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`[orth:validate] OK, ${entries.length} entries passed`);