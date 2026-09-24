// Runs every gate that can run locally, in order, and reports the table. Every gate is a test.
import { spawnSync } from 'node:child_process';

const steps = [
  ['typecheck', 'pnpm', ['typecheck']],
  ['unit · calendar feed', 'pnpm', ['test']],
  ['gates 9 · copy lint', 'node', ['scripts/gates/copy-lint.mjs']],
  ['gates 1 · 13 · greps', 'node', ['scripts/gates/grep.mjs']],
  ['gate 17 · bilingual', 'node', ['scripts/gates/i18n.mjs']],
  ['gates 2 · 2b · 3 · 4 · 5 · 6 · 11 · 12 · 14 · 22 · sql', 'node', ['scripts/gates/sql.mjs']],
  ['gate 8 · references', 'node', ['scripts/gates/references.mjs']],
  ...(process.env.AXIOM_SKIP_E2E === '1' ? [] : [['gates 6 · 7 · 10 · 14 · 15 · 16 · 18 · 19 · 20 · 21 · e2e', 'pnpm', ['exec', 'playwright', 'test']]]),
];

const results = [];
for (const [name, cmd, args] of steps) {
  console.log(`\n━━ ${name}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: process.env });
  results.push([name, r.status === 0]);
}
console.log('\nGate table');
for (const [name, ok] of results) console.log(`  ${ok ? '✓' : '✗'}  ${name}`);
process.exit(results.every(r => r[1]) ? 0 : 1);
