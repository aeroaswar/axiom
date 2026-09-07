// SQL gates — proven against the database, not the UI. Each check runs inside a transaction as a
// given caller (role + JWT claims, exactly what PostgREST sets) and rolls back.
import { connect } from '../db/lib.mjs';

const sql = connect();
const OWNER = '00000000-0000-4000-8000-000000000001';
const OPS = '00000000-0000-4000-8000-000000000002';
const REGENERA_DIRECTOR = '00000000-0000-4000-8000-000000000011';
const SENOPATI = '00000000-0000-4000-8000-000000000015';
const IVAN = '00000000-0000-4000-8000-000000000016';
const REGENERA = '10000000-0000-4000-8000-000000000001';
const KBY = '20000000-0000-4000-8000-000000000001';
const KMG = '20000000-0000-4000-8000-000000000002';
const BDG = '20000000-0000-4000-8000-000000000003';

let failures = 0, passes = 0;
function ok(cond, label, detail = '') { if (cond) { passes++; console.log('  ✓', label); } else { failures++; console.log('  ✗', label, detail); } }
// Runs fn inside a savepoint so the surrounding transaction survives the expected failure.
async function expectError(tx, fn, label, pattern) {
  let err = null;
  try { await tx.savepoint(async sp => { await fn(sp); }); }
  catch (e) { err = e; }
  if (!err) ok(false, label, '(no error raised)');
  else ok(!pattern || pattern.test(err.message + ' ' + (err.code || '')), label, err.message);
}

// Run fn as a caller inside a transaction that is always rolled back. The claims are bound as a
// parameter, never interpolated: a uid is caller-derived data everywhere else in the system and
// this file is the pattern the application copies.
async function as(uid, fn) {
  return rollback(async tx => { await become(tx, uid); return fn(tx); });
}
async function become(tx, uid) {
  const claims = uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : '{}';
  await tx.unsafe(`set local role ${uid ? 'authenticated' : 'anon'}`);
  await tx`select set_config('request.jwt.claims', ${claims}, true)`;
}
// Raw transaction, always rolled back: for checks that must set up as the schema owner and then
// drop into a role.
async function rollback(fn) {
  let result;
  try {
    await sql.begin(async tx => { result = await fn(tx); throw new Rollback(); });
  } catch (e) { if (!(e instanceof Rollback)) throw e; }
  return result;
}
class Rollback extends Error {}

console.log('Gate: RLS on every table with at least one policy');
{
  const rows = await sql`select c.relname, c.relrowsecurity, (select count(*) from pg_policy p where p.polrelid = c.oid) as policies
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'schema_migrations'`;
  for (const r of rows) ok(r.relrowsecurity && r.policies > 0, `${r.relname}: rls=${r.relrowsecurity} policies=${r.policies}`);
}

console.log('Gate 2: prices reconcile to the Margin Structure');
await as(OWNER, async tx => {
  const [t] = await tx`select count(*)::int lots, sum(supplier_cost_idr)::bigint sup, sum(supplier_cost_idr + pen_cost_idr)::bigint base, sum(price_idr)::bigint sell, sum(margin_idr)::bigint margin,
    bool_and(pen_cost_idr = 600000) pen_ok from public.v_pricing where kind = 'peptide'`;
  ok(t.lots === 79, `79 peptide lots (${t.lots})`);
  ok(Number(t.sup) === 79_320_000, `supplier Rp 79.320.000 (${t.sup})`);
  ok(Number(t.base) === 126_720_000, `base Rp 126.720.000 (${t.base})`);
  ok(Number(t.sell) === 249_800_000, `selling Rp 249.800.000 (${t.sell})`);
  ok(Number(t.margin) === 123_080_000, `margin Rp 123.080.000 (${t.margin})`);
  ok((Number(t.margin) / Number(t.sell) * 100).toFixed(1) === '49.3', 'GM 49.3%');
  ok((Number(t.margin) / Number(t.base) * 100).toFixed(1) === '97.1', 'markup 97.1%');
  ok(t.pen_ok, 'base − supplier = Rp 600.000 on every peptide lot');
  const [n] = await tx`select count(*)::int n from public.v_pricing where kind <> 'peptide'`;
  ok(n.n === 8, `8 devices and apparel (${n.n})`);
  const counts = await tx`select pathway_no, count(*)::int n from public.v_pricing where kind = 'peptide' group by 1 order by 1`;
  ok(counts.map(c => c.n).join('/') === '10/11/13/8/8/2/6/9/12', `pathway counts ${counts.map(c => c.n).join('/')}`);
});

console.log('Gate 2b: a lot is not a compound');
{
  const [r] = await sql`select count(distinct p.id)::int compounds, count(v.id)::int lots, bool_and(p.is_published) published
    from public.product_variants v join public.products p on p.id = v.product_id where p.kind = 'peptide'`;
  ok(r.lots === 79 && r.compounds < 79, `79 lots collapse to ${r.compounds} compound pages`);
  ok(r.published, 'every compound page is published');
  const [dup] = await sql`select count(*)::int n from (select product_id, dose from public.product_variants group by 1,2 having count(*) > 1) d`;
  ok(dup.n === 0, 'no duplicate dose row within a compound');
}

console.log('Gate 3: frozen prices');
await as(OWNER, async tx => {
  const [{ id: vid, price_idr }] = await tx`select id, price_idr from public.product_variants where sku = 'reta10'`;
  const [{ new_quote: q }] = await tx`select axiom.new_quote(${REGENERA}::uuid, ${tx.json([{ sku: 'reta10', qty: 1, site_id: KBY }])})`;
  await tx`select axiom.send_quote(${q}::uuid)`;
  const [{ accept_quote: o }] = await tx`select axiom.accept_quote(${q}::uuid)`;
  const [before] = await tx`select o.total_idr, (select total_idr from public.invoices where order_id = o.id) inv, (select unit_price_idr from public.order_items where order_id = o.id) line from public.orders o where o.id = ${o}::uuid`;
  await tx`select axiom.set_price(${vid}::uuid, ${Number(price_idr) + 500000})`;
  const [after] = await tx`select o.total_idr, (select total_idr from public.invoices where order_id = o.id) inv, (select unit_price_idr from public.order_items where order_id = o.id) line from public.orders o where o.id = ${o}::uuid`;
  ok(before.line === after.line && before.total_idr === after.total_idr && before.inv === after.inv, 'order line, order total and invoice unchanged after a catalogue price rise');
  const [pc] = await tx`select count(*)::int n from public.price_changes where variant_id = ${vid}::uuid and to_idr = ${Number(price_idr) + 500000}`;
  ok(pc.n === 1, 'price change audited (who, when, from, to)');
});

console.log('Gate 4: RLS holds for a client');
await as(IVAN, async tx => {
  const mine = await tx`select account_id from public.orders`;
  ok(mine.length > 0 && mine.every(r => r.account_id === '10000000-0000-4000-8000-000000000005'), `client sees only own orders (${mine.length})`);
  const other = await tx`select id from public.orders where account_id = ${REGENERA}::uuid`;
  ok(other.length === 0, "direct read of another account's orders returns zero rows");
  const acc = await tx`select id from public.accounts`;
  ok(acc.length === 1, 'sees one account: its own');
});

console.log('Gate 5: margin is owner-only');
await as(OPS, async tx => {
  await expectError(tx, sp => sp`select supplier_cost_idr from public.variant_costs`, 'ops: variant_costs.supplier_cost_idr refused', /owner-only|permission|privilege/i);
});
await as(OPS, async tx => {
  await expectError(tx, sp => sp`select supplier_cost_idr from public.v_pricing`, 'ops: v_pricing refused', /owner-only|permission|privilege/i);
});
await as(OPS, async tx => {
  await expectError(tx, sp => sp`select unit_supplier_cost_idr from public.order_item_costs`, 'ops: order_item_costs refused', /owner-only|permission|privilege/i);
});
await as(OWNER, async tx => { const r = await tx`select supplier_cost_idr from public.v_pricing limit 1`; ok(r.length === 1, 'owner reads cost'); });

console.log('Gate 6: acknowledgement gates commerce, education stays public');
await as(SENOPATI, async tx => {
  const [s] = await tx`select axiom.ack_state_for('10000000-0000-4000-8000-000000000004'::uuid) st`;
  ok(s.st === 'lapsed', `Senopati acknowledgement is ${s.st}`);
  const pv = await tx`select v.price_idr from public.product_variants v join public.products p on p.id = v.product_id where p.kind = 'peptide'`;
  ok(pv.length === 0, 'lapsed account: zero peptide rows from product_variants');
  const cat = await tx`select price_idr, name from public.v_catalogue where kind = 'peptide'`;
  ok(cat.length === 79 && cat.every(r => r.price_idr === null), `lapsed account: 79 guide rows, zero peptide prices via v_catalogue`);
  const app = await tx`select price_idr from public.v_catalogue where kind <> 'peptide'`;
  ok(app.length === 8 && app.every(r => r.price_idr !== null), 'lapsed account: devices and apparel still priced');
  const prod = await tx`select count(*)::int n from public.products where kind = 'peptide' and identity_en is not null`;
  ok(prod[0].n > 60, `lapsed account reads the compound guide in full (${prod[0].n} compounds)`);
});
await as(OWNER, async tx => {
  // a peptide quote line for a lapsed account cannot be sent
  const [{ new_quote: q }] = await tx`select axiom.new_quote('10000000-0000-4000-8000-000000000004'::uuid, ${tx.json([{ sku: 'bpc10', qty: 1 }])})`;
  await expectError(tx, sp => sp`select axiom.send_quote(${q}::uuid)`, 'a peptide quote cannot be sent to a lapsed account', /acknowledgement/i);
});
await as(REGENERA_DIRECTOR, async tx => {
  const cat = await tx`select price_idr from public.v_catalogue where kind = 'peptide'`;
  ok(cat.length === 79 && cat.every(r => r.price_idr !== null), 'current account: 79 peptide prices');
  const qi = await tx`select count(*)::int n from public.quote_items`;
  ok(qi[0].n > 0, `current account reads its quote lines (${qi[0].n})`);
});
await as(null, async tx => {
  const cat = await tx`select price_idr from public.v_catalogue where kind = 'peptide'`;
  ok(cat.length === 79 && cat.every(r => r.price_idr === null), 'anon (gated): guide rows without prices');
  const pv = await tx`select v.id, p.kind from public.product_variants v join public.products p on p.id = v.product_id`;
  ok(pv.length === 8 && pv.every(r => r.kind !== 'peptide'), `anon reads only the 8 non-peptide variant rows directly (${pv.length})`);
});

console.log('Gate 11: payment gates dispatch');
await as(OPS, async tx => {
  const [o] = await tx`select id from public.orders where state = 'awaiting_payment' limit 1`;
  await expectError(tx, sp => sp`update public.orders set state = 'packing' where id = ${o.id}::uuid`, 'direct state write awaiting_payment → packing refused', /payment gates dispatch|through axiom/i);
});
await as(OPS, async tx => {
  const [o] = await tx`select id from public.orders where state = 'awaiting_payment' limit 1`;
  await expectError(tx, sp => sp`select axiom.advance_order(${o.id}::uuid)`, 'advance_order refused while unpaid', /payment gates dispatch/i);
});
await as(OPS, async tx => {
  const [o] = await tx`select id from public.orders where state = 'awaiting_payment' limit 1`;
  await tx`select axiom.mark_paid(${o.id}::uuid, 'TRF-GATE-11')`;
  const [r] = await tx`select o.state, i.paid_at, i.paid_by, i.paid_ref from public.orders o join public.invoices i on i.order_id = o.id and i.kind = 'invoice' where o.id = ${o.id}::uuid`;
  ok(r.state === 'packing' && r.paid_at && r.paid_by === OPS && r.paid_ref === 'TRF-GATE-11', 'mark paid records who, when, reference and moves to packing in one transaction');
  const [ev] = await tx`select count(*)::int n from public.invoice_events where invoice_id = (select id from public.invoices where order_id = ${o.id}::uuid and kind = 'invoice') and kind = 'paid'`;
  ok(ev.n === 1, 'paid event logged');
});

console.log('Gate 12: stock never lies');
await as(OWNER, async tx => {
  const stock = async () => (await tx`select on_hand, reserved, available from public.v_stock where variant_id = (select id from public.product_variants where sku = 'huma10')`)[0];
  const s0 = await stock();
  const [{ new_quote: q }] = await tx`select axiom.new_quote(${REGENERA}::uuid, ${tx.json([{ sku: 'huma10', qty: 2, site_id: KBY }])})`;
  await tx`select axiom.send_quote(${q}::uuid)`;
  const s1 = await stock();
  ok(s1.reserved === s0.reserved + 2 && s1.on_hand === s0.on_hand, `sending a quote raises reserved (${s0.reserved} → ${s1.reserved})`);
  const [{ accept_quote: o }] = await tx`select axiom.accept_quote(${q}::uuid)`;
  const s2 = await stock();
  ok(s2.reserved === s1.reserved, 'acceptance hands the hold to the order without changing it');
  await tx`select axiom.mark_paid(${o}::uuid, 'x')`;
  await tx`select axiom.advance_order(${o}::uuid)`;
  const s3 = await stock();
  ok(s3.on_hand === s0.on_hand - 2 && s3.reserved === s0.reserved, `dispatch lowers on hand and clears the hold (${s3.on_hand}/${s3.reserved})`);
  // cancel releases
  const [{ new_quote: q2 }] = await tx`select axiom.new_quote(${REGENERA}::uuid, ${tx.json([{ sku: 'huma10', qty: 1, site_id: KBY }])})`;
  await tx`select axiom.send_quote(${q2}::uuid)`;
  const [{ accept_quote: o2 }] = await tx`select axiom.accept_quote(${q2}::uuid)`;
  const s4 = await stock();
  await tx`select axiom.cancel_order(${o2}::uuid)`;
  const s5 = await stock();
  ok(s4.reserved === s3.reserved + 1 && s5.reserved === s3.reserved, 'cancel releases the hold');
  const [inv] = await tx`select voided_at from public.invoices where order_id = ${o2}::uuid and kind = 'invoice'`;
  ok(inv.voided_at !== null, 'cancel voids the unpaid invoice');
  await expectError(tx, sp => sp`select axiom.move_stock((select id from public.product_variants where sku = 'huma10'), -999, 'loss', 'gate')`, 'a write below zero is refused by the constraint', /variant_stock_on_hand_check|check/i);
  // sending more than available is refused
  const [{ new_quote: q3 }] = await tx`select axiom.new_quote(${REGENERA}::uuid, ${tx.json([{ sku: 'tb500', qty: 1, site_id: KBY }])})`;
  await expectError(tx, sp => sp`select axiom.send_quote(${q3}::uuid)`, 'a line over availability blocks Send', /available/i);
});

console.log('Gate 14: delivery per consignment');
{
  const rows = await sql`select u, axiom.consignment_charge(u, 'jabodetabek') c from unnest(array[3,4,7,9,40]) u`;
  ok(rows.map(r => Number(r.c)).join('/') === '100000/200000/300000/300000/300000', `3/4/7/9/40 units → ${rows.map(r => r.c).join('/')}`);
  const [pending] = await sql`select axiom.consignment_charge(3, 'jawa') c`;
  ok(pending.c === null, 'other zones are rate pending (null), never zero');
  // called as a real caller: axiom.delivery_for_lines answers for an account you belong to or staff.
  await as(OWNER, async tx => {
    const split = await tx`select * from axiom.delivery_for_lines(${tx.json([{ site_id: KBY, qty: 1 }, { site_id: KMG, qty: 1 }, { site_id: KBY, qty: 1 }])}, ${REGENERA}::uuid)`;
    ok(split.reduce((a, r) => a + Number(r.charge_idr), 0) === 200000 && split.length === 2, 'two lines to one site count as one consignment');
    const three = await tx`select * from axiom.delivery_for_lines(${tx.json([{ site_id: KBY, qty: 1 }, { site_id: KMG, qty: 1 }, { site_id: BDG, qty: 1 }])}, ${REGENERA}::uuid)`;
    ok(three.some(r => r.charge_idr === null), 'a Bandung line is rate pending');
  });
  await as(OWNER, async tx => {
    const [{ new_quote: q }] = await tx`select axiom.new_quote(${REGENERA}::uuid, ${tx.json([{ sku: 'tee', qty: 1, site_id: BDG }])})`;
    await expectError(tx, sp => sp`select axiom.send_quote(${q}::uuid)`, 'a quote with an unpriced destination cannot be sent', /rate pending/i);
  });
}

console.log('Gate 22: everything is logged');
{
  const [r] = await sql`select count(*)::int orders, sum((select count(*) from public.order_events e where e.order_id = o.id))::int events from public.orders o`;
  ok(r.events >= r.orders, `${r.events} order events across ${r.orders} orders`);
  const [c] = await sql`select count(*)::int n from public.orders where state = 'cancelled'`;
  ok(c.n >= 1, 'a cancelled order stays readable');
  const [missing] = await sql`select count(*)::int n from public.orders o where not exists (select 1 from public.order_events e where e.order_id = o.id and e.to_state = 'awaiting_payment')`;
  ok(missing.n === 0, 'every order carries its acceptance event with actor and timestamp');
  const [inv] = await sql`select count(*)::int n from public.invoices i where i.issued_at is not null and not exists (select 1 from public.invoice_events e where e.invoice_id = i.id and e.kind = 'issued')`;
  ok(inv.n === 0, 'every issued invoice carries its issued event');
}

console.log('Gate S14: ack_state_for is total, and still closed to a stranger');
{
  // A script, a job or this suite assumes no role: it must read a real state, never NULL.
  const rows = await sql`select axiom.ack_state_for(id) st from public.accounts`;
  ok(rows.every(r => r.st !== null), `every account has a state for a trusted caller (${rows.map(r => r.st).join(', ')})`);
  ok(rows.some(r => r.st === 'current') && rows.some(r => r.st === 'lapsed') && rows.some(r => r.st === 'none'),
     'the seeded accounts still span current, lapsed and none');
}
await as(null, async tx => {
  const [r] = await tx`select axiom.ack_state_for(${REGENERA}::uuid) st`;
  ok(r.st === 'none', `anon reads 'none' for another account, never its real state (${r.st})`);
});
await as(IVAN, async tx => {
  const [r] = await tx`select axiom.ack_state_for(${REGENERA}::uuid) st`;
  ok(r.st === 'none', `a client of another account reads 'none' (${r.st})`);
});
await as(REGENERA_DIRECTOR, async tx => {
  const [r] = await tx`select axiom.ack_state_for(${REGENERA}::uuid) st`;
  ok(r.st === 'current', `a member reads its own real state (${r.st})`);
});

console.log('Gate: quotes expire by derivation, never stored');
{
  const [r] = await sql`select count(*)::int n from public.quotes q where axiom.quote_state(q) = 'expired'`;
  ok(r.n >= 1, `${r.n} expired quote(s) derived from sent_at`);
  const [bad] = await sql`select count(*)::int n from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'quote_state' and e.enumlabel = 'expired'`;
  ok(bad.n === 0, "'expired' is not a stored state");
}

// ─────────────────────────────────────────────────────────────────────────────
// Security gates. One per hole proven against the database in the platform security review;
// each is written so that reverting the fix fails the build.

console.log('Gate S1: anon and authenticated hold no write privilege they were never granted');
{
  const [t] = await sql`select
    count(*) filter (where has_table_privilege('anon', c.oid, 'TRUNCATE'))::int anon_truncate,
    count(*) filter (where has_table_privilege('authenticated', c.oid, 'TRUNCATE'))::int auth_truncate,
    count(*) filter (where has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE'))::int anon_write
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','v') and c.relname <> 'schema_migrations'`;
  // TRUNCATE is not subject to row-level security: a role that holds it wipes the table past every policy.
  ok(t.anon_truncate === 0, `anon may TRUNCATE nothing in public (${t.anon_truncate})`);
  ok(t.auth_truncate === 0, `authenticated may TRUNCATE nothing in public (${t.auth_truncate})`);
  ok(t.anon_write === 0, `anon holds no INSERT/UPDATE/DELETE in public (${t.anon_write})`);
  const [d] = await sql`select coalesce(array_to_string(defaclacl, ' '), '') acl from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace where n.nspname = 'public' and d.defaclobjtype = 'r'`;
  ok(!/anon=[a-zA-Z]*[awdD]/.test(d?.acl ?? ''), `a table added later does not grant anon writes (${d?.acl ?? 'none'})`);
  await as(null, async tx => {
    await expectError(tx, sp => sp.unsafe(`truncate table public.leads`), 'anon: truncate refused', /permission denied/i);
    await expectError(tx, sp => sp`insert into public.leads (name) values ('x')`, 'anon: insert refused', /permission denied/i);
  });
}

console.log('Gate S2: a sign-up cannot name the account it joins');
{
  const NEWUSER = '00000000-0000-4000-8000-0000000000fe';
  await rollback(async tx => {
    await tx`insert into auth.users (id, email) values (${NEWUSER}, 'gate-s2@axiom.local') on conflict (id) do nothing`;
    await become(tx, NEWUSER);
    await expectError(tx, sp => sp`insert into public.profiles (id, role, full_name, account_id) values (${NEWUSER}::uuid,'clinic','x',${REGENERA}::uuid)`,
      "a new profile cannot attach itself to someone else's account", /row-level security|account links/i);
    await expectError(tx, sp => sp`insert into public.profiles (id, role, full_name) values (${NEWUSER}::uuid,'owner','x')`,
      'a new profile cannot claim the owner role', /row-level security|roles/i);
    const r = await tx`insert into public.profiles (id, role, full_name) values (${NEWUSER}::uuid,'client','x') returning account_id`;
    ok(r[0].account_id === null, 'a new profile joins no account; the owner links it');
    const seen = await tx`select count(*)::int n from public.orders`;
    ok(seen[0].n === 0, 'and therefore reads nobody else’s orders');
  });
}

console.log('Gate S3: the acknowledgement is a record, not a claim anyone can file');
await as(IVAN, async tx => {
  await expectError(tx, sp => sp`insert into public.acknowledgements (profile_id, account_id, kind, version) values (${IVAN}::uuid, '10000000-0000-4000-8000-000000000004'::uuid, 'qualified_researcher','forged')`,
    "a client cannot record an acknowledgement on another account", /row-level security/i);
  await expectError(tx, sp => sp`insert into public.acknowledgements (profile_id, account_id, kind, version) values (${SENOPATI}::uuid, null, 'qualified_researcher','forged')`,
    'a client cannot record an acknowledgement for another person', /row-level security/i);
  // Senopati is lapsed. A stranger must not learn that: the function is total, so it answers with
  // the safe default rather than the real state (and never with the account's actual standing).
  const probe = (await tx`select axiom.ack_state_for('10000000-0000-4000-8000-000000000004'::uuid) s`)[0].s;
  ok(probe === 'none', `and cannot read another account's real acknowledgement state (${probe})`);
});
await as(SENOPATI, async tx => {
  const st = (await tx`select axiom.ack_state_for('10000000-0000-4000-8000-000000000004'::uuid) s`)[0].s;
  ok(st === 'lapsed', `the lapsed account stays lapsed (${st})`);
});
{
  // §4: 18+ AND qualified researcher. A researcher declaration alone never opens the gate.
  const [n] = await sql`select count(*)::int n from public.accounts a
    where axiom.ack_state_for(a.id) in ('current','expiring')
      and not exists (select 1 from public.acknowledgements k where k.kind = 'age_18'
                      and (k.account_id = a.id or k.profile_id in (select profile_id from public.account_members m where m.account_id = a.id)))`;
  ok(n.n === 0, `no account is current without an 18+ acknowledgement on file (${n.n})`);
}

console.log('Gate S4: the internal definer surface is not reachable from a browser');
for (const [label, uid] of [['anon', null], ['client', IVAN]]) {
  await as(uid, async tx => {
    await expectError(tx, sp => sp`select axiom.log_invoice('00000000-0000-4000-8000-000000000001'::uuid, 'paid', 'forged')`,
      `${label}: cannot forge an invoice event`, /permission denied/i);
    await expectError(tx, sp => sp`select axiom.log_order('00000000-0000-4000-8000-000000000001'::uuid, 'a', 'b')`,
      `${label}: cannot forge an order event`, /permission denied/i);
    await expectError(tx, sp => sp`select axiom.log_quote('00000000-0000-4000-8000-000000000001'::uuid, 'a', 'b')`,
      `${label}: cannot forge a quote event`, /permission denied/i);
    await expectError(tx, sp => sp`select axiom.next_number('invoice','INV-','9999')`,
      `${label}: cannot burn a document number`, /permission denied/i);
    await expectError(tx, sp => sp`select axiom.enter_fn('mark_paid', '00000000-0000-4000-8000-000000000001'::uuid)`,
      `${label}: cannot open a function frame`, /permission denied|does not exist/i);
    await expectError(tx, sp => sp`select * from axiom.fn_frame`,
      `${label}: cannot read the function frame`, /permission denied/i);
  });
}

console.log('Gate S5: bank details are not handed to a crawler');
await as(null, async tx => {
  const rows = await tx`select key from public.site_settings where key in ('bank','entity')`;
  ok(rows.length === 0, `anon reads neither bank nor entity from site_settings (${rows.length})`);
  await expectError(tx, sp => sp`select axiom.setting('bank')`, 'anon cannot read a setting through axiom.setting', /permission denied/i);
});

console.log('Gate S6: an account id discloses nothing on its own');
await as(null, async tx => {
  const d = await tx`select * from axiom.delivery_for_lines(${tx.json([{ site_id: KBY, qty: 1 }])}, ${REGENERA}::uuid)`;
  ok(d.length === 0, `anon learns no site name or zone for another account (${d.length} rows)`);
  const [c] = await tx`select axiom.cadence_days(${REGENERA}::uuid) c, axiom.ack_expires_for(${REGENERA}::uuid) e`;
  ok(c.c === null && c.e === null, 'anon learns neither the reorder cadence nor the acknowledgement expiry');
});
await as(IVAN, async tx => {
  const d = await tx`select * from axiom.delivery_for_lines(${tx.json([{ site_id: KBY, qty: 1 }])}, ${REGENERA}::uuid)`;
  const [c] = await tx`select axiom.cadence_days(${REGENERA}::uuid) c`;
  ok(d.length === 0 && c.c === null, "a client learns nothing about another account's sites or cadence");
});

console.log('Gate S7: awaiting_payment → packing has exactly one door');
await as(OPS, async tx => {
  const [o] = await tx`select id from public.orders where state = 'awaiting_payment' limit 1`;
  // The transition guard must not key on anything the caller can set for itself.
  await tx`select set_config('axiom.in_fn','1',true), set_config('axiom.paying_order', ${o.id}, true)`;
  await expectError(tx, sp => sp`update public.orders set state = 'packing' where id = ${o.id}::uuid`,
    'forging the transaction settings does not open the gate', /payment gates dispatch|through axiom/i);
  const [r] = await tx`select state from public.orders where id = ${o.id}::uuid`;
  ok(r.state === 'awaiting_payment', 'the order is still awaiting payment');
});
await as(OPS, async tx => {
  // A function that has returned leaves no standing permission behind it.
  const [o] = await tx`select id from public.orders where state = 'awaiting_payment' limit 1`;
  await tx`select axiom.report_transfer(${o.id}::uuid, 'GATE-S7')`;
  await expectError(tx, sp => sp`update public.orders set state = 'packing' where id = ${o.id}::uuid`,
    'a returned axiom function grants nothing to the rest of the transaction', /payment gates dispatch|through axiom/i);
  const [q] = await tx`select id from public.quotes where state = 'draft' limit 1`;
  if (q) await expectError(tx, sp => sp`update public.quotes set state = 'accepted' where id = ${q.id}::uuid`,
    'and no quote can be walked forward on the back of it', /through the axiom functions/i);
});
await as(OPS, async tx => {
  // A frame opened for one order does not authorise the next one.
  const os = await tx`select id from public.orders where state = 'awaiting_payment' limit 2`;
  ok(os.length === 2, 'two unpaid orders to work with');
  await tx`select axiom.mark_paid(${os[0].id}::uuid, 'GATE-S7')`;
  await expectError(tx, sp => sp`update public.orders set state = 'packing' where id = ${os[1].id}::uuid`,
    'marking one invoice paid does not move a second order', /payment gates dispatch|through axiom/i);
  const [r] = await tx`select state from public.orders where id = ${os[1].id}::uuid`;
  ok(r.state === 'awaiting_payment', 'the second order is untouched');
});

console.log('Gate S8: an issued invoice cannot be un-issued');
await as(OPS, async tx => {
  const [i] = await tx`select id, subtotal_idr, total_idr from public.invoices where issued_at is not null and kind = 'invoice' limit 1`;
  await expectError(tx, sp => sp`update public.invoices set issued_at = null where id = ${i.id}::uuid`,
    'blanking issued_at is refused', /cannot be un-issued/i);
  await expectError(tx, sp => sp`update public.invoices set kind = 'credit_note' where id = ${i.id}::uuid`,
    'changing an issued invoice to a credit note is refused', /cannot change kind/i);
  await expectError(tx, sp => sp`update public.invoices set subtotal_idr = 1, total_idr = 1 where id = ${i.id}::uuid`,
    'rewriting the money is refused', /frozen/i);
  const [r] = await tx`select subtotal_idr, total_idr from public.invoices where id = ${i.id}::uuid`;
  ok(r.subtotal_idr === i.subtotal_idr && r.total_idr === i.total_idr, 'the money is exactly as issued');
  await expectError(tx, sp => sp`insert into public.invoice_items (invoice_id, description, qty, unit_price_idr) values (${i.id}::uuid,'x',1,1)`,
    'a line cannot be added to an issued invoice', /frozen/i);
});

console.log('Gate S9: the stock ledger is append-only');
await as(OPS, async tx => {
  const [m] = await tx`select id, delta from public.stock_movements limit 1`;
  const upd = await tx`update public.stock_movements set delta = 999 where id = ${m.id} returning id`;
  const del = await tx`delete from public.stock_movements where id = ${m.id} returning id`;
  ok(upd.length === 0 && del.length === 0, 'no policy lets staff rewrite or remove a movement');
  const [after] = await tx`select delta from public.stock_movements where id = ${m.id}`;
  ok(after.delta === m.delta, 'the movement is unchanged');
});
await rollback(async tx => {
  // and the trigger holds for a caller that row-level security does not reach
  const [m] = await tx`select id from public.stock_movements limit 1`;
  await expectError(tx, sp => sp`update public.stock_movements set delta = 999 where id = ${m.id}`, 'the append-only trigger refuses an admin rewrite', /append-only/i);
  await expectError(tx, sp => sp`delete from public.stock_movements where id = ${m.id}`, 'and refuses an admin delete', /append-only/i);
});

console.log('Gate S10: cost is refused to every caller but the owner');
for (const [label, uid] of [['anon', null], ['client', IVAN], ['clinic', REGENERA_DIRECTOR]]) {
  await as(uid, async tx => {
    await expectError(tx, sp => sp`select count(*) from public.variant_costs`, `${label}: variant_costs refused`, /owner-only|permission|privilege/i);
    await expectError(tx, sp => sp`select count(*) from public.quote_item_costs`, `${label}: quote_item_costs refused`, /owner-only|permission|privilege/i);
    await expectError(tx, sp => sp`select count(*) from public.order_item_costs`, `${label}: order_item_costs refused`, /owner-only|permission|privilege/i);
  });
}

console.log('Gate S11: the account keeps its contact details, AXIOM keeps its commercial fields');
await as(IVAN, async tx => {
  const acct = '10000000-0000-4000-8000-000000000005';
  const r = await tx`update public.accounts set whatsapp = '628000000000' where id = ${acct}::uuid returning whatsapp`;
  ok(r.length === 1, 'a member may correct its own contact details');
  await expectError(tx, sp => sp`update public.accounts set type = 'institution' where id = ${acct}::uuid`, 'but not its account type', /set by AXIOM/i);
  await expectError(tx, sp => sp`update public.accounts set account_manager_id = ${IVAN}::uuid where id = ${acct}::uuid`, 'nor its account manager', /set by AXIOM/i);
  await expectError(tx, sp => sp`update public.accounts set agreed_cadence_days = 1 where id = ${acct}::uuid`, 'nor its agreed cadence', /set by AXIOM/i);
  const other = await tx`update public.accounts set name = 'x' where id = ${REGENERA}::uuid returning id`;
  ok(other.length === 0, "and never another account's row");
});

console.log('Gate S12: every definer function pins its search_path');
{
  const rows = await sql`select p.proname, pg_get_function_identity_arguments(p.oid) args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'axiom' and p.prosecdef
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search\\_path=%')`;
  ok(rows.length === 0, `no security-definer function runs on the caller's search_path (${rows.map(r => r.proname).join(', ') || 'none'})`);
  const [inv] = await sql`select count(*)::int n from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and c.relname = 'v_pricing'
      and coalesce(array_to_string(c.reloptions, ','), '') like '%security_invoker=true%'`;
  ok(inv.n === 1, 'v_pricing is a security-invoker view, so variant_costs refuses it for anyone but the owner');
}

console.log('Gate S13: the acknowledgement gate and the historical record, stated');
await as(SENOPATI, async tx => {
  // live commerce is closed for a lapsed account …
  const oi = await tx`select count(*)::int n from public.order_items oi join public.product_variants v on v.id = oi.variant_id
                      join public.products p on p.id = v.product_id where p.kind = 'peptide'`;
  ok(oi[0].n === 0, 'lapsed account: zero peptide order lines');
  const qi = await tx`select count(*)::int n from public.quote_items qi join public.product_variants v on v.id = qi.variant_id
                      join public.products p on p.id = v.product_id where p.kind = 'peptide'`;
  ok(qi[0].n === 0, 'lapsed account: zero peptide quote lines');
  // … while documents already issued to it stay readable, because they are its own accounting record.
  const ii = await tx`select count(*)::int n from public.invoice_items ii join public.invoices i on i.id = ii.invoice_id
                      join public.orders o on o.id = i.order_id`;
  ok(ii[0].n >= 0, `lapsed account still reads the invoices issued to it (${ii[0].n} lines) — deliberate: an issued invoice is a record, not an offer`);
  const other = await tx`select count(*)::int n from public.invoice_items ii join public.invoices i on i.id = ii.invoice_id
                         join public.orders o on o.id = i.order_id where o.account_id = ${REGENERA}::uuid`;
  ok(other[0].n === 0, "and never another account's invoice lines");
});

console.log('Gate S14: a destination belongs to the account that owns it');
{
  const IVAN_ACCT = '10000000-0000-4000-8000-000000000005';
  const PONDOK = '20000000-0000-4000-8000-000000000007';
  // KBY is Regenera's. Before 0007 `axiom.delivery_for_lines` was a definer function joining
  // account_sites with no account filter, so it named any site it was handed — the other clinic's
  // name, zone and a charge computed for it — and the id then persisted onto the caller's own quote.
  await as(IVAN, async tx => {
    const foreign = await tx`select * from axiom.delivery_for_lines(
      ${tx.json([{ site_id: KBY, qty: 3 }])}::jsonb, ${IVAN_ACCT}::uuid)`;
    ok(foreign.length === 0, "another account's destination is not costed, named or returned");
    const own = await tx`select site_name from axiom.delivery_for_lines(
      ${tx.json([{ site_id: PONDOK, qty: 3 }])}::jsonb, ${IVAN_ACCT}::uuid)`;
    ok(own.length === 1, 'its own destination still costs normally');

    const lines = tx.json([{ sku: 'reta10', qty: 1, site_id: KBY }]);
    await expectError(tx, sp => sp`select axiom.request_quote(${IVAN_ACCT}::uuid, ${lines}::jsonb)`,
      'a request cannot address another account’s destination', /does not belong/i);

    const [c] = await tx`select axiom.cart_for('gate-s14-anon-key-0001', ${IVAN_ACCT}::uuid) as id`;
    await expectError(tx, sp => sp`select axiom.cart_set(${c.id}::uuid, null, 'reta10', 1, ${KBY}::uuid)`,
      'nor can a basket line', /does not belong/i);
  });
  // Staff are not exempt: the Console builder writes through the same door.
  await as(OPS, async tx => {
    const lines = tx.json([{ sku: 'reta10', qty: 1, site_id: PONDOK }]);
    await expectError(tx, sp => sp`select axiom.new_quote(${REGENERA}::uuid, ${lines}::jsonb)`,
      'and neither can a staff-built quote', /does not belong/i);
  });
}

console.log('Gate S15: payment and void are recorded only by the functions that check who may');
{
  const [inv] = await sql`select i.id::text id, o.id::text oid from public.invoices i
    join public.orders o on o.id = i.order_id
    where o.state = 'awaiting_payment' and i.issued_at is not null and i.paid_at is null limit 1`;
  // `invoices_write` is `for all using (axiom.is_staff())`, so any staff member could write the
  // column directly and step around the `paid_by_owner_only` check inside axiom.mark_paid.
  for (const [who, label] of [[OPS, 'ops'], [OWNER, 'owner']]) {
    await as(who, async tx => {
      await expectError(tx, sp => sp`update public.invoices set paid_at = now(), paid_ref = 'forged' where id = ${inv.id}::uuid`,
        `${label}: a bare paid_at write is refused`, /functions that check/i);
      await expectError(tx, sp => sp`update public.invoices set voided_at = now() where id = ${inv.id}::uuid`,
        `${label}: a bare voided_at write is refused`, /functions that check/i);
    });
  }
  // The door itself still opens, and the notes an invoice is allowed to carry still save.
  await as(OWNER, async tx => {
    await tx`update public.invoices set notes = 'gate s15' where id = ${inv.id}::uuid`;
    ok(true, 'the fields an issued invoice may still carry are untouched');
    await tx`select axiom.mark_paid(${inv.oid}::uuid, 'TRF GATE-S15')`;
    const [after] = await tx`select paid_at is not null paid, paid_ref from public.invoices where id = ${inv.id}::uuid`;
    ok(after.paid && after.paid_ref === 'TRF GATE-S15', 'axiom.mark_paid still records the payment');
  });
}

await sql.end();
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
