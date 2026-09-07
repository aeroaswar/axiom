-- AXIOM platform — domain functions, triggers and views.
-- Rules that must hold from every entry point live here, not in the client.

-- ---------------------------------------------------------------- identity helpers
create or replace function axiom.current_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function axiom.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('ops','owner') from public.profiles where id = auth.uid()), false)
$$;

create or replace function axiom.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false)
$$;

-- A policy built on this refuses the query outright instead of returning an empty set.
create or replace function axiom.require_owner() returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
  if axiom.is_owner() then return true; end if;
  raise insufficient_privilege using message = 'cost and margin figures are owner-only';
end $$;

-- Accounts the caller belongs to (a clinic is more than one person).
create or replace function axiom.my_account_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select account_id from public.account_members where profile_id = auth.uid()
  union
  select account_id from public.profiles where id = auth.uid() and account_id is not null
$$;

create or replace function axiom.member_of(acct uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select acct in (select axiom.my_account_ids())
$$;

create or replace function axiom.actor_label() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(full_name,'') from public.profiles where id = auth.uid()), 'AXIOM')
$$;

-- ---------------------------------------------------------------- acknowledgement
-- Current = a qualified-researcher acknowledgement recorded within twelve months.
-- Months eleven and twelve are 'expiring'; after twelve 'lapsed'; none recorded 'none'.
create or replace function axiom.ack_state_for(acct uuid) returns text
language sql stable security definer set search_path = public as $$
  with last as (
    select max(a.acknowledged_at) at
    from public.acknowledgements a
    where a.kind = 'qualified_researcher'
      and (a.account_id = acct or a.profile_id in (select profile_id from public.account_members where account_id = acct))
  )
  select case
    when at is null then 'none'
    when at > now() - interval '10 months' then 'current'
    when at > now() - interval '12 months' then 'expiring'
    else 'lapsed' end
  from last
$$;

create or replace function axiom.ack_expires_for(acct uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select max(a.acknowledged_at) + interval '12 months'
  from public.acknowledgements a
  where a.kind = 'qualified_researcher'
    and (a.account_id = acct or a.profile_id in (select profile_id from public.account_members where account_id = acct))
$$;

create or replace function axiom.account_has_ack(acct uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select axiom.ack_state_for(acct) in ('current','expiring')
$$;

-- The caller's own commerce clearance: staff always; account members when their account is current.
create or replace function axiom.caller_has_ack() returns boolean
language sql stable security definer set search_path = public as $$
  select axiom.is_staff() or exists (select 1 from axiom.my_account_ids() a where axiom.account_has_ack(a))
$$;

create or replace function axiom.setting(k text) returns jsonb
language sql stable security definer set search_path = public as $$
  select value from public.site_settings where key = k
$$;

-- Prices are visible when the site is configured open, or to a caller with a current acknowledgement.
create or replace function axiom.prices_visible() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(axiom.setting('price_visibility') #>> '{}', 'acknowledged') = 'open' or axiom.caller_has_ack()
$$;

-- ---------------------------------------------------------------- stock ledger
create or replace function axiom.apply_stock_movement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- update first: a check constraint is evaluated on the proposed insert tuple before the
  -- on-conflict path, so an insert-or-update form would refuse every sale.
  update public.variant_stock set on_hand = on_hand + new.delta where variant_id = new.variant_id;
  if not found then insert into public.variant_stock (variant_id, on_hand) values (new.variant_id, new.delta); end if;
  return new;
end $$;
create trigger t_stock_apply after insert on public.stock_movements
  for each row execute function axiom.apply_stock_movement();

create or replace function axiom.forbid_ledger_edit() returns trigger
language plpgsql as $$
begin raise exception 'stock_movements is append-only'; end $$;
create trigger t_stock_append_only before update or delete on public.stock_movements
  for each row execute function axiom.forbid_ledger_edit();

create or replace function axiom.forbid_direct_balance_edit() returns trigger
language plpgsql as $$
begin
  if pg_trigger_depth() = 0 then raise exception 'variant_stock is derived from stock_movements'; end if;
  return new;
end $$;
create trigger t_stock_balance_guard before insert or update or delete on public.variant_stock
  for each row execute function axiom.forbid_direct_balance_edit();

-- Reserved = lines on sent, unexpired quotes + lines on undispatched orders.
-- axiom.stock_all is internal (never granted); public.v_stock exposes it to staff only.
create or replace view axiom.stock_all as
select v.id as variant_id,
       coalesce(s.on_hand, 0) as on_hand,
       coalesce((select sum(qi.qty) from public.quote_items qi join public.quotes q on q.id = qi.quote_id
                 where qi.variant_id = v.id and q.state = 'sent' and q.sent_at > now() - interval '7 days'), 0)::int
     + coalesce((select sum(oi.qty) from public.order_items oi join public.orders o on o.id = oi.order_id
                 where oi.variant_id = v.id and o.state in ('awaiting_payment','packing')), 0)::int as reserved
from public.product_variants v
left join public.variant_stock s on s.variant_id = v.id;

create or replace view public.v_stock as
select variant_id, on_hand, reserved, on_hand - reserved as available from axiom.stock_all where axiom.is_staff();

create or replace function axiom.available(vid uuid) returns int
language sql stable security definer set search_path = public as $$
  select greatest(on_hand - reserved, 0) from axiom.stock_all where variant_id = vid
$$;

-- ---------------------------------------------------------------- catalogue views
-- The public catalogue: every surface reads product_variants through here. The price column is
-- null unless prices are visible to the caller; the peptide lines of an unacknowledged account
-- therefore carry no price from any entry point. Availability is the only stock figure exposed.
create or replace view public.v_catalogue as
select v.id as variant_id, v.sku, v.dose, v.content, v.is_cold_chain, v.is_active, v.sort as variant_sort,
       p.id as product_id, p.slug, p.name, p.kind, p.synonyms, p.is_published,
       p.compound_class_en, p.compound_class_id, p.molecular_class_en, p.molecular_class_id, p.cas_no,
       pw.id as pathway_id, pw.no as pathway_no, pw.slug as pathway_slug, pw.name_en as pathway_en, pw.name_id as pathway_id_name, pw.kind as pathway_kind,
       case when p.kind <> 'peptide' or axiom.prices_visible() then v.price_idr end as price_idr,
       greatest(st.on_hand - st.reserved, 0) as available
from public.product_variants v
join public.products p on p.id = v.product_id
join public.pathways pw on pw.id = p.pathway_id
left join axiom.stock_all st on st.variant_id = v.id
where v.is_active;

-- Owner-only pricing view. Selecting it as ops raises, because variant_costs' policy raises.
create or replace view public.v_pricing with (security_invoker = true) as
select v.id as variant_id, v.sku, v.dose, v.content, p.name, p.kind, p.slug, pw.no as pathway_no, pw.name_en as pathway_en, pw.name_id as pathway_id_name,
       c.supplier_cost_idr, c.pen_cost_idr, c.cost_assumed,
       c.supplier_cost_idr + c.pen_cost_idr as base_idr,
       v.price_idr,
       v.price_idr - c.supplier_cost_idr - c.pen_cost_idr as margin_idr,
       case when v.price_idr > 0 then round((v.price_idr - c.supplier_cost_idr - c.pen_cost_idr)::numeric / v.price_idr * 100, 1) else 0 end as gm_pct
from public.product_variants v
join public.variant_costs c on c.variant_id = v.id
join public.products p on p.id = v.product_id
join public.pathways pw on pw.id = p.pathway_id;

-- ---------------------------------------------------------------- numbering
create or replace function axiom.next_number(p_kind text, p_prefix text, p_period text) returns text
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.doc_sequences (kind, period, last_number) values (p_kind, p_period, 1)
  on conflict (kind, period) do update set last_number = public.doc_sequences.last_number + 1
  returning last_number into n;
  return p_prefix || lpad(n::text, 4, '0');
end $$;

create or replace function axiom.set_quote_number() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.number is null or new.number = '' then new.number := axiom.next_number('quote', 'AX-Q-', ''); end if;
  return new;
end $$;
alter table public.quotes alter column number set default '';
create trigger t_quote_number before insert on public.quotes for each row execute function axiom.set_quote_number();

create or replace function axiom.set_order_number() returns trigger language plpgsql security definer set search_path = public as $$
declare p text := to_char(now(), 'YYMM');
begin
  if new.number is null or new.number = '' then new.number := axiom.next_number('order', 'AX-' || p || '-', p); end if;
  return new;
end $$;
alter table public.orders alter column number set default '';
create trigger t_order_number before insert on public.orders for each row execute function axiom.set_order_number();

create or replace function axiom.set_invoice_number() returns trigger language plpgsql security definer set search_path = public as $$
declare p text := to_char(now(), 'YYMM');
begin
  if new.number is null or new.number = '' then
    new.number := axiom.next_number(case when new.kind = 'credit_note' then 'credit' else 'invoice' end,
                                    case when new.kind = 'credit_note' then 'CN-' else 'INV-' end || p || '-', p);
  end if;
  return new;
end $$;
alter table public.invoices alter column number set default '';
create trigger t_invoice_number before insert on public.invoices for each row execute function axiom.set_invoice_number();

-- ---------------------------------------------------------------- delivery
-- Rp 100.000 per three units per destination, capped at Rp 300.000 per destination (Jabodetabek).
-- Any other zone is 'rate pending' (null) and blocks sending. One function, every surface.
create or replace function axiom.consignment_charge(units int, z public.delivery_zone) returns bigint
language sql stable security definer set search_path = public as $$
  select case when dz.per_three_idr is null or units <= 0 then null
              else least(ceil(units / 3.0)::bigint * dz.per_three_idr, dz.cap_idr) end
  from public.delivery_zones dz where dz.zone = z
$$;

-- Delivery for a set of (site_id, qty) lines against an account's sites. Returns one row per
-- destination; charge_idr null means rate pending.
create or replace function axiom.delivery_for_lines(lines jsonb, acct uuid)
returns table (site_id uuid, site_name text, zone public.delivery_zone, units int, charge_idr bigint)
language sql stable security definer set search_path = public as $$
  with l as (
    select coalesce(nullif(x->>'site_id','')::uuid,
                    (select id from public.account_sites s where s.account_id = acct order by is_default desc, sort, name limit 1)) as site_id,
           (x->>'qty')::int as qty
    from jsonb_array_elements(lines) x
  )
  select s.id, s.name, s.zone, sum(l.qty)::int, axiom.consignment_charge(sum(l.qty)::int, s.zone)
  from l join public.account_sites s on s.id = l.site_id
  group by s.id, s.name, s.zone
  order by s.name
$$;

-- ---------------------------------------------------------------- transition guard
-- Order state changes are only legal along the spine; awaiting_payment -> packing is only legal
-- inside axiom.mark_paid, which sets a transaction-local flag before it writes.
create or replace function axiom.guard_order_transition() returns trigger
language plpgsql as $$
declare ok boolean := false;
begin
  if new.state = old.state then return new; end if;
  if old.state = 'awaiting_payment' and new.state = 'packing' then
    ok := current_setting('axiom.paying_order', true) = old.id::text;
    if not ok then raise exception 'payment gates dispatch: an order moves to packing only when its invoice is marked paid' using errcode = 'check_violation'; end if;
  elsif old.state = 'packing' and new.state = 'dispatched' then ok := true;
  elsif old.state = 'dispatched' and new.state = 'delivered' then ok := true;
  elsif old.state in ('awaiting_payment','packing') and new.state = 'cancelled' then ok := true;
  end if;
  if not ok then raise exception 'illegal order transition % -> %', old.state, new.state using errcode = 'check_violation'; end if;
  if current_setting('axiom.in_fn', true) is distinct from '1' then
    raise exception 'order state changes go through axiom.advance_order / mark_paid / cancel_order' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger t_order_guard before update of state on public.orders for each row execute function axiom.guard_order_transition();

create or replace function axiom.guard_quote_transition() returns trigger
language plpgsql as $$
begin
  if new.state = old.state then return new; end if;
  if current_setting('axiom.in_fn', true) is distinct from '1' then
    raise exception 'quote state changes go through the axiom functions' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger t_quote_guard before update of state on public.quotes for each row execute function axiom.guard_quote_transition();

-- Issued invoices are frozen: lines and money never change after issue; only the lifecycle fields move.
create or replace function axiom.guard_invoice_edit() returns trigger
language plpgsql as $$
begin
  if old.issued_at is not null and (
      new.subtotal_idr <> old.subtotal_idr or new.delivery_idr <> old.delivery_idr or new.ppn_idr <> old.ppn_idr
      or new.total_idr <> old.total_idr or new.ppn_rate <> old.ppn_rate or new.order_id <> old.order_id or new.number <> old.number) then
    raise exception 'an issued invoice is frozen; a change after issue is a credit note' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger t_invoice_guard before update on public.invoices for each row execute function axiom.guard_invoice_edit();

create or replace function axiom.guard_invoice_items() returns trigger
language plpgsql as $$
declare issued timestamptz;
begin
  select issued_at into issued from public.invoices where id = coalesce(new.invoice_id, old.invoice_id);
  if issued is not null and current_setting('axiom.in_fn', true) is distinct from '1' then
    raise exception 'lines of an issued invoice are frozen' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;
create trigger t_invoice_items_guard before insert or update or delete on public.invoice_items for each row execute function axiom.guard_invoice_items();

-- ---------------------------------------------------------------- commerce functions
create or replace function axiom.log_quote(q uuid, from_s text, to_s text) returns void
language sql security definer set search_path = public as $$
  insert into public.quote_events (quote_id, actor_id, actor_label, from_state, to_state)
  values (q, auth.uid(), axiom.actor_label(), from_s, to_s)
$$;
create or replace function axiom.log_order(o uuid, from_s text, to_s text) returns void
language sql security definer set search_path = public as $$
  insert into public.order_events (order_id, actor_id, actor_label, from_state, to_state)
  values (o, auth.uid(), axiom.actor_label(), from_s, to_s)
$$;
create or replace function axiom.log_invoice(i uuid, k public.invoice_event, r text default null) returns void
language sql security definer set search_path = public as $$
  insert into public.invoice_events (invoice_id, actor_id, actor_label, kind, ref)
  values (i, auth.uid(), axiom.actor_label(), k, r)
$$;

-- Derived quote state: expired is never stored.
create or replace function axiom.quote_state(q public.quotes) returns text
language sql stable as $$
  select case when q.state = 'sent' and q.sent_at < now() - interval '7 days' then 'expired' else q.state::text end
$$;

-- The account (or the Console on its behalf) raises a request. Lines: [{sku|variant_id, qty, site_id?}]
create or replace function axiom.request_quote(acct uuid, lines jsonb, note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare qid uuid; x jsonb; vid uuid;
begin
  if not (axiom.is_staff() or axiom.member_of(acct)) then raise insufficient_privilege; end if;
  perform set_config('axiom.in_fn', '1', true);
  insert into public.quotes (account_id, state, notes, created_by) values (acct, 'requested', note, auth.uid()) returning id into qid;
  for x in select * from jsonb_array_elements(lines) loop
    select id into vid from public.product_variants where id = nullif(x->>'variant_id','')::uuid or sku = x->>'sku';
    if vid is null then raise exception 'unknown variant %', x; end if;
    insert into public.quote_items (quote_id, variant_id, site_id, qty)
    values (qid, vid, nullif(x->>'site_id','')::uuid, greatest((x->>'qty')::int, 1));
  end loop;
  perform axiom.log_quote(qid, 'new', 'requested');
  return qid;
end $$;

-- Console prices and saves a draft (or re-prices a request). Replaces the lines.
create or replace function axiom.save_quote_draft(qid uuid, lines jsonb, note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare x jsonb; vid uuid; st public.quote_state;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select state into st from public.quotes where id = qid for update;
  if st not in ('requested','draft') then raise exception 'only a requested or draft quote can be edited' using errcode = 'check_violation'; end if;
  perform set_config('axiom.in_fn', '1', true);
  delete from public.quote_items where quote_id = qid;
  for x in select * from jsonb_array_elements(lines) loop
    select id into vid from public.product_variants where id = nullif(x->>'variant_id','')::uuid or sku = x->>'sku';
    insert into public.quote_items (quote_id, variant_id, site_id, qty)
    values (qid, vid, nullif(x->>'site_id','')::uuid, greatest((x->>'qty')::int, 1));
  end loop;
  update public.quotes set notes = coalesce(note, notes), state = 'draft' where id = qid;
  if st = 'requested' then perform axiom.log_quote(qid, 'requested', 'draft'); end if;
end $$;

create or replace function axiom.new_quote(acct uuid, lines jsonb, note text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare qid uuid;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  perform set_config('axiom.in_fn', '1', true);
  insert into public.quotes (account_id, state, notes, created_by) values (acct, 'draft', note, auth.uid()) returning id into qid;
  perform axiom.save_quote_draft(qid, lines, note);
  perform axiom.log_quote(qid, 'new', 'draft');
  return qid;
end $$;

-- Sending freezes prices onto the lines and reserves stock. Refused when a line exceeds what is
-- available, when a destination is unpriced, or when a peptide line goes to an unacknowledged account.
create or replace function axiom.send_quote(qid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare q public.quotes; r record; d record;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select * into q from public.quotes where id = qid for update;
  if q.state not in ('draft','requested','sent') then raise exception 'quote % cannot be sent from %', q.number, q.state using errcode = 'check_violation'; end if;
  if (select count(*) from public.quote_items where quote_id = qid) = 0 then raise exception 'a quote needs at least one line' using errcode = 'check_violation'; end if;
  for r in select qi.id, qi.qty, qi.variant_id, p.kind, p.name, v.dose, v.price_idr, axiom.available(qi.variant_id) as avail,
                  c.supplier_cost_idr, c.pen_cost_idr
           from public.quote_items qi join public.product_variants v on v.id = qi.variant_id join public.products p on p.id = v.product_id
           join public.variant_costs c on c.variant_id = v.id where qi.quote_id = qid loop
    if r.kind = 'peptide' and not axiom.account_has_ack(q.account_id) then
      raise exception 'peptide lines need a current qualified-researcher acknowledgement on the account' using errcode = 'check_violation';
    end if;
    if r.qty > r.avail + (case when q.state = 'sent' then r.qty else 0 end) then
      raise exception '% % : % requested, % available', r.name, r.dose, r.qty, r.avail using errcode = 'check_violation';
    end if;
    update public.quote_items set unit_price_idr = r.price_idr where id = r.id;
    insert into public.quote_item_costs (quote_item_id, unit_supplier_cost_idr, unit_pen_cost_idr)
    values (r.id, r.supplier_cost_idr, r.pen_cost_idr)
    on conflict (quote_item_id) do update set unit_supplier_cost_idr = excluded.unit_supplier_cost_idr, unit_pen_cost_idr = excluded.unit_pen_cost_idr;
  end loop;
  for d in select * from axiom.delivery_for_lines((select jsonb_agg(jsonb_build_object('site_id', site_id, 'qty', qty)) from public.quote_items where quote_id = qid), q.account_id) loop
    if d.charge_idr is null then raise exception 'destination % has no delivery rate yet (rate pending)', d.site_name using errcode = 'check_violation'; end if;
  end loop;
  perform set_config('axiom.in_fn', '1', true);
  update public.quotes set state = 'sent', sent_at = now() where id = qid;
  perform axiom.log_quote(qid, q.state::text, 'sent');
end $$;

create or replace function axiom.mark_quote_lost(qid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare st public.quote_state;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select state into st from public.quotes where id = qid for update;
  if st in ('accepted','lost') then raise exception 'quote already %', st using errcode = 'check_violation'; end if;
  perform set_config('axiom.in_fn', '1', true);
  update public.quotes set state = 'lost' where id = qid;
  perform axiom.log_quote(qid, st::text, 'lost');
end $$;

-- Accepting is one transaction: order + items (prices frozen) + invoice issued + both events.
create or replace function axiom.accept_quote(qid uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare q public.quotes; oid uuid; iid uuid; r record; d record;
        sub bigint := 0; del bigint := 0; ppn numeric; ppn_amt bigint; sites jsonb; terms int; bank jsonb;
begin
  select * into q from public.quotes where id = qid for update;
  if not (axiom.is_staff() or axiom.member_of(q.account_id)) then raise insufficient_privilege; end if;
  if axiom.quote_state(q) <> 'sent' then raise exception 'only a sent, unexpired quote can be accepted (quote is %)', axiom.quote_state(q) using errcode = 'check_violation'; end if;
  perform set_config('axiom.in_fn', '1', true);

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'address', address, 'zone', zone)), '[]')
    into sites from public.account_sites where account_id = q.account_id;

  insert into public.orders (account_id, quote_id, state, sites_snapshot, accepted_by)
  values (q.account_id, qid, 'awaiting_payment', sites, auth.uid()) returning id into oid;

  for r in select qi.*, s.name as site_name, c.unit_supplier_cost_idr, c.unit_pen_cost_idr
           from public.quote_items qi left join public.account_sites s on s.id = qi.site_id
           left join public.quote_item_costs c on c.quote_item_id = qi.id where qi.quote_id = qid loop
    insert into public.order_items (order_id, variant_id, site_id, site_name, qty, unit_price_idr)
    values (oid, r.variant_id, r.site_id, r.site_name, r.qty, r.unit_price_idr) returning id into iid;
    insert into public.order_item_costs (order_item_id, unit_supplier_cost_idr, unit_pen_cost_idr)
    values (iid, coalesce(r.unit_supplier_cost_idr, 0), coalesce(r.unit_pen_cost_idr, 0));
    sub := sub + r.unit_price_idr * r.qty;
  end loop;

  for d in select * from axiom.delivery_for_lines((select jsonb_agg(jsonb_build_object('site_id', site_id, 'qty', qty)) from public.order_items where order_id = oid), q.account_id) loop
    del := del + coalesce(d.charge_idr, 0);
  end loop;

  update public.orders set subtotal_idr = sub, delivery_idr = del, total_idr = sub + del where id = oid;
  update public.quotes set state = 'accepted', accepted_at = now(), order_id = oid where id = qid;
  perform axiom.log_quote(qid, 'sent', 'accepted');
  perform axiom.log_order(oid, 'accepted', 'awaiting_payment');

  -- the invoice, issued at acceptance
  ppn := coalesce((axiom.setting('ppn_rate') #>> '{}')::numeric, 0);
  terms := coalesce((axiom.setting('payment_terms_days') #>> '{}')::int, 7);
  bank := axiom.setting('bank');
  ppn_amt := round((sub + case when coalesce((axiom.setting('delivery_in_dpp') #>> '{}')::boolean, true) then del else 0 end) * ppn / 100);
  insert into public.invoices (order_id, kind, issued_at, due_at, terms_days, ppn_rate, subtotal_idr, delivery_idr, ppn_idr, total_idr, bank_details)
  values (oid, 'invoice', now(), now() + make_interval(days => terms), terms, ppn, sub, del, ppn_amt, sub + del + ppn_amt, bank)
  returning id into iid;
  insert into public.invoice_items (invoice_id, description, spec, qty, unit_price_idr, is_peptide, sort)
  select iid, p.name, v.dose || case when oi.site_name is not null then ' · ' || oi.site_name else '' end, oi.qty, oi.unit_price_idr, p.kind = 'peptide', row_number() over (order by oi.id)
  from public.order_items oi join public.product_variants v on v.id = oi.variant_id join public.products p on p.id = v.product_id
  where oi.order_id = oid;
  perform axiom.log_invoice(iid, 'issued');
  return oid;
end $$;

-- The account reports a transfer. Never a payment by itself.
create or replace function axiom.report_transfer(oid uuid, ref text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders; inv uuid;
begin
  select * into o from public.orders where id = oid;
  if not (axiom.is_staff() or axiom.member_of(o.account_id)) then raise insufficient_privilege; end if;
  if o.state <> 'awaiting_payment' then raise exception 'order is not awaiting payment' using errcode = 'check_violation'; end if;
  perform set_config('axiom.in_fn', '1', true);
  update public.orders set paid_claim_at = now(), paid_claim_ref = ref, paid_claim_by = auth.uid() where id = oid;
  select id into inv from public.invoices where order_id = oid and kind = 'invoice' and voided_at is null limit 1;
  if inv is not null then perform axiom.log_invoice(inv, 'transfer_reported', ref); end if;
end $$;

-- Marking paid is the only door into packing. Who, when, reference, in one transaction.
create or replace function axiom.mark_paid(oid uuid, ref text) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders; inv public.invoices;
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
  perform set_config('axiom.in_fn', '1', true);
  perform set_config('axiom.paying_order', oid::text, true);
  update public.invoices set paid_at = now(), paid_ref = ref, paid_by = auth.uid() where id = inv.id;
  update public.orders set state = 'packing' where id = oid;
  perform set_config('axiom.paying_order', '', true);
  perform axiom.log_invoice(inv.id, 'paid', ref);
  perform axiom.log_order(oid, 'awaiting_payment', 'packing');
end $$;

-- packing -> dispatched writes the sale to the ledger and lifts the hold; dispatched -> delivered closes.
create or replace function axiom.advance_order(oid uuid, carrier text default null, tracking text default null) returns public.order_state
language plpgsql security definer set search_path = public as $$
declare o public.orders; r record; nxt public.order_state; eta int;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select * into o from public.orders where id = oid for update;
  perform set_config('axiom.in_fn', '1', true);
  if o.state = 'awaiting_payment' then
    raise exception 'payment gates dispatch: mark the invoice paid first' using errcode = 'check_violation';
  elsif o.state = 'packing' then
    nxt := 'dispatched';
    for r in select variant_id, qty from public.order_items where order_id = oid loop
      insert into public.stock_movements (variant_id, delta, reason, ref, actor_id) values (r.variant_id, -r.qty, 'sale', o.number, auth.uid());
    end loop;
    eta := coalesce((select max(dz.eta_days) from public.order_items oi join public.account_sites s on s.id = oi.site_id join public.delivery_zones dz on dz.zone = s.zone where oi.order_id = oid), 2);
    insert into public.shipments (order_id, carrier, tracking_no, dispatched_at, eta_at) values (oid, carrier, tracking, now(), (now() + make_interval(days => eta))::date);
  elsif o.state = 'dispatched' then
    nxt := 'delivered';
    update public.shipments set delivered_at = now() where order_id = oid and delivered_at is null;
    update public.orders set delivered_at = now() where id = oid;
  else
    raise exception 'order % is % and cannot advance', o.number, o.state using errcode = 'check_violation';
  end if;
  update public.orders set state = nxt where id = oid;
  perform axiom.log_order(oid, o.state::text, nxt::text);
  return nxt;
end $$;

-- Cancel is a state. Allowed before dispatch; voids an unpaid invoice.
create or replace function axiom.cancel_order(oid uuid, reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders; inv public.invoices;
begin
  select * into o from public.orders where id = oid for update;
  if not (axiom.is_staff() or axiom.member_of(o.account_id)) then raise insufficient_privilege; end if;
  if o.state not in ('awaiting_payment','packing') then raise exception 'order % is % and cannot be cancelled', o.number, o.state using errcode = 'check_violation'; end if;
  perform set_config('axiom.in_fn', '1', true);
  update public.orders set state = 'cancelled' where id = oid;
  perform axiom.log_order(oid, o.state::text, 'cancelled');
  for inv in select * from public.invoices where order_id = oid and voided_at is null and paid_at is null loop
    update public.invoices set voided_at = now() where id = inv.id;
    perform axiom.log_invoice(inv.id, 'voided', reason);
  end loop;
end $$;

-- A change after issue is a credit note, never an edit.
create or replace function axiom.issue_credit_note(invoice uuid, amount_idr bigint, description text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.invoices; cn uuid;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select * into inv from public.invoices where id = invoice;
  if inv.issued_at is null then raise exception 'credit notes apply to issued invoices' using errcode = 'check_violation'; end if;
  perform set_config('axiom.in_fn', '1', true);
  insert into public.invoices (order_id, kind, parent_invoice_id, issued_at, due_at, terms_days, ppn_rate, subtotal_idr, ppn_idr, total_idr, bank_details, notes)
  values (inv.order_id, 'credit_note', invoice, now(), now(), 0, inv.ppn_rate, -amount_idr, -round(amount_idr * inv.ppn_rate / 100), -amount_idr - round(amount_idr * inv.ppn_rate / 100), inv.bank_details, description)
  returning id into cn;
  insert into public.invoice_items (invoice_id, description, qty, unit_price_idr) values (cn, description, 1, -amount_idr);
  perform axiom.log_invoice(cn, 'issued');
  return cn;
end $$;

-- Owner sets a selling price. Audited; never derived from cost.
create or replace function axiom.set_price(vid uuid, new_price bigint) returns void
language plpgsql security definer set search_path = public as $$
declare old_price bigint;
begin
  if not axiom.is_owner() then raise insufficient_privilege using message = 'only the owner changes prices'; end if;
  select price_idr into old_price from public.product_variants where id = vid for update;
  if old_price = new_price then return; end if;
  update public.product_variants set price_idr = new_price where id = vid;
  insert into public.price_changes (variant_id, from_idr, to_idr, changed_by) values (vid, old_price, new_price, auth.uid());
end $$;

create or replace function axiom.set_cost(vid uuid, supplier bigint, pen bigint, assumed boolean default false) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not axiom.is_owner() then raise insufficient_privilege; end if;
  insert into public.variant_costs (variant_id, supplier_cost_idr, pen_cost_idr, cost_assumed, updated_at)
  values (vid, supplier, pen, assumed, now())
  on conflict (variant_id) do update set supplier_cost_idr = excluded.supplier_cost_idr, pen_cost_idr = excluded.pen_cost_idr, cost_assumed = excluded.cost_assumed, updated_at = now();
end $$;

create or replace function axiom.move_stock(vid uuid, delta int, reason public.move_reason, ref text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  insert into public.stock_movements (variant_id, delta, reason, ref, actor_id) values (vid, delta, reason, ref, auth.uid());
end $$;

-- Record an acknowledgement for the caller (and their account).
create or replace function axiom.acknowledge(k public.ack_kind, ver text, ip_addr text default null, ua text default null) returns void
language plpgsql security definer set search_path = public as $$
declare acct uuid;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  select account_id into acct from public.profiles where id = auth.uid();
  insert into public.acknowledgements (profile_id, account_id, kind, version, ip, user_agent)
  values (auth.uid(), acct, k, ver, nullif(ip_addr,'')::inet, ua);
end $$;

-- Reorder cadence: median gap with three or more delivered orders, else the agreed cadence.
create or replace function axiom.cadence_days(acct uuid) returns int
language sql stable security definer set search_path = public as $$
  with d as (select placed_at from public.orders where account_id = acct and state <> 'cancelled' order by placed_at),
       g as (select extract(epoch from placed_at - lag(placed_at) over (order by placed_at)) / 86400 as gap from d)
  select case when (select count(*) from d) >= 3
              then round(percentile_cont(0.5) within group (order by gap))::int
              else (select agreed_cadence_days from public.accounts where id = acct) end
  from g where gap is not null
$$;

-- ---------------------------------------------------------------- the one event feed
-- Everything on Today, the bell and the badge derives from this. Nothing is typed.
create or replace function axiom.events() returns table (key text, kind text, tone text, subject_type text, subject_id uuid, ref text, amount_idr bigint, due_at timestamptz, meta jsonb)
language plpgsql stable security definer set search_path = public as $$
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
      select 'reorder-'||a.id, case when due < now() then 'reorder_overdue' else 'reorder_due' end, case when due < now() then 'warn' else 'info' end, 'account', a.id, a.name, null::bigint, due, jsonb_build_object('account', a.name)
      from (select a.id, a.name, (select max(placed_at) from public.orders o where o.account_id = a.id and o.state <> 'cancelled') + make_interval(days => axiom.cadence_days(a.id)) as due
            from public.accounts a) a
      where due is not null and due < now() + interval '7 days'
      union all
      select 'stock-'||s.variant_id, 'stockout', 'warn', 'variant', s.variant_id, p.name || ' ' || v.dose, null::bigint, null::timestamptz, jsonb_build_object('sku', v.sku)
      from axiom.stock_all s join public.product_variants v on v.id = s.variant_id join public.products p on p.id = v.product_id
      where v.is_active and s.on_hand - s.reserved <= 0;
  else
    return query
      select 'q-accept-'||q.id, 'quote_to_accept', 'warn', 'quote', q.id, q.number, (select sum(line_total_idr)::bigint from public.quote_items where quote_id = q.id), q.sent_at + interval '7 days', '{}'::jsonb
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
