-- The storefront. Two things the public site could not say before, both settled by the owner:
--
--   1. A line may be bought once or supplied on a plan: every 30, 60 or 90 days, at a percentage
--      off that lives in `site_settings.subscribe_tiers` and nowhere else. The plan rides on the
--      line (basket, quote, order) as `interval_days`; the discount is applied by `send_quote` at
--      the moment prices freeze, and the list price is frozen beside it so every document can show
--      what was taken off. `unit_price_idr` stays the net price, so every total, invoice, cost
--      snapshot and gate that reads it is untouched.
--   2. A paid plan line becomes a `subscription`: one row per account, lot and destination with a
--      next-due date. AXIOM raises the next quote from it (one per period, never two), the client
--      accepts and pays as for any order, and payment advances the date. Skip, pause, resume,
--      cancel and a change of interval are the client's; raising the renewal is AXIOM's. Nothing
--      is charged automatically: the rule "AXIOM is paid before anything is dispatched" holds.
--
-- A plan is for peptides only. A plan on a device or a piece of apparel is refused at the basket.
--
-- The certificate library: a Certificate of Analysis may be published per lot (`is_public`), so
-- the public site can list every certificate AXIOM has chosen to show, not only the sample.

-- ================================================================ 1 · settings
insert into public.site_settings (key, value) values
  ('subscribe_tiers', '{"30":15,"60":12,"90":10}'::jsonb),
  ('renewal_lead_days', '5')
on conflict (key) do nothing;

-- The one place a plan discount is read. Unknown or null interval → 0. Peptides only is enforced
-- by the callers that know the product; this function knows only the tier table.
create or replace function axiom.plan_discount_pct(days int) returns numeric
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  select case when days is null then 0
              else coalesce((axiom.setting('subscribe_tiers') ->> days::text)::numeric, 0) end
$$;

-- The intervals the tier table names, in order, for a UI that must never type them.
create or replace function axiom.plan_intervals() returns table (interval_days int, discount_pct numeric)
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  select (k)::int, (v)::numeric from jsonb_each_text(coalesce(axiom.setting('subscribe_tiers'), '{}'::jsonb)) as e(k, v)
  where k ~ '^\d+$' order by 1
$$;

-- ================================================================ 2 · the plan on a line
alter table public.cart_items  add column if not exists interval_days int check (interval_days in (30, 60, 90));
alter table public.quote_items add column if not exists interval_days int check (interval_days in (30, 60, 90));
alter table public.quote_items add column if not exists list_price_idr bigint;
alter table public.quote_items add column if not exists discount_pct numeric(5,2) not null default 0;
alter table public.order_items add column if not exists interval_days int check (interval_days in (30, 60, 90));
alter table public.order_items add column if not exists list_price_idr bigint;
alter table public.order_items add column if not exists discount_pct numeric(5,2) not null default 0;
alter table public.leads       add column if not exists ruo_declared_at timestamptz;

-- The basket's unique line is now (cart, lot, destination, plan).
drop index if exists public.cart_items_line_uq;
create unique index cart_items_line_uq
  on public.cart_items (cart_id, variant_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(interval_days, 0));

-- A plan on a non-peptide is refused wherever a line is written.
create or replace function axiom.check_plan(vid uuid, plan int) returns int
language plpgsql stable security definer set search_path = public, axiom, pg_catalog as $$
declare k public.product_kind;
begin
  if plan is null then return null; end if;
  if plan not in (30, 60, 90) then raise exception 'unknown delivery plan %', plan using errcode = 'check_violation'; end if;
  select p.kind into k from public.product_variants v join public.products p on p.id = v.product_id where v.id = vid;
  if k is distinct from 'peptide' then
    raise exception 'a delivery plan is available for research compounds only' using errcode = 'check_violation';
  end if;
  return plan;
end $$;

create or replace function axiom.cart_for(anon text, acct uuid default null) returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare cid uuid;
begin
  if acct is not null then
    if not (axiom.is_staff() or axiom.member_of(acct)) then raise insufficient_privilege; end if;
    select id into cid from public.carts where account_id = acct;
    if cid is null then insert into public.carts (account_id) values (acct) returning id into cid; end if;
    -- merge the anonymous basket into the account's on sign-in, plan and all
    if anon is not null then
      insert into public.cart_items (cart_id, variant_id, qty, site_id, interval_days)
      select cid, variant_id, qty, null, interval_days from public.cart_items ci join public.carts c on c.id = ci.cart_id where c.anon_key = anon
      on conflict (cart_id, variant_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(interval_days, 0))
      do update set qty = public.cart_items.qty + excluded.qty;
      delete from public.carts where anon_key = anon;
    end if;
    return cid;
  end if;
  if anon is null or length(anon) < 16 then raise exception 'anonymous basket key required'; end if;
  select id into cid from public.carts where anon_key = anon;
  if cid is null then insert into public.carts (anon_key) values (anon) returning id into cid; end if;
  return cid;
end $$;

drop function if exists axiom.cart_set(uuid, text, text, int, uuid);
create or replace function axiom.cart_set(cid uuid, anon text, sku_or_id text, qty int, site uuid default null, plan int default null) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare vid uuid; ok boolean; acct uuid;
begin
  select (c.anon_key is not null and c.anon_key = anon) or (c.account_id is not null and (axiom.member_of(c.account_id) or axiom.is_staff())),
         c.account_id
    into ok, acct from public.carts c where c.id = cid;
  if not coalesce(ok, false) then raise insufficient_privilege; end if;
  if site is not null then
    if acct is null then raise exception 'an anonymous basket has no destination' using errcode = 'check_violation'; end if;
    perform axiom.site_of(acct, site);
  end if;
  select id into vid from public.product_variants where sku = sku_or_id or id::text = sku_or_id;
  if vid is null then raise exception 'unknown variant %', sku_or_id; end if;
  plan := axiom.check_plan(vid, plan);
  if qty <= 0 then
    delete from public.cart_items where cart_id = cid and variant_id = vid and site_id is not distinct from site and interval_days is not distinct from plan;
  else
    insert into public.cart_items (cart_id, variant_id, qty, site_id, interval_days) values (cid, vid, qty, site, plan)
    on conflict (cart_id, variant_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(interval_days, 0))
    do update set qty = excluded.qty;
  end if;
  update public.carts set updated_at = now() where id = cid;
end $$;

drop function if exists axiom.cart_items_for(uuid, text);
create or replace function axiom.cart_items_for(cid uuid, anon text) returns table (variant_id uuid, sku text, qty int, site_id uuid, interval_days int)
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare ok boolean;
begin
  select (c.anon_key is not null and c.anon_key = anon) or (c.account_id is not null and (axiom.member_of(c.account_id) or axiom.is_staff()))
    into ok from public.carts c where c.id = cid;
  if not coalesce(ok, false) then return; end if;
  return query select ci.variant_id, v.sku, ci.qty, ci.site_id, ci.interval_days
    from public.cart_items ci join public.product_variants v on v.id = ci.variant_id where ci.cart_id = cid order by v.sort, ci.interval_days nulls first;
end $$;

-- The three writers of quote lines read the plan from the same JSON key.
create or replace function axiom.request_quote(acct uuid, lines jsonb, note text default null) returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare qid uuid; x jsonb; vid uuid;
begin
  if not (axiom.is_staff() or axiom.member_of(acct)) then raise insufficient_privilege; end if;
  insert into public.quotes (account_id, state, notes, created_by) values (acct, 'requested', note, auth.uid()) returning id into qid;
  for x in select * from jsonb_array_elements(lines) loop
    select id into vid from public.product_variants where id = nullif(x->>'variant_id','')::uuid or sku = x->>'sku';
    if vid is null then raise exception 'unknown variant %', x; end if;
    insert into public.quote_items (quote_id, variant_id, site_id, qty, interval_days)
    values (qid, vid, axiom.site_of(acct, nullif(x->>'site_id','')::uuid), greatest((x->>'qty')::int, 1),
            axiom.check_plan(vid, nullif(x->>'interval_days','')::int));
  end loop;
  perform axiom.log_quote(qid, 'new', 'requested');
  return qid;
end $$;

create or replace function axiom.save_quote_draft(qid uuid, lines jsonb, note text default null) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare x jsonb; vid uuid; st public.quote_state; acct uuid;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select state, account_id into st, acct from public.quotes where id = qid for update;
  if st not in ('requested','draft') then raise exception 'only a requested or draft quote can be edited' using errcode = 'check_violation'; end if;
  delete from public.quote_items where quote_id = qid;
  for x in select * from jsonb_array_elements(lines) loop
    select id into vid from public.product_variants where id = nullif(x->>'variant_id','')::uuid or sku = x->>'sku';
    if vid is null then raise exception 'unknown variant %', x; end if;
    insert into public.quote_items (quote_id, variant_id, site_id, qty, interval_days)
    values (qid, vid, axiom.site_of(acct, nullif(x->>'site_id','')::uuid), greatest((x->>'qty')::int, 1),
            axiom.check_plan(vid, nullif(x->>'interval_days','')::int));
  end loop;
  perform axiom.enter_fn('quote', qid);
  update public.quotes set notes = coalesce(note, notes), state = 'draft' where id = qid;
  perform axiom.leave_fn();
  if st = 'requested' then perform axiom.log_quote(qid, 'requested', 'draft'); end if;
end $$;

-- Signed out: the same request, plus the reader's own declaration that the material is for
-- research. The formal acknowledgement is still recorded in the account, and `send_quote` still
-- refuses a peptide line without it; the declaration is what the lead carries until then.
drop function if exists axiom.submit_public_request(text, text, text, text, text, jsonb, text, text);
create or replace function axiom.submit_public_request(p_name text, p_clinic text, p_role text, p_email text, p_whatsapp text, lines jsonb, p_locale text default 'id', anon text default null, p_ack boolean default false)
returns table (lead_id uuid, account_id uuid, quote_id uuid, quote_number text)
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare acct uuid; qid uuid; lid uuid; t public.account_type; x jsonb; vid uuid; any_peptide boolean := false;
begin
  if coalesce(p_name,'') = '' or (coalesce(p_email,'') = '' and coalesce(p_whatsapp,'') = '') then
    raise exception 'name and a contact are required' using errcode = 'check_violation';
  end if;
  select bool_or(p.kind = 'peptide') into any_peptide
    from jsonb_array_elements(lines) l join public.product_variants v on v.sku = l->>'sku' join public.products p on p.id = v.product_id;
  if coalesce(any_peptide, false) and not coalesce(p_ack, false) then
    raise exception 'a research-use declaration is required for a research compound' using errcode = 'check_violation';
  end if;
  t := case when coalesce(p_clinic,'') = '' then 'individual' when p_role ilike '%research%' or p_role ilike '%lab%' or p_role ilike '%univers%' then 'institution' else 'clinic' end;
  insert into public.accounts (name, type, whatsapp, email, notes) values (coalesce(nullif(p_clinic,''), p_name), t, p_whatsapp, p_email, 'Unverified · created from the public request form') returning id into acct;
  insert into public.account_sites (account_id, name, is_default) values (acct, 'Primary', true);
  insert into public.leads (name, clinic, role_title, email, whatsapp, source, stage, account_id, ruo_declared_at)
  values (p_name, p_clinic, p_role, p_email, p_whatsapp, 'site', 'new', acct, case when coalesce(p_ack, false) then now() end) returning id into lid;
  perform set_config('axiom.in_fn', '1', true);
  insert into public.quotes (account_id, state, notes) values (acct, 'requested', 'Public request · ' || p_name || coalesce(' · ' || p_role, '')) returning id into qid;
  for x in select * from jsonb_array_elements(lines) loop
    select id into vid from public.product_variants where sku = x->>'sku';
    if vid is null then continue; end if;
    insert into public.quote_items (quote_id, variant_id, qty, interval_days)
    values (qid, vid, greatest((x->>'qty')::int, 1), axiom.check_plan(vid, nullif(x->>'interval_days','')::int));
  end loop;
  insert into public.quote_events (quote_id, actor_label, from_state, to_state) values (qid, p_name, 'new', 'requested');
  update public.leads set quote_id = qid where id = lid;
  if anon is not null then delete from public.carts where anon_key = anon; end if;
  return query select lid, acct, qid, q.number from public.quotes q where q.id = qid;
end $$;

-- Sending freezes the list price, the plan's percentage and the net price it yields, rounded to
-- the nearest thousand rupiah. Everything downstream reads `unit_price_idr` exactly as before.
create or replace function axiom.send_quote(qid uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare q public.quotes; r record; d record; pct numeric; net bigint;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select * into q from public.quotes where id = qid for update;
  if q.state not in ('draft','requested','sent') then raise exception 'quote % cannot be sent from %', q.number, q.state using errcode = 'check_violation'; end if;
  if (select count(*) from public.quote_items where quote_id = qid) = 0 then raise exception 'a quote needs at least one line' using errcode = 'check_violation'; end if;
  for r in select qi.id, qi.qty, qi.variant_id, qi.interval_days, p.kind, p.name, v.dose, v.price_idr, axiom.available(qi.variant_id) as avail,
                  c.supplier_cost_idr, c.pen_cost_idr
           from public.quote_items qi join public.product_variants v on v.id = qi.variant_id join public.products p on p.id = v.product_id
           join public.variant_costs c on c.variant_id = v.id where qi.quote_id = qid loop
    if r.kind = 'peptide' and not axiom.account_has_ack(q.account_id) then
      raise exception 'peptide lines need a current qualified-researcher acknowledgement on the account' using errcode = 'check_violation';
    end if;
    if r.qty > r.avail + (case when q.state = 'sent' then r.qty else 0 end) then
      raise exception '% % : % requested, % available', r.name, r.dose, r.qty, r.avail using errcode = 'check_violation';
    end if;
    pct := case when r.kind = 'peptide' then axiom.plan_discount_pct(r.interval_days) else 0 end;
    net := case when pct > 0 then round(r.price_idr * (1 - pct / 100), -3)::bigint else r.price_idr end;
    update public.quote_items set unit_price_idr = net, list_price_idr = r.price_idr, discount_pct = pct where id = r.id;
    insert into public.quote_item_costs (quote_item_id, unit_supplier_cost_idr, unit_pen_cost_idr)
    values (r.id, r.supplier_cost_idr, r.pen_cost_idr)
    on conflict (quote_item_id) do update set unit_supplier_cost_idr = excluded.unit_supplier_cost_idr, unit_pen_cost_idr = excluded.unit_pen_cost_idr;
  end loop;
  for d in select * from axiom.delivery_for_lines((select jsonb_agg(jsonb_build_object('site_id', site_id, 'qty', qty)) from public.quote_items where quote_id = qid), q.account_id) loop
    if d.charge_idr is null then raise exception 'destination % has no delivery rate yet (rate pending)', d.site_name using errcode = 'check_violation'; end if;
  end loop;
  perform axiom.enter_fn('quote', qid);
  update public.quotes set state = 'sent', sent_at = now() where id = qid;
  perform axiom.leave_fn();
  perform axiom.log_quote(qid, q.state::text, 'sent');
end $$;

-- ================================================================ 3 · subscriptions
do $$ begin
  create type public.subscription_state as enum ('active','paused','cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  account_id        uuid not null references public.accounts(id) on delete cascade,
  variant_id        uuid not null references public.product_variants(id),
  site_id           uuid references public.account_sites(id) on delete set null,
  qty               int not null check (qty > 0),
  interval_days     int not null check (interval_days in (30, 60, 90)),
  discount_pct      numeric(5,2) not null default 0,
  state             public.subscription_state not null default 'active',
  started_at        timestamptz not null default now(),
  next_due_at       timestamptz not null,
  last_order_id     uuid references public.orders(id),
  renewal_quote_id  uuid references public.quotes(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists subscriptions_account_idx on public.subscriptions(account_id, state);
create index if not exists subscriptions_due_idx on public.subscriptions(next_due_at) where state = 'active';
create unique index if not exists subscriptions_live_uq on public.subscriptions(account_id, variant_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid)) where state <> 'cancelled';

alter table public.orders add column if not exists subscription_id uuid references public.subscriptions(id);
alter table public.quotes add column if not exists subscription_id uuid references public.subscriptions(id);

alter table public.subscriptions enable row level security;
create policy subscriptions_read on public.subscriptions for select using (axiom.is_staff() or axiom.member_of(account_id));
-- No write policy at all: every change is one of the definer functions below, so a direct write
-- from any role is refused. The read policy is the only door.
revoke insert, update, delete, truncate, references, trigger on public.subscriptions from anon;
grant select on public.subscriptions to anon, authenticated;

create or replace function axiom.touch_subscription() returns trigger
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists t_subscription_touch on public.subscriptions;
create trigger t_subscription_touch before update on public.subscriptions for each row execute function axiom.touch_subscription();

-- Payment is where a plan begins and where it advances. The order's lines with a plan each become
-- (or renew) a subscription; a renewal order names the subscription it settles.
create or replace function axiom.mark_paid(oid uuid, ref text) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare o public.orders; inv public.invoices; r record; sid uuid;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  if coalesce(axiom.setting('paid_by_owner_only') #>> '{}', 'false') = 'true' and not axiom.is_owner() then
    raise insufficient_privilege using message = 'only the owner may mark an invoice paid';
  end if;
  select * into o from public.orders where id = oid for update;
  if o.state <> 'awaiting_payment' then raise exception 'order % is %, not awaiting payment', o.number, o.state using errcode = 'check_violation'; end if;
  select * into inv from public.invoices where order_id = oid and kind = 'invoice' and voided_at is null for update;
  if inv.id is null or inv.issued_at is null then raise exception 'no issued invoice on order %', o.number using errcode = 'check_violation'; end if;
  if inv.paid_at is not null then raise exception 'invoice % already paid', inv.number using errcode = 'check_violation'; end if;
  perform axiom.enter_fn('invoice', inv.id);
  update public.invoices set paid_at = now(), paid_ref = ref, paid_by = auth.uid() where id = inv.id;
  perform axiom.leave_fn();
  perform axiom.enter_fn('mark_paid', oid);
  update public.orders set state = 'packing' where id = oid;
  -- every plan line on the order: a live subscription advances, a new one starts
  for r in select oi.variant_id, oi.site_id, oi.qty, oi.interval_days, oi.discount_pct
           from public.order_items oi where oi.order_id = oid and oi.interval_days is not null loop
    select id into sid from public.subscriptions s
     where s.account_id = o.account_id and s.variant_id = r.variant_id and s.site_id is not distinct from r.site_id and s.state <> 'cancelled';
    if sid is null then
      insert into public.subscriptions (account_id, variant_id, site_id, qty, interval_days, discount_pct, state, started_at, next_due_at, last_order_id)
      values (o.account_id, r.variant_id, r.site_id, r.qty, r.interval_days, r.discount_pct, 'active', now(), now() + make_interval(days => r.interval_days), oid)
      returning id into sid;
    else
      update public.subscriptions
         set qty = r.qty, interval_days = r.interval_days, discount_pct = r.discount_pct, state = 'active',
             next_due_at = now() + make_interval(days => r.interval_days), last_order_id = oid, renewal_quote_id = null
       where id = sid;
    end if;
  end loop;
  perform axiom.leave_fn();
  perform axiom.log_invoice(inv.id, 'paid', ref);
  perform axiom.log_order(oid, 'awaiting_payment', 'packing');
end $$;

-- Acceptance copies the plan and the frozen prices onto the order line, and names the plan on the
-- invoice line's spec so the document reads it.
create or replace function axiom.accept_quote(qid uuid) returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare q public.quotes; oid uuid; iid uuid; r record; d record;
        sub bigint := 0; del bigint := 0; ppn numeric; ppn_amt bigint; sites jsonb; terms int; bank jsonb;
begin
  select * into q from public.quotes where id = qid for update;
  if not (axiom.is_staff() or axiom.member_of(q.account_id)) then raise insufficient_privilege; end if;
  if axiom.quote_state(q) <> 'sent' then raise exception 'only a sent, unexpired quote can be accepted (quote is %)', axiom.quote_state(q) using errcode = 'check_violation'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'address', address, 'zone', zone)), '[]')
    into sites from public.account_sites where account_id = q.account_id;

  insert into public.orders (account_id, quote_id, state, sites_snapshot, accepted_by, subscription_id)
  values (q.account_id, qid, 'awaiting_payment', sites, auth.uid(), q.subscription_id) returning id into oid;

  for r in select qi.*, s.name as site_name, c.unit_supplier_cost_idr, c.unit_pen_cost_idr
           from public.quote_items qi left join public.account_sites s on s.id = qi.site_id
           left join public.quote_item_costs c on c.quote_item_id = qi.id where qi.quote_id = qid loop
    insert into public.order_items (order_id, variant_id, site_id, site_name, qty, unit_price_idr, interval_days, list_price_idr, discount_pct)
    values (oid, r.variant_id, r.site_id, r.site_name, r.qty, r.unit_price_idr, r.interval_days, r.list_price_idr, r.discount_pct) returning id into iid;
    insert into public.order_item_costs (order_item_id, unit_supplier_cost_idr, unit_pen_cost_idr)
    values (iid, coalesce(r.unit_supplier_cost_idr, 0), coalesce(r.unit_pen_cost_idr, 0));
    sub := sub + r.unit_price_idr * r.qty;
  end loop;

  for d in select * from axiom.delivery_for_lines((select jsonb_agg(jsonb_build_object('site_id', site_id, 'qty', qty)) from public.order_items where order_id = oid), q.account_id) loop
    del := del + coalesce(d.charge_idr, 0);
  end loop;

  update public.orders set subtotal_idr = sub, delivery_idr = del, total_idr = sub + del where id = oid;
  perform axiom.enter_fn('quote', qid);
  update public.quotes set state = 'accepted', accepted_at = now(), order_id = oid where id = qid;
  perform axiom.leave_fn();
  perform axiom.log_quote(qid, 'sent', 'accepted');
  perform axiom.log_order(oid, 'accepted', 'awaiting_payment');

  ppn := coalesce((axiom.setting('ppn_rate') #>> '{}')::numeric, 0);
  terms := coalesce((axiom.setting('payment_terms_days') #>> '{}')::int, 7);
  bank := axiom.setting('bank');
  ppn_amt := round((sub + case when coalesce((axiom.setting('delivery_in_dpp') #>> '{}')::boolean, true) then del else 0 end) * ppn / 100);
  insert into public.invoices (order_id, kind, issued_at, due_at, terms_days, ppn_rate, subtotal_idr, delivery_idr, ppn_idr, total_idr, bank_details)
  values (oid, 'invoice', now(), now() + make_interval(days => terms), terms, ppn, sub, del, ppn_amt, sub + del + ppn_amt, bank)
  returning id into iid;
  perform axiom.enter_fn('invoice', iid);
  insert into public.invoice_items (invoice_id, description, spec, qty, unit_price_idr, is_peptide, sort)
  select iid, p.name,
         v.dose || case when oi.site_name is not null then ' · ' || oi.site_name else '' end
                || case when oi.interval_days is not null then ' · ' || oi.interval_days || ' d · −' || trim(trailing '.' from trim(trailing '0' from oi.discount_pct::text)) || '%' else '' end,
         oi.qty, oi.unit_price_idr, p.kind = 'peptide', row_number() over (order by oi.id)
  from public.order_items oi join public.product_variants v on v.id = oi.variant_id join public.products p on p.id = v.product_id
  where oi.order_id = oid;
  perform axiom.leave_fn();
  perform axiom.log_invoice(iid, 'issued');
  return oid;
end $$;

-- An open renewal quote is withdrawn when its period is skipped or the plan cancelled.
create or replace function axiom.withdraw_renewal(qid uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare st public.quote_state;
begin
  if qid is null then return; end if;
  select state into st from public.quotes where id = qid for update;
  if st is null or st not in ('requested','draft','sent') then return; end if;
  perform axiom.enter_fn('quote', qid);
  update public.quotes set state = 'lost' where id = qid;
  perform axiom.leave_fn();
  perform axiom.log_quote(qid, st::text, 'lost');
end $$;
revoke all on function axiom.withdraw_renewal(uuid) from public, anon;

-- The client's own controls over a plan. Each is one framed write; a cancelled plan stays cancelled.
create or replace function axiom.subscription_guard(sid uuid) returns public.subscriptions
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare s public.subscriptions;
begin
  select * into s from public.subscriptions where id = sid for update;
  if s.id is null then raise exception 'unknown subscription' using errcode = 'check_violation'; end if;
  if not (axiom.is_staff() or axiom.member_of(s.account_id)) then raise insufficient_privilege; end if;
  if s.state = 'cancelled' then raise exception 'this plan has been cancelled; add the lot again to start a new one' using errcode = 'check_violation'; end if;
  return s;
end $$;

create or replace function axiom.subscription_skip(sid uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare s public.subscriptions;
begin
  s := axiom.subscription_guard(sid);
  if s.state <> 'active' then raise exception 'only an active plan can skip a delivery' using errcode = 'check_violation'; end if;
  perform axiom.enter_fn('subscription', sid);
  update public.subscriptions set next_due_at = greatest(next_due_at, now()) + make_interval(days => interval_days), renewal_quote_id = null where id = sid;
  perform axiom.leave_fn();
  -- an open renewal for the skipped period is withdrawn, not left to expire
  perform axiom.withdraw_renewal(s.renewal_quote_id);
end $$;

create or replace function axiom.subscription_pause(sid uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare s public.subscriptions;
begin
  s := axiom.subscription_guard(sid);
  perform axiom.enter_fn('subscription', sid);
  update public.subscriptions set state = 'paused' where id = sid;
  perform axiom.leave_fn();
end $$;

create or replace function axiom.subscription_resume(sid uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare s public.subscriptions;
begin
  s := axiom.subscription_guard(sid);
  perform axiom.enter_fn('subscription', sid);
  update public.subscriptions set state = 'active', next_due_at = greatest(next_due_at, now() + interval '1 day') where id = sid;
  perform axiom.leave_fn();
end $$;

create or replace function axiom.subscription_cancel(sid uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare s public.subscriptions;
begin
  s := axiom.subscription_guard(sid);
  perform axiom.enter_fn('subscription', sid);
  update public.subscriptions set state = 'cancelled' where id = sid;
  perform axiom.leave_fn();
  perform axiom.withdraw_renewal(s.renewal_quote_id);
end $$;

-- A change of interval keeps the date already promised and moves the ones after it; the new
-- percentage applies from the next quote raised, because that is where prices are frozen.
create or replace function axiom.subscription_set_interval(sid uuid, days int) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare s public.subscriptions;
begin
  s := axiom.subscription_guard(sid);
  perform axiom.check_plan(s.variant_id, days);
  perform axiom.enter_fn('subscription', sid);
  update public.subscriptions set interval_days = days, discount_pct = axiom.plan_discount_pct(days) where id = sid;
  perform axiom.leave_fn();
end $$;

-- AXIOM raises the next period's quote: one line, the plan on it, a `requested` quote the Console
-- prices and sends as any other. One open renewal per plan, never two.
create or replace function axiom.raise_renewal(sid uuid) returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare s public.subscriptions; qid uuid; v record;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  s := axiom.subscription_guard(sid);
  if s.state <> 'active' then raise exception 'a paused plan raises no renewal' using errcode = 'check_violation'; end if;
  if s.renewal_quote_id is not null and exists (select 1 from public.quotes q where q.id = s.renewal_quote_id and axiom.quote_state(q) in ('requested','draft','sent')) then
    raise exception 'a renewal quote for this period is already open' using errcode = 'check_violation';
  end if;
  select p.name, pv.dose into v from public.product_variants pv join public.products p on p.id = pv.product_id where pv.id = s.variant_id;
  qid := axiom.request_quote(s.account_id,
    jsonb_build_array(jsonb_build_object('variant_id', s.variant_id, 'qty', s.qty, 'site_id', s.site_id, 'interval_days', s.interval_days)),
    'Renewal · ' || v.name || ' ' || v.dose || ' · ' || s.interval_days || ' d');
  update public.quotes set subscription_id = sid where id = qid;
  perform axiom.enter_fn('subscription', sid);
  update public.subscriptions set renewal_quote_id = qid where id = sid;
  perform axiom.leave_fn();
  return qid;
end $$;

-- Renewals within the lead window with no open quote: what Today shows AXIOM.
create or replace function axiom.renewals_due() returns setof public.subscriptions
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  select s.* from public.subscriptions s
  where axiom.is_staff() and s.state = 'active'
    and s.next_due_at <= now() + make_interval(days => coalesce((axiom.setting('renewal_lead_days') #>> '{}')::int, 5))
    and not exists (select 1 from public.quotes q where q.id = s.renewal_quote_id and axiom.quote_state(q) in ('requested','draft','sent'))
  order by s.next_due_at
$$;

-- ================================================================ 4 · the certificate library
alter table public.coa_documents add column if not exists is_public boolean not null default false;
alter table public.coa_documents add column if not exists published_at timestamptz;
drop policy if exists coa_read on public.coa_documents;
create policy coa_read on public.coa_documents for select using (is_sample or is_public or axiom.is_staff());

create or replace function axiom.publish_coa(cid uuid, make_public boolean) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  update public.coa_documents set is_public = make_public, published_at = case when make_public then coalesce(published_at, now()) end where id = cid;
  if not found then raise exception 'unknown certificate' using errcode = 'check_violation'; end if;
end $$;

-- ================================================================ 5 · the feed
create or replace function axiom.events() returns table (key text, kind text, tone text, subject_type text, subject_id uuid, ref text, amount_idr bigint, due_at timestamptz, meta jsonb)
language plpgsql stable security definer set search_path = public, axiom, pg_catalog as $$
begin
  if axiom.is_staff() then
    return query
      select 'q-req-'||q.id, 'quote_requested', 'info', 'quote', q.id, q.number, null::bigint, q.created_at, jsonb_build_object('account', a.name)
      from public.quotes q join public.accounts a on a.id = q.account_id where q.state = 'requested'
      union all
      select 'q-sent-'||q.id, 'quote_awaiting_reply', case when q.sent_at < now() - interval '6 days' then 'warn' else 'info' end, 'quote', q.id, q.number,
             (select sum(line_total_idr)::bigint from public.quote_items where quote_id = q.id), q.sent_at + interval '7 days', jsonb_build_object('account', a.name)
      from public.quotes q join public.accounts a on a.id = q.account_id where q.state = 'sent' and q.sent_at >= now() - interval '7 days'
      union all
      select 'q-exp-'||q.id, 'quote_expired', 'warn', 'quote', q.id, q.number, null::bigint, q.sent_at + interval '7 days', jsonb_build_object('account', a.name)
      from public.quotes q join public.accounts a on a.id = q.account_id where q.state = 'sent' and q.sent_at < now() - interval '7 days'
      union all
      select 'o-transfer-'||o.id, 'transfer_to_match', 'warn', 'order', o.id, o.number, o.total_idr, o.paid_claim_at, jsonb_build_object('account', a.name, 'ref', o.paid_claim_ref)
      from public.orders o join public.accounts a on a.id = o.account_id where o.state = 'awaiting_payment' and o.paid_claim_at is not null
      union all
      select 'i-overdue-'||i.id, 'invoice_overdue', 'err', 'order', o.id, i.number, i.total_idr, i.due_at, jsonb_build_object('account', a.name)
      from public.invoices i join public.orders o on o.id = i.order_id join public.accounts a on a.id = o.account_id
      where i.kind = 'invoice' and i.paid_at is null and i.voided_at is null and i.due_at < now()
      union all
      select 'o-await-'||o.id, 'order_awaiting_payment', 'info', 'order', o.id, o.number, o.total_idr, i.due_at, jsonb_build_object('account', a.name)
      from public.orders o join public.accounts a on a.id = o.account_id left join public.invoices i on i.order_id = o.id and i.kind = 'invoice' and i.voided_at is null
      where o.state = 'awaiting_payment' and o.paid_claim_at is null and (i.due_at is null or i.due_at >= now())
      union all
      select 'o-pack-'||o.id, 'order_to_pack', 'info', 'order', o.id, o.number, o.total_idr, null::timestamptz, jsonb_build_object('account', a.name,
             'cold', exists (select 1 from public.order_items oi join public.product_variants v on v.id = oi.variant_id where oi.order_id = o.id and v.is_cold_chain))
      from public.orders o join public.accounts a on a.id = o.account_id where o.state = 'packing'
      union all
      select 'ack-'||a.id, 'ack_'||axiom.ack_state_for(a.id), case when axiom.ack_state_for(a.id) = 'lapsed' then 'err' else 'warn' end, 'account', a.id, a.name, null::bigint, axiom.ack_expires_for(a.id), jsonb_build_object('account', a.name)
      from public.accounts a where axiom.ack_state_for(a.id) in ('expiring','lapsed')
      union all
      -- the reorder nudge belongs to accounts without a live plan; a plan has its own date
      select 'reorder-'||a.id, case when due < now() then 'reorder_overdue' else 'reorder_due' end, case when due < now() then 'warn' else 'info' end, 'account', a.id, a.name, null::bigint, due, jsonb_build_object('account', a.name)
      from (select a.id, a.name, (select max(placed_at) from public.orders o where o.account_id = a.id and o.state <> 'cancelled') + make_interval(days => axiom.cadence_days(a.id)) as due
            from public.accounts a
            where not exists (select 1 from public.subscriptions s where s.account_id = a.id and s.state = 'active')) a
      where due is not null and due < now() + interval '7 days'
      union all
      select 'renew-'||s.id, case when s.next_due_at < now() then 'renewal_overdue' else 'renewal_due' end, case when s.next_due_at < now() then 'warn' else 'info' end, 'subscription', s.id, a.name, null::bigint, s.next_due_at,
             jsonb_build_object('account', a.name, 'sku', v.sku, 'lot', p.name || ' ' || v.dose)
      from axiom.renewals_due() s join public.accounts a on a.id = s.account_id join public.product_variants v on v.id = s.variant_id join public.products p on p.id = v.product_id
      union all
      select 'stock-'||s.variant_id, 'stockout', 'warn', 'variant', s.variant_id, p.name || ' ' || v.dose, null::bigint, null::timestamptz, jsonb_build_object('sku', v.sku)
      from axiom.stock_all s join public.product_variants v on v.id = s.variant_id join public.products p on p.id = v.product_id
      where v.is_active and s.on_hand - s.reserved <= 0;
  else
    return query
      select 'q-accept-'||q.id, case when q.subscription_id is null then 'quote_to_accept' else 'renewal_to_accept' end, 'warn', 'quote', q.id, q.number, (select sum(line_total_idr)::bigint from public.quote_items where quote_id = q.id), q.sent_at + interval '7 days', '{}'::jsonb
      from public.quotes q where axiom.member_of(q.account_id) and q.state = 'sent' and q.sent_at >= now() - interval '7 days'
      union all
      select 'q-pricing-'||q.id, 'request_being_priced', 'info', 'quote', q.id, q.number, null::bigint, q.created_at, '{}'::jsonb
      from public.quotes q where axiom.member_of(q.account_id) and q.state in ('requested','draft')
      union all
      select 'i-pay-'||i.id, case when i.due_at < now() then 'invoice_overdue' else 'invoice_to_pay' end, case when i.due_at < now() then 'err' else 'warn' end, 'order', o.id, i.number, i.total_idr, i.due_at, '{}'::jsonb
      from public.invoices i join public.orders o on o.id = i.order_id
      where axiom.member_of(o.account_id) and i.kind = 'invoice' and i.paid_at is null and i.voided_at is null and o.state = 'awaiting_payment'
      union all
      select 'o-progress-'||o.id, 'order_'||o.state, 'info', 'order', o.id, o.number, o.total_idr, null::timestamptz, '{}'::jsonb
      from public.orders o where axiom.member_of(o.account_id) and o.state in ('packing','dispatched');
  end if;
end $$;

-- Helpers only the definer functions call, never a caller directly.
revoke all on function axiom.check_plan(uuid, int) from public, anon;
grant execute on function axiom.check_plan(uuid, int) to authenticated, service_role;
revoke all on function axiom.subscription_guard(uuid) from public, anon;
grant execute on function axiom.subscription_guard(uuid) to authenticated, service_role;
