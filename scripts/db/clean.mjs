// A clean sheet: empties the operational data so real sales can be entered, and leaves the
// catalogue standing. Every account, person, lead, quote, order, invoice, shipment, basket and
// stock movement goes, and the document numbering restarts. The catalogue, its cost basis, the
// delivery zones, the site settings and the staff logins stay exactly as they are.
//
// The stock ledger is append-only and the balance is derived from it, both enforced by triggers.
// A reset is the one operation that stands outside those rules, so it runs with the triggers off,
// inside a single transaction: either the whole sheet is clean or nothing changed.
//
// A remote database is refused unless the caller names it: AXIOM_CLEAN_CONFIRM must equal the
// database name. Nobody empties Supabase by pressing up-arrow on a local command.
import { connect, DATABASE_URL, IS_LOCAL } from './lib.mjs';

const dbName = new URL(DATABASE_URL).pathname.slice(1);
const host = new URL(DATABASE_URL).hostname;

if (!IS_LOCAL && process.env.AXIOM_CLEAN_CONFIRM !== dbName) {
  console.error(`refusing to empty a remote database.\n  host: ${host}\n  database: ${dbName}\nRe-run with AXIOM_CLEAN_CONFIRM=${dbName} if that is what you mean.`);
  process.exit(1);
}

// Kept: pathways, products, product_variants, product_references, variant_costs, delivery_zones,
// site_settings, schema_migrations, and the staff profiles with their logins.
const EMPTIED = [
  'public.cart_items', 'public.carts',
  'public.shipments',
  'public.invoice_events', 'public.invoice_items', 'public.invoices',
  'public.order_events', 'public.order_item_costs', 'public.order_items', 'public.orders',
  'public.quote_events', 'public.quote_item_costs', 'public.quote_items', 'public.quotes',
  'public.leads', 'public.activities', 'public.acknowledgements',
  'public.account_members', 'public.account_sites', 'public.accounts',
  'public.stock_movements', 'public.variant_stock',
  'public.coa_documents', 'public.lots', 'public.price_changes',
  'public.doc_sequences',
];

const sql = connect();

const before = await counts(sql);
console.log(`clean sheet · ${host}/${dbName}`);
report('to remove', before.removing);
report('to keep', before.keeping);

await sql.begin(async tx => {
  await tx.unsafe('set local session_replication_role = replica');
  for (const t of EMPTIED) await tx.unsafe(`delete from ${t}`);
  // A login whose person is not staff goes with them; profiles cascade from auth.users, so the
  // second delete only catches a profile that never had a login.
  await tx.unsafe(`delete from auth.users u where not exists (
    select 1 from public.profiles p where p.id = u.id and p.role in ('ops','owner'))`);
  await tx.unsafe(`delete from public.profiles where role not in ('ops','owner')`);
  // Staff belong to no client account, and the one they were seeded into is gone.
  await tx.unsafe('update public.profiles set account_id = null where account_id is not null');
});

const after = await counts(sql);
const left = Object.entries(after.removing).filter(([, n]) => n > 0);
report('kept', after.keeping);
console.log(left.length ? `NOT EMPTY: ${left.map(([t, n]) => `${t} ${n}`).join(', ')}` : 'clean sheet ready');
await sql.end();
process.exit(left.length ? 1 : 0);

async function counts(s) {
  const removing = {};
  for (const t of EMPTIED) removing[t.replace('public.', '')] = (await s.unsafe(`select count(*)::int n from ${t}`))[0].n;
  removing['profiles (clients)'] = (await s`select count(*)::int n from public.profiles where role not in ('ops','owner')`)[0].n;
  const keeping = {
    'product_variants': (await s`select count(*)::int n from public.product_variants`)[0].n,
    'variant_costs': (await s`select count(*)::int n from public.variant_costs`)[0].n,
    'delivery_zones': (await s`select count(*)::int n from public.delivery_zones`)[0].n,
    'site_settings': (await s`select count(*)::int n from public.site_settings`)[0].n,
    'profiles (staff)': (await s`select count(*)::int n from public.profiles where role in ('ops','owner')`)[0].n,
  };
  return { removing, keeping };
}

function report(label, rows) {
  const live = Object.entries(rows).filter(([, n]) => n > 0);
  console.log(`  ${label}: ${live.length ? live.map(([t, n]) => `${t} ${n}`).join(', ') : 'nothing'}`);
}
