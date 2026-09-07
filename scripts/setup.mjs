// One command for a new engineer: `pnpm setup` — checks Postgres, writes .env.local, migrates, seeds.
// Then `pnpm dev` serves all three surfaces and `pnpm gates` runs every gate.
import fs from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';

const url = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/axiom';
if (!fs.existsSync('.env.local')) {
  fs.writeFileSync('.env.local', fs.readFileSync('.env.example', 'utf8').replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`));
  console.log('wrote .env.local');
}
process.env.DATABASE_URL = url;

// Is Postgres reachable? Try to start a local cluster when it is not (Debian/Ubuntu layout).
function reachable() {
  const r = spawnSync('node', ['-e', `import('postgres').then(async m => { const s = m.default(process.env.DATABASE_URL.replace(/\\/[^/?]+(\\?|$)/, '/postgres$1'), { max: 1 }); await s\`select 1\`; await s.end(); })`], { env: process.env, stdio: 'ignore' });
  return r.status === 0;
}
if (!reachable()) {
  console.log('Postgres not reachable; trying to start a local cluster');
  try { execSync('pg_ctlcluster 16 main start', { stdio: 'inherit' }); } catch {}
  try { execSync(`su postgres -c "psql -tAc \\"alter user postgres password 'postgres'\\""`, { stdio: 'ignore' }); } catch {}
  if (!reachable()) { console.error(`Cannot reach ${url}. Start Postgres 16 (or \`supabase start\`) and set DATABASE_URL.`); process.exit(1); }
}

execSync('node scripts/db/reset.mjs', { stdio: 'inherit', env: { ...process.env, AXIOM_DB_LOCAL: '1' } });
console.log('\nReady. Next:\n  pnpm dev          → http://localhost:3000 (public), /console (sign in as Aero), /account (sign in as a clinic)\n  pnpm gates        → every gate, locally');
