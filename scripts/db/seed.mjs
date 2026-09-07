// Seeds the catalogue (always) and, when AXIOM_SEED_DEV=1 or the database is local, the
// development fixtures: staff and clinic users, accounts, sites, acknowledgements, stock and a
// few quotes and orders walked through the real functions so every seeded state is one the rules
// would produce.
import { connect, runFile, IS_LOCAL } from './lib.mjs';
const sql = connect();
const [{ n }] = await sql`select count(*)::int as n from public.product_variants`;
if (n === 0) { await sql.begin(tx => runFile(tx, 'supabase/seed.sql')); console.log('catalogue seeded'); } else console.log('catalogue present', n);
if (process.env.AXIOM_SEED_DEV === '1' || (IS_LOCAL && process.env.AXIOM_SEED_DEV !== '0')) {
  const [{ users }] = await sql`select count(*)::int as users from public.profiles`;
  if (users === 0) { await sql.begin(tx => runFile(tx, 'supabase/seed_dev.sql')); console.log('dev fixtures seeded'); } else console.log('dev fixtures present');
}
await sql.end();
