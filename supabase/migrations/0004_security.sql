-- AXIOM platform — security corrections.
-- Every change here closes a hole proven with a probe against the database; each one has a
-- matching check in scripts/gates/sql.mjs so a regression fails the build.
--
--  1. anon/authenticated held INSERT/UPDATE/DELETE/TRUNCATE on every public table. TRUNCATE
--     ignores row-level security, so the whole business could be wiped past every policy.
--  2. profiles' insert policy let a new sign-up name any account_id and inherit that account.
--  3. the acknowledgement insert policy let any signed-in user forge a qualified-researcher
--     record onto any account, reopening peptide commerce for a lapsed one.
--  4. the internal audit-log writers were executable by anon: forged 'paid' events on any invoice.
--  5. the order/quote/invoice transition guards keyed on plain GUCs (axiom.in_fn,
--     axiom.paying_order) that any caller can set, and that stayed set for the rest of the
--     transaction after any axiom function returned. Replaced with a transaction- and
--     subject-scoped frame in a table no caller can reach.
--  6. an issued invoice could be un-issued (issued_at := null), its money rewritten, and issued
--     again — the freeze only looked at the money columns.
--  7. §4 states the gate as "18+ AND qualified researcher"; only the second was enforced.
--  8. cross-account disclosure through ungated definer helpers.

-- ================================================================ 1 · privileges
-- 0003 intended `grant select` as the whole anon surface. The local auth stub's default
-- privileges (and Supabase's own) had already granted ALL on every table created after them.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
revoke all on public.doc_sequences from anon, authenticated;
revoke all on public.variant_stock from anon, authenticated;

alter default privileges in schema public revoke insert, update, delete, truncate, references, trigger on tables from anon;
alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;
alter default privileges in schema public grant select on tables to anon;

-- ================================================================ 2 · the function frame
-- A rule that says "this write is only legal inside function X" needs a marker the caller cannot
-- forge. A GUC is not that: `set_config('axiom.in_fn','1',true)` is available to everyone and
-- survives to the end of the transaction. This table is reachable only by the definer functions
-- that own the rule, the row is valid only inside the transaction that wrote it, and it names the
-- exact row being changed, so a frame opened for one order cannot authorise a write to another.
create unlogged table if not exists axiom.fn_frame (
  pid      int primary key,
  txid     bigint not null,
  tag      text   not null,
  subject  uuid
);
revoke all on axiom.fn_frame from public, anon, authenticated;

create or replace function axiom.enter_fn(p_tag text, p_subject uuid default null) returns void
language sql security definer set search_path = axiom, pg_catalog as $$
  insert into axiom.fn_frame (pid, txid, tag, subject)
  values (pg_backend_pid(), txid_current(), p_tag, p_subject)
  on conflict (pid) do update set txid = excluded.txid, tag = excluded.tag, subject = excluded.subject
$$;

create or replace function axiom.leave_fn() returns void
language sql security definer set search_path = axiom, pg_catalog as $$
  delete from axiom.fn_frame where pid = pg_backend_pid()
$$;

create or replace function axiom.frame_is(p_tag text, p_subject uuid default null) returns boolean
language sql stable security definer set search_path = axiom, pg_catalog as $$
  select exists (
    select 1 from axiom.fn_frame f
    where f.pid = pg_backend_pid() and f.txid = txid_current()
      and f.tag = p_tag and f.subject is not distinct from p_subject)
$$;

revoke all on function axiom.enter_fn(text, uuid) from public, anon, authenticated;
revoke all on function axiom.leave_fn() from public, anon, authenticated;
revoke all on function axiom.frame_is(text, uuid) from public, anon, authenticated;

-- ================================================================ 3 · the guards
create or replace function axiom.guard_order_transition() returns trigger
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare ok boolean := false;
begin
  if new.state = old.state then return new; end if;
  if old.state = 'awaiting_payment' and new.state = 'packing' then
    if not axiom.frame_is('mark_paid', old.id) then
      raise exception 'payment gates dispatch: an order moves to packing only when its invoice is marked paid' using errcode = 'check_violation';
    end if;
    ok := true;
  elsif old.state = 'packing' and new.state = 'dispatched' then ok := true;
  elsif old.state = 'dispatched' and new.state = 'delivered' then ok := true;
  elsif old.state in ('awaiting_payment','packing') and new.state = 'cancelled' then ok := true;
  end if;
  if not ok then raise exception 'illegal order transition % -> %', old.state, new.state using errcode = 'check_violation'; end if;
  if not (axiom.frame_is('mark_paid', old.id) or axiom.frame_is('order', old.id)) then
    raise exception 'order state changes go through axiom.advance_order / mark_paid / cancel_order' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create or replace function axiom.guard_quote_transition() returns trigger
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
begin
  if new.state = old.state then return new; end if;
  if not axiom.frame_is('quote', old.id) then
    raise exception 'quote state changes go through the axiom functions' using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- An issued invoice is frozen. It may never become un-issued, and it may never change kind:
-- both were doors around the money freeze (blank issued_at, rewrite the total, re-issue).
create or replace function axiom.guard_invoice_edit() returns trigger
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
begin
  if old.issued_at is not null then
    if new.issued_at is null then
      raise exception 'an issued invoice cannot be un-issued; a change after issue is a credit note' using errcode = 'check_violation';
    end if;
    if new.kind is distinct from old.kind then
      raise exception 'an issued invoice cannot change kind' using errcode = 'check_violation';
    end if;
    if new.subtotal_idr <> old.subtotal_idr or new.delivery_idr <> old.delivery_idr or new.ppn_idr <> old.ppn_idr
       or new.total_idr <> old.total_idr or new.ppn_rate <> old.ppn_rate
       or new.order_id is distinct from old.order_id or new.number is distinct from old.number then
      raise exception 'an issued invoice is frozen; a change after issue is a credit note' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

create or replace function axiom.guard_invoice_items() returns trigger
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare issued timestamptz; inv uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  select issued_at into issued from public.invoices where id = inv;
  if issued is not null and not axiom.frame_is('invoice', inv) then
    raise exception 'lines of an issued invoice are frozen' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;

-- search_path pinned on the remaining trigger functions (they were unpinned invokers).
create or replace function axiom.forbid_ledger_edit() returns trigger
language plpgsql security definer set search_path = public, pg_catalog as $$
begin raise exception 'stock_movements is append-only' using errcode = 'check_violation'; end $$;

create or replace function axiom.forbid_direct_balance_edit() returns trigger
language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if pg_trigger_depth() = 0 then raise exception 'variant_stock is derived from stock_movements' using errcode = 'check_violation'; end if;
  return new;
end $$;

create or replace function axiom.touch_updated_at() returns trigger
language plpgsql set search_path = public, pg_catalog as $$
begin new.updated_at = now(); return new; end $$;

create or replace function axiom.quote_state(q public.quotes) returns text
language sql stable set search_path = public, pg_catalog as $$
  select case when q.state = 'sent' and q.sent_at < now() - interval '7 days' then 'expired' else q.state::text end
$$;

-- ================================================================ 4 · row-level security
-- A sign-up names no account. Only the owner links a profile to an account (guard_profile_role
-- already says so for updates; the insert policy did not, so a new user could join any account
-- and read its orders, quotes, invoices, sites and members, and act on its quotes).
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert
  with check (id = auth.uid() and role in ('client','clinic') and account_id is null);

create or replace function axiom.guard_profile_insert() returns trigger
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
begin
  -- auth.uid() is null only on the migration/seed connection, which is the schema's own author;
  -- every application caller carries a subject (the insert policy requires id = auth.uid()).
  if auth.uid() is not null and not axiom.is_owner()
     and (new.role not in ('client','clinic') or new.account_id is not null) then
    raise insufficient_privilege using message = 'only the owner sets roles and account links';
  end if;
  return new;
end $$;
drop trigger if exists t_profile_insert on public.profiles;
create trigger t_profile_insert before insert on public.profiles for each row execute function axiom.guard_profile_insert();

-- An acknowledgement is the compliance record. It is recorded for yourself, on one of your own
-- accounts, or by staff. It was recordable for any account by anyone signed in.
drop policy if exists ack_insert on public.acknowledgements;
create policy ack_insert on public.acknowledgements for insert
  with check ((profile_id = auth.uid() and (account_id is null or axiom.member_of(account_id))) or axiom.is_staff());

-- A member may keep its own contact details current. Commercial classification and the account
-- manager belong to AXIOM.
create or replace function axiom.guard_account_edit() returns trigger
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
begin
  if auth.uid() is not null and not axiom.is_staff() and (
       new.type is distinct from old.type
    or new.account_manager_id is distinct from old.account_manager_id
    or new.agreed_cadence_days is distinct from old.agreed_cadence_days) then
    raise insufficient_privilege using message = 'account type, manager and agreed cadence are set by AXIOM';
  end if;
  return new;
end $$;
drop trigger if exists t_account_edit on public.accounts;
create trigger t_account_edit before update on public.accounts for each row execute function axiom.guard_account_edit();

-- ================================================================ 5 · the acknowledgement rule
-- §4: "18+ AND qualified researcher". Age does not expire; the researcher declaration does.
create or replace function axiom.ack_state_for(acct uuid) returns text
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  with mine as (
    select a.kind, a.acknowledged_at from public.acknowledgements a
    where (axiom.is_staff() or axiom.member_of(acct))
      and (a.account_id = acct or a.profile_id in (select profile_id from public.account_members where account_id = acct))
  ), last as (
    select max(acknowledged_at) filter (where kind = 'qualified_researcher') at,
           bool_or(kind = 'age_18') adult
    from mine
  )
  select case
    when not (axiom.is_staff() or axiom.member_of(acct)) then null
    when at is null or not coalesce(adult, false) then 'none'
    when at > now() - interval '10 months' then 'current'
    when at > now() - interval '12 months' then 'expiring'
    else 'lapsed' end
  from last
$$;

-- ================================================================ 6 · definer surface
-- Internal helpers. `grant execute on all functions in schema axiom to anon` (and PostgreSQL's
-- own default grant to PUBLIC) put the audit-log writers, the numbering counter and the settings
-- reader in reach of an unauthenticated caller.
revoke all on function axiom.log_quote(uuid, text, text) from public, anon, authenticated;
revoke all on function axiom.log_order(uuid, text, text) from public, anon, authenticated;
revoke all on function axiom.log_invoice(uuid, public.invoice_event, text) from public, anon, authenticated;
revoke all on function axiom.next_number(text, text, text) from public, anon, authenticated;
revoke all on function axiom.setting(text) from public, anon, authenticated;

-- Cross-account disclosure: these answered for any account id, to anyone.
create or replace function axiom.ack_expires_for(acct uuid) returns timestamptz
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  select max(a.acknowledged_at) + interval '12 months'
  from public.acknowledgements a
  where (axiom.is_staff() or axiom.member_of(acct))
    and a.kind = 'qualified_researcher'
    and (a.account_id = acct or a.profile_id in (select profile_id from public.account_members where account_id = acct))
$$;

create or replace function axiom.cadence_days(acct uuid) returns int
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  with d as (select placed_at from public.orders
             where account_id = acct and state <> 'cancelled' and (axiom.is_staff() or axiom.member_of(acct))
             order by placed_at),
       g as (select extract(epoch from placed_at - lag(placed_at) over (order by placed_at)) / 86400 as gap from d)
  select case when (select count(*) from d) >= 3
              then round(percentile_cont(0.5) within group (order by gap))::int
              else (select agreed_cadence_days from public.accounts a where a.id = acct and (axiom.is_staff() or axiom.member_of(acct))) end
  from g where gap is not null
$$;

create or replace function axiom.delivery_for_lines(lines jsonb, acct uuid)
returns table (site_id uuid, site_name text, zone public.delivery_zone, units int, charge_idr bigint)
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  with l as (
    select coalesce(nullif(x->>'site_id','')::uuid,
                    (select id from public.account_sites s where s.account_id = acct order by is_default desc, sort, name limit 1)) as site_id,
           (x->>'qty')::int as qty
    from jsonb_array_elements(lines) x
    where axiom.is_staff() or axiom.member_of(acct)
  )
  select s.id, s.name, s.zone, sum(l.qty)::int, axiom.consignment_charge(sum(l.qty)::int, s.zone)
  from l join public.account_sites s on s.id = l.site_id
  group by s.id, s.name, s.zone
  order by s.name
$$;

-- ================================================================ 7 · the domain functions
-- Identical bodies, except that every write which a guard protects is wrapped in a frame that
-- names it, and the frame is closed the moment the write is done. Nothing else in a transaction
-- inherits the permission, and no caller can open a frame.

create or replace function axiom.request_quote(acct uuid, lines jsonb, note text default null) returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare qid uuid; x jsonb; vid uuid;
begin
  if not (axiom.is_staff() or axiom.member_of(acct)) then raise insufficient_privilege; end if;
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

create or replace function axiom.save_quote_draft(qid uuid, lines jsonb, note text default null) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare x jsonb; vid uuid; st public.quote_state;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select state into st from public.quotes where id = qid for update;
  if st not in ('requested','draft') then raise exception 'only a requested or draft quote can be edited' using errcode = 'check_violation'; end if;
  delete from public.quote_items where quote_id = qid;
  for x in select * from jsonb_array_elements(lines) loop
    select id into vid from public.product_variants where id = nullif(x->>'variant_id','')::uuid or sku = x->>'sku';
    if vid is null then raise exception 'unknown variant %', x; end if;
    insert into public.quote_items (quote_id, variant_id, site_id, qty)
    values (qid, vid, nullif(x->>'site_id','')::uuid, greatest((x->>'qty')::int, 1));
  end loop;
  perform axiom.enter_fn('quote', qid);
  update public.quotes set notes = coalesce(note, notes), state = 'draft' where id = qid;
  perform axiom.leave_fn();
  if st = 'requested' then perform axiom.log_quote(qid, 'requested', 'draft'); end if;
end $$;

create or replace function axiom.new_quote(acct uuid, lines jsonb, note text default null) returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare qid uuid;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  insert into public.quotes (account_id, state, notes, created_by) values (acct, 'draft', note, auth.uid()) returning id into qid;
  perform axiom.save_quote_draft(qid, lines, note);
  perform axiom.log_quote(qid, 'new', 'draft');
  return qid;
end $$;

create or replace function axiom.send_quote(qid uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
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
  perform axiom.enter_fn('quote', qid);
  update public.quotes set state = 'sent', sent_at = now() where id = qid;
  perform axiom.leave_fn();
  perform axiom.log_quote(qid, q.state::text, 'sent');
end $$;

create or replace function axiom.mark_quote_lost(qid uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare st public.quote_state;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select state into st from public.quotes where id = qid for update;
  if st in ('accepted','lost') then raise exception 'quote already %', st using errcode = 'check_violation'; end if;
  perform axiom.enter_fn('quote', qid);
  update public.quotes set state = 'lost' where id = qid;
  perform axiom.leave_fn();
  perform axiom.log_quote(qid, st::text, 'lost');
end $$;

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
  select iid, p.name, v.dose || case when oi.site_name is not null then ' · ' || oi.site_name else '' end, oi.qty, oi.unit_price_idr, p.kind = 'peptide', row_number() over (order by oi.id)
  from public.order_items oi join public.product_variants v on v.id = oi.variant_id join public.products p on p.id = v.product_id
  where oi.order_id = oid;
  perform axiom.leave_fn();
  perform axiom.log_invoice(iid, 'issued');
  return oid;
end $$;

create or replace function axiom.report_transfer(oid uuid, ref text) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare o public.orders; inv uuid;
begin
  select * into o from public.orders where id = oid;
  if not (axiom.is_staff() or axiom.member_of(o.account_id)) then raise insufficient_privilege; end if;
  if o.state <> 'awaiting_payment' then raise exception 'order is not awaiting payment' using errcode = 'check_violation'; end if;
  update public.orders set paid_claim_at = now(), paid_claim_ref = ref, paid_claim_by = auth.uid() where id = oid;
  select id into inv from public.invoices where order_id = oid and kind = 'invoice' and voided_at is null limit 1;
  if inv is not null then perform axiom.log_invoice(inv, 'transfer_reported', ref); end if;
end $$;

create or replace function axiom.mark_paid(oid uuid, ref text) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
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
  update public.invoices set paid_at = now(), paid_ref = ref, paid_by = auth.uid() where id = inv.id;
  perform axiom.enter_fn('mark_paid', oid);
  update public.orders set state = 'packing' where id = oid;
  perform axiom.leave_fn();
  perform axiom.log_invoice(inv.id, 'paid', ref);
  perform axiom.log_order(oid, 'awaiting_payment', 'packing');
end $$;

create or replace function axiom.advance_order(oid uuid, carrier text default null, tracking text default null) returns public.order_state
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare o public.orders; r record; nxt public.order_state; eta int;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select * into o from public.orders where id = oid for update;
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
  perform axiom.enter_fn('order', oid);
  update public.orders set state = nxt where id = oid;
  perform axiom.leave_fn();
  perform axiom.log_order(oid, o.state::text, nxt::text);
  return nxt;
end $$;

create or replace function axiom.cancel_order(oid uuid, reason text default null) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare o public.orders; inv public.invoices;
begin
  select * into o from public.orders where id = oid for update;
  if not (axiom.is_staff() or axiom.member_of(o.account_id)) then raise insufficient_privilege; end if;
  if o.state not in ('awaiting_payment','packing') then raise exception 'order % is % and cannot be cancelled', o.number, o.state using errcode = 'check_violation'; end if;
  perform axiom.enter_fn('order', oid);
  update public.orders set state = 'cancelled' where id = oid;
  perform axiom.leave_fn();
  perform axiom.log_order(oid, o.state::text, 'cancelled');
  for inv in select * from public.invoices where order_id = oid and voided_at is null and paid_at is null loop
    update public.invoices set voided_at = now() where id = inv.id;
    perform axiom.log_invoice(inv.id, 'voided', reason);
  end loop;
end $$;

create or replace function axiom.issue_credit_note(invoice uuid, amount_idr bigint, description text) returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare inv public.invoices; cn uuid;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select * into inv from public.invoices where id = invoice;
  if inv.issued_at is null then raise exception 'credit notes apply to issued invoices' using errcode = 'check_violation'; end if;
  if amount_idr <= 0 then raise exception 'a credit note credits a positive amount' using errcode = 'check_violation'; end if;
  insert into public.invoices (order_id, kind, parent_invoice_id, issued_at, due_at, terms_days, ppn_rate, subtotal_idr, ppn_idr, total_idr, bank_details, notes)
  values (inv.order_id, 'credit_note', invoice, now(), now(), 0, inv.ppn_rate, -amount_idr, -round(amount_idr * inv.ppn_rate / 100), -amount_idr - round(amount_idr * inv.ppn_rate / 100), inv.bank_details, description)
  returning id into cn;
  perform axiom.enter_fn('invoice', cn);
  insert into public.invoice_items (invoice_id, description, qty, unit_price_idr) values (cn, description, 1, -amount_idr);
  perform axiom.leave_fn();
  perform axiom.log_invoice(cn, 'issued');
  return cn;
end $$;

-- The public request path never needed a frame: it only inserts. Setting one left the flag
-- standing for the rest of an anonymous caller's transaction.
create or replace function axiom.submit_public_request(p_name text, p_clinic text, p_role text, p_email text, p_whatsapp text, lines jsonb, p_locale text default 'id', anon text default null)
returns table (lead_id uuid, account_id uuid, quote_id uuid, quote_number text)
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare acct uuid; qid uuid; lid uuid; t public.account_type;
begin
  if coalesce(p_name,'') = '' or (coalesce(p_email,'') = '' and coalesce(p_whatsapp,'') = '') then
    raise exception 'name and a contact are required' using errcode = 'check_violation';
  end if;
  t := case when coalesce(p_clinic,'') = '' then 'individual' when p_role ilike '%research%' or p_role ilike '%lab%' or p_role ilike '%univers%' then 'institution' else 'clinic' end;
  insert into public.accounts (name, type, whatsapp, email, notes) values (coalesce(nullif(p_clinic,''), p_name), t, p_whatsapp, p_email, 'Unverified · created from the public request form') returning id into acct;
  insert into public.account_sites (account_id, name, is_default) values (acct, 'Primary', true);
  insert into public.leads (name, clinic, role_title, email, whatsapp, source, stage, account_id) values (p_name, p_clinic, p_role, p_email, p_whatsapp, 'site', 'new', acct) returning id into lid;
  insert into public.quotes (account_id, state, notes) values (acct, 'requested', 'Public request · ' || p_name || coalesce(' · ' || p_role, '')) returning id into qid;
  insert into public.quote_items (quote_id, variant_id, qty)
  select qid, v.id, greatest((x->>'qty')::int, 1) from jsonb_array_elements(lines) x join public.product_variants v on v.sku = x->>'sku';
  insert into public.quote_events (quote_id, actor_label, from_state, to_state) values (qid, p_name, 'new', 'requested');
  update public.leads set quote_id = qid where id = lid;
  if anon is not null then delete from public.carts where anon_key = anon; end if;
  return query select lid, acct, qid, q.number from public.quotes q where q.id = qid;
end $$;
