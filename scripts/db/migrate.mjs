// Applies supabase/migrations in order. On plain Postgres it first installs the local auth stub
// (Supabase already provides auth.*); migrations are identical in both cases.
import { connect, sqlFiles, runFile, IS_LOCAL } from './lib.mjs';
const sql = connect();
const [{ exists }] = await sql`select exists (select 1 from pg_namespace where nspname = 'auth') as exists`;
if (IS_LOCAL && !exists) { await runFile(sql, 'supabase/local/auth_stub.sql'); console.log('auth stub installed'); }
await sql.unsafe(`create table if not exists public.schema_migrations (name text primary key, applied_at timestamptz not null default now())`);
for (const f of sqlFiles('supabase/migrations')) {
  const name = f.split('/').pop();
  const [done] = await sql`select 1 from public.schema_migrations where name = ${name}`;
  if (done) continue;
  await sql.begin(async tx => { await runFile(tx, f); await tx`insert into public.schema_migrations (name) values (${name})`; });
  console.log('applied', name);
}
await sql.end();
