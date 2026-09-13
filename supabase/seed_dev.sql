-- AXIOM platform — development fixtures. Local and preview only, never production.
-- Staff, accounts, sites, acknowledgements and stock; then quotes and orders created through the
-- domain functions as the owner, so every seeded state is one the rules would produce.

-- users (the local auth stub table; on Supabase these rows are created by Auth and adopted here)
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'owner@axiom.local'),
  ('00000000-0000-4000-8000-000000000002', 'ops@axiom.local'),
  ('00000000-0000-4000-8000-000000000011', 'regenera.director@axiom.local'),
  ('00000000-0000-4000-8000-000000000012', 'regenera.nurse@axiom.local'),
  ('00000000-0000-4000-8000-000000000013', 'prasetyo@axiom.local'),
  ('00000000-0000-4000-8000-000000000014', 'aksara@axiom.local'),
  ('00000000-0000-4000-8000-000000000015', 'senopati@axiom.local'),
  ('00000000-0000-4000-8000-000000000016', 'ivan@axiom.local'),
  ('00000000-0000-4000-8000-000000000017', 'longa@axiom.local')
on conflict (id) do nothing;

insert into public.accounts (id, name, type, whatsapp, agreed_cadence_days, created_at) values
  ('10000000-0000-4000-8000-000000000001', 'Klinik Regenera',  'clinic',      '628120000001', 21, now() - interval '9 months'),
  ('10000000-0000-4000-8000-000000000002', 'Dr. Prasetyo Lab', 'institution', '628120000002', 14, now() - interval '12 months'),
  ('10000000-0000-4000-8000-000000000003', 'Aksara Recovery',  'clinic',      '628120000003', 30, now() - interval '6 months'),
  ('10000000-0000-4000-8000-000000000004', 'Klinik Senopati',  'clinic',      '628120000004', 21, now() - interval '14 months'),
  ('10000000-0000-4000-8000-000000000005', 'Ivan Wijaya',      'individual',  '628120000005', 30, now() - interval '4 months'),
  ('10000000-0000-4000-8000-000000000006', 'Studio Longa',     'clinic',      '628120000006', null, now() - interval '1 month');

insert into public.profiles (id, account_id, role, full_name, locale) values
  ('00000000-0000-4000-8000-000000000001', null, 'owner', 'Aero', 'en'),
  ('00000000-0000-4000-8000-000000000002', null, 'ops',   'Nadia', 'id'),
  ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'clinic', 'dr. Ratna (Direktur)', 'id'),
  ('00000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'clinic', 'Sari (Perawat)', 'id'),
  ('00000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000002', 'clinic', 'Dr. Prasetyo', 'en'),
  ('00000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000003', 'clinic', 'Aksara Recovery', 'id'),
  ('00000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000004', 'clinic', 'Klinik Senopati', 'id'),
  ('00000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000005', 'client', 'Ivan Wijaya', 'id'),
  ('00000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000006', 'clinic', 'Studio Longa', 'id');

update public.accounts set account_manager_id = '00000000-0000-4000-8000-000000000001' where id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002');
update public.accounts set account_manager_id = '00000000-0000-4000-8000-000000000002' where id in ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000006');

insert into public.account_members (account_id, profile_id, is_primary) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', true),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', false),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000013', true),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000014', true),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000015', true),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000016', true),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000017', true);

insert into public.account_sites (id, account_id, name, address, zone, is_default, sort) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Kebayoran', 'Jl. Senopati Raya 12, Kebayoran Baru, Jakarta Selatan', 'jabodetabek', true, 1),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Kemang', 'Jl. Kemang Raya 45, Jakarta Selatan', 'jabodetabek', false, 2),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Bandung', 'Jl. Riau 8, Bandung', 'jawa', false, 3),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'Menteng', 'Jl. Cik Di Tiro 21, Menteng, Jakarta Pusat', 'jabodetabek', true, 1),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'Sanur', 'Jl. Danau Tamblingan 60, Sanur, Bali', 'luar_jawa', true, 1),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000004', 'Senopati', 'Jl. Suryo 30, Jakarta Selatan', 'jabodetabek', true, 1),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000005', 'Pondok Indah', 'Jl. Metro Pondok Indah 5, Jakarta Selatan', 'jabodetabek', true, 1),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000006', 'Cilandak', 'Jl. Cilandak Tengah 3, Jakarta Selatan', 'jabodetabek', true, 1);

-- acknowledgements: current / expiring (11th month) / lapsed / none
insert into public.acknowledgements (profile_id, account_id, kind, version, acknowledged_at) values
  ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'age_18', '2026-09', now() - interval '8 months'),
  ('00000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'qualified_researcher', '2026-09', now() - interval '8 months'),
  ('00000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000002', 'age_18', '2026-09', now() - interval '11 months' - interval '10 days'),
  ('00000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000002', 'qualified_researcher', '2026-09', now() - interval '11 months' - interval '10 days'),
  ('00000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000003', 'age_18', '2026-09', now() - interval '5 months'),
  ('00000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000003', 'qualified_researcher', '2026-09', now() - interval '5 months'),
  ('00000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000004', 'age_18', '2025-07', now() - interval '13 months'),
  ('00000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000004', 'qualified_researcher', '2025-07', now() - interval '13 months'),
  ('00000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000005', 'age_18', '2026-09', now() - interval '4 months'),
  ('00000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000005', 'qualified_researcher', '2026-09', now() - interval '4 months'),
  ('00000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000006', 'age_18', '2026-09', now() - interval '20 days');

-- The rest runs as the owner so the functions accept it.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- stock intake: a spread across the book, a few deliberate stockouts and low lines
insert into public.stock_movements (variant_id, delta, reason, ref, actor_id)
select v.id,
       case v.sku when 'tb500' then 0 when 'ta1' then 0 when 'epi50' then 0 when 'mat' then 2 when 'legs' then 3 when 'mask' then 4
                  when 'reta30' then 6 when 'reta60' then 2 when 'tirz40' then 5 when 'ipatesa18' then 3 when 'huma10' then 3 when 'duffel' then 9
                  else case when p.kind = 'peptide' then 6 + (v.sort * 7) % 22 else 20 + (v.sort * 5) % 40 end end,
       'intake', 'Opening stock', '00000000-0000-4000-8000-000000000001'
from public.product_variants v join public.products p on p.id = v.product_id
where v.sku not in ('tb500','ta1','epi50');

-- Fixtures age the record after the fact: every state below was produced by the real functions and
-- only the clock is moved. Migration 0007 froze `paid_at` on an issued invoice behind the frame the
-- domain functions open, so the backdating names itself the same way instead of writing the column
-- bare. Session-local, and gone when the seed's connection closes.
create function pg_temp.backdate_invoices(ord uuid, issued timestamptz, due timestamptz, paid timestamptz) returns void
language plpgsql as $fn$
declare iv uuid;
begin
  for iv in select id from public.invoices where order_id = ord loop
    perform axiom.enter_fn('invoice', iv);
    update public.invoices set issued_at = issued, due_at = due, paid_at = paid where id = iv;
    perform axiom.leave_fn();
  end loop;
end $fn$;

-- quotes and orders through the spine
do $$
declare q uuid; o uuid; reg uuid := '10000000-0000-4000-8000-000000000001'; pra uuid := '10000000-0000-4000-8000-000000000002';
        aks uuid := '10000000-0000-4000-8000-000000000003'; sen uuid := '10000000-0000-4000-8000-000000000004';
        ivan uuid := '10000000-0000-4000-8000-000000000005'; lon uuid := '10000000-0000-4000-8000-000000000006';
        kby uuid := '20000000-0000-4000-8000-000000000001'; kmg uuid := '20000000-0000-4000-8000-000000000002';
begin
  -- Regenera: three delivered orders (cadence can be derived), one awaiting payment, one packing, one sent quote
  q := axiom.new_quote(reg, jsonb_build_array(jsonb_build_object('sku','reta10','qty',2,'site_id',kby), jsonb_build_object('sku','bpc10','qty',1,'site_id',kby)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.mark_paid(o, 'TRF 2607-0117'); perform axiom.advance_order(o, 'Paxel', 'PX-0117'); perform axiom.advance_order(o);
  update public.orders set placed_at = now() - interval '54 days', delivered_at = now() - interval '52 days' where id = o;
  perform pg_temp.backdate_invoices(o, now() - interval '54 days', now() - interval '47 days', now() - interval '54 days');

  q := axiom.new_quote(reg, jsonb_build_array(jsonb_build_object('sku','ghk100','qty',2,'site_id',kby), jsonb_build_object('sku','mask','qty',1,'site_id',kby)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.mark_paid(o, 'TRF 2608-0128'); perform axiom.advance_order(o, 'Paxel', 'PX-0128'); perform axiom.advance_order(o);
  update public.orders set placed_at = now() - interval '35 days', delivered_at = now() - interval '33 days' where id = o;
  perform pg_temp.backdate_invoices(o, now() - interval '35 days', now() - interval '28 days', now() - interval '35 days');

  q := axiom.new_quote(reg, jsonb_build_array(jsonb_build_object('sku','reta10','qty',1,'site_id',kby), jsonb_build_object('sku','bpc10','qty',2,'site_id',kby), jsonb_build_object('sku','cjc10','qty',1,'site_id',kby), jsonb_build_object('sku','tee','qty',2,'site_id',kby)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q);
  update public.orders set placed_at = now() - interval '19 days' where id = o;
  update public.invoices set issued_at = now() - interval '19 days', due_at = now() - interval '12 days' where order_id = o;   -- overdue

  q := axiom.new_quote(reg, jsonb_build_array(jsonb_build_object('sku','reta10','qty',2,'site_id',kby), jsonb_build_object('sku','bpc10','qty',2,'site_id',kby), jsonb_build_object('sku','ghk100','qty',1,'site_id',kmg), jsonb_build_object('sku','tee','qty',2,'site_id',kmg)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.mark_paid(o, 'TRF 2609-0148');
  update public.orders set placed_at = now() - interval '2 days' where id = o;

  q := axiom.new_quote(reg, jsonb_build_array(jsonb_build_object('sku','reta10','qty',2,'site_id',kby), jsonb_build_object('sku','bpc10','qty',2,'site_id',kby), jsonb_build_object('sku','ghk100','qty',1,'site_id',kmg)));
  perform axiom.send_quote(q);
  update public.quotes set sent_at = now() - interval '3 days' where id = q;

  -- Prasetyo: two delivered, one dispatched, one draft
  q := axiom.new_quote(pra, jsonb_build_array(jsonb_build_object('sku','bpc10','qty',2)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.mark_paid(o, 'TRF 2608-0096'); perform axiom.advance_order(o, 'Paxel', 'PX-0096'); perform axiom.advance_order(o);
  update public.orders set placed_at = now() - interval '33 days', delivered_at = now() - interval '31 days' where id = o;
  perform pg_temp.backdate_invoices(o, now() - interval '33 days', now() - interval '26 days', now() - interval '33 days');
  q := axiom.new_quote(pra, jsonb_build_array(jsonb_build_object('sku','cjc10','qty',2), jsonb_build_object('sku','kpv10','qty',1)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.mark_paid(o, 'TRF 2608-0102'); perform axiom.advance_order(o, 'Paxel', 'PX-0102'); perform axiom.advance_order(o);
  update public.orders set placed_at = now() - interval '19 days', delivered_at = now() - interval '17 days' where id = o;
  perform pg_temp.backdate_invoices(o, now() - interval '19 days', now() - interval '12 days', now() - interval '19 days');
  q := axiom.new_quote(pra, jsonb_build_array(jsonb_build_object('sku','bpc10','qty',3), jsonb_build_object('sku','cjc10','qty',1)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.mark_paid(o, 'TRF 2609-0147'); perform axiom.advance_order(o, 'Paxel', 'PX-0147');
  update public.orders set placed_at = now() - interval '5 days' where id = o;
  q := axiom.new_quote(pra, jsonb_build_array(jsonb_build_object('sku','cjc20','qty',1), jsonb_build_object('sku','bpc10','qty',3)));

  -- Aksara (Bali, rate pending): a request the Console has yet to price
  perform axiom.request_quote(aks, jsonb_build_array(jsonb_build_object('sku','mots10','qty',2), jsonb_build_object('sku','nad500','qty',1)));

  -- Senopati (lapsed): apparel only, one awaiting payment and one cancelled
  q := axiom.new_quote(sen, jsonb_build_array(jsonb_build_object('sku','tee','qty',3), jsonb_build_object('sku','hoodie','qty',2)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q);
  update public.orders set placed_at = now() - interval '7 days' where id = o;
  update public.invoices set issued_at = now() - interval '7 days', due_at = now() + interval '0 days' where order_id = o;
  q := axiom.new_quote(sen, jsonb_build_array(jsonb_build_object('sku','cap','qty',4)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.cancel_order(o, 'Client cancelled');
  update public.orders set placed_at = now() - interval '13 days' where id = o;

  -- Ivan: one delivered, one sent quote
  q := axiom.new_quote(ivan, jsonb_build_array(jsonb_build_object('sku','ghk100','qty',2), jsonb_build_object('sku','tee','qty',1)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.mark_paid(o, 'TRF 2608-0145'); perform axiom.advance_order(o, 'Paxel', 'PX-0145'); perform axiom.advance_order(o);
  update public.orders set placed_at = now() - interval '6 days', delivered_at = now() - interval '4 days' where id = o;
  perform pg_temp.backdate_invoices(o, now() - interval '6 days', now() + interval '1 day', now() - interval '6 days');
  q := axiom.new_quote(ivan, jsonb_build_array(jsonb_build_object('sku','ghk50','qty',2)));
  perform axiom.send_quote(q);
  update public.quotes set sent_at = now() - interval '8 days' where id = q;   -- expired, derived

  -- Longa (18+ only): a device delivered, a lost quote
  q := axiom.new_quote(lon, jsonb_build_array(jsonb_build_object('sku','legs','qty',1)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.mark_paid(o, 'TRF 2608-0143'); perform axiom.advance_order(o, 'JNE', 'JNE-0143'); perform axiom.advance_order(o);
  update public.orders set placed_at = now() - interval '8 days', delivered_at = now() - interval '6 days' where id = o;
  perform pg_temp.backdate_invoices(o, now() - interval '8 days', now() - interval '1 day', now() - interval '8 days');
  q := axiom.new_quote(lon, jsonb_build_array(jsonb_build_object('sku','mask','qty',1)));
  perform axiom.send_quote(q); perform axiom.mark_quote_lost(q);
end $$;

-- the certificate library: published certificates for a spread of lots (the sample itself is seeded
-- by seed.sql); one filed but unpublished, so the Console has something to publish
insert into public.coa_documents (variant_id, lot_code, file_path, issued_at, method, purity_pct, is_sample, is_public, published_at)
select v.id, c.lot, 'coa/' || v.sku || '-' || lower(c.lot) || '.pdf', now()::date - c.age, 'HPLC / MS', c.purity, false, c.pub, case when c.pub then now() - make_interval(days => c.age) end
from (values ('reta10', 'AX-2607-RETA10', 62, 99.4, true), ('reta20', 'AX-2607-RETA20', 62, 99.1, true), ('tirz10', 'AX-2608-TIRZ10', 40, 98.9, true),
             ('ghk100', 'AX-2608-GHK100', 38, 99.6, true), ('cjc10', 'AX-2609-CJC10', 12, 99.0, true), ('mots10', 'AX-2609-MOTS10', 9, 98.7, true),
             ('nad500', 'AX-2609-NAD500', 4, 99.3, false)) as c(sku, lot, age, purity, pub)
join public.product_variants v on v.sku = c.sku;

-- two plans through the spine: Regenera on Retatrutide every 30 days, paid twice and due now;
-- Ivan on GHK-Cu every 60 days, paused. Both begin as a paid order carrying the plan.
do $$
declare q uuid; o uuid; s uuid; reg uuid := '10000000-0000-4000-8000-000000000001'; ivan uuid := '10000000-0000-4000-8000-000000000005';
        kby uuid := '20000000-0000-4000-8000-000000000001';
begin
  q := axiom.new_quote(reg, jsonb_build_array(jsonb_build_object('sku','reta20','qty',1,'site_id',kby,'interval_days',30)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.mark_paid(o, 'TRF 2608-0131'); perform axiom.advance_order(o, 'Paxel', 'PX-0131'); perform axiom.advance_order(o);
  update public.orders set placed_at = now() - interval '33 days', delivered_at = now() - interval '31 days' where id = o;
  perform pg_temp.backdate_invoices(o, now() - interval '33 days', now() - interval '26 days', now() - interval '33 days');
  select id into s from public.subscriptions where account_id = reg and last_order_id = o;
  update public.subscriptions set started_at = now() - interval '33 days', next_due_at = now() - interval '3 days' where id = s;

  q := axiom.new_quote(ivan, jsonb_build_array(jsonb_build_object('sku','ghk100','qty',1,'interval_days',60)));
  perform axiom.send_quote(q); o := axiom.accept_quote(q); perform axiom.mark_paid(o, 'TRF 2608-0146'); perform axiom.advance_order(o, 'Paxel', 'PX-0146'); perform axiom.advance_order(o);
  update public.orders set placed_at = now() - interval '20 days', delivered_at = now() - interval '18 days' where id = o;
  perform pg_temp.backdate_invoices(o, now() - interval '20 days', now() - interval '13 days', now() - interval '20 days');
  select id into s from public.subscriptions where account_id = ivan and last_order_id = o;
  update public.subscriptions set started_at = now() - interval '20 days', next_due_at = now() + interval '40 days' where id = s;
  perform axiom.subscription_pause(s);
end $$;

select set_config('request.jwt.claims', '', true);
