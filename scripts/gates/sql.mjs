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

// Run fn as a caller inside a transaction that is always rolled back.
async function as(uid, fn) {
  const claims = uid ? JSON.stringify({ sub: uid, role: 'authenticated' }) : '{}';
  let result;
  try {
    await sql.begin(async tx => {
      await tx.unsafe(`set local role ${uid ? 'authenticated' : 'anon'}`);
      await tx.unsafe(`select set_config('request.jwt.claims', '${claims}', true)`);
      result = await fn(tx);
      throw new Rollback();
    });
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
  const pv = await tx`select id from public.product_variants`;
  ok(pv.every(() => true) && pv.length === 8, `anon reads only the 8 non-peptide variant rows directly (${pv.length})`);
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
  const split = await sql`select * from axiom.delivery_for_lines(${sql.json([{ site_id: KBY, qty: 1 }, { site_id: KMG, qty: 1 }, { site_id: KBY, qty: 1 }])}, ${REGENERA}::uuid)`;
  ok(split.reduce((a, r) => a + Number(r.charge_idr), 0) === 200000 && split.length === 2, 'two lines to one site count as one consignment');
  const three = await sql`select * from axiom.delivery_for_lines(${sql.json([{ site_id: KBY, qty: 1 }, { site_id: KMG, qty: 1 }, { site_id: BDG, qty: 1 }])}, ${REGENERA}::uuid)`;
  ok(three.some(r => r.charge_idr === null), 'a Bandung line is rate pending');
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

console.log('Gate: quotes expire by derivation, never stored');
{
  const [r] = await sql`select count(*)::int n from public.quotes q where axiom.quote_state(q) = 'expired'`;
  ok(r.n >= 1, `${r.n} expired quote(s) derived from sent_at`);
  const [bad] = await sql`select count(*)::int n from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'quote_state' and e.enumlabel = 'expired'`;
  ok(bad.n === 0, "'expired' is not a stored state");
}

await sql.end();
console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
