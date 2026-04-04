import path from 'node:path';
import { parseArgs, readJsonIfExists, writeJson, generateSampleTasks, RULE_IDS } from './lib.mjs';

const root = process.cwd();
const __dirname = path.resolve(root, 'scripts/orthography');

const args = parseArgs(process.argv);
const count = Number(args.count ?? 30);
const seed = args.seed !== undefined ? Number(args.seed) : undefined;
const level = String(args.level ?? 'A').toUpperCase();
const mode = String(args.mode ?? 'mixed');
const rule = args.rule ? String(args.rule) : undefined;

if (!['A', 'B', 'C'].includes(level)) {
  throw new Error(`[orth:samples] --level must be A|B|C, got: ${level}`);
}
if (!['mixed', 'balanced'].includes(mode)) {
  throw new Error(`[orth:samples] --mode must be mixed|balanced, got: ${mode}`);
}
if (rule && !RULE_IDS.includes(rule)) {
  throw new Error(`[orth:samples] unknown --rule: ${rule}`);
}

const programPath = path.resolve(root, args.program || 'src/content/learning/orthography-1.v1.json');
const program = readJsonIfExists(programPath);
if (!program) {
  throw new Error(`[orth:samples] program file not found: ${path.relative(root, programPath)}`);
}

const tasks = generateSampleTasks(program, {
  count,
  seed,
  level,
  mode,
  rule,
});

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = path.resolve(root, `tmp/orthography/samples/batch-${stamp}.json`);
const report = {
  generatedAt: new Date().toISOString(),
  params: { count, seed, level, mode, rule: rule ?? null },
  total: tasks.length,
  tasks,
};
writeJson(outFile, report);

console.log('=== ORTHOGRAPHY SAMPLE BATCH ===');
console.log(`program: ${path.relative(root, programPath)}`);
console.log(`params: count=${count}, level=${level}, seed=${seed ?? 'random'}, mode=${mode}${rule ? `, rule=${rule}` : ''}`);
console.log(`total: ${tasks.length}`);
console.log('');

for (const [index, task] of tasks.entries()) {
  console.log(`${index + 1}. [${task.ruleId}] ${task.word}`);
  task.options.forEach((option, optionIndex) => {
    const marker = optionIndex === task.correctOptionIndex ? '*' : ' ';
    console.log(`   ${optionIndex + 1})${marker} ${option}`);
  });
}

console.log('');
console.log(`[orth:samples] json report: ${path.relative(root, outFile)}`);