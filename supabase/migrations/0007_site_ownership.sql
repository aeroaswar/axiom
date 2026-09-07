-- A destination is part of an account's own record, and until now nothing said so. `site_id` rides
-- in from a form field on the account surface (add to basket, request a quote) and from the Console
-- quote builder, and every function that received it inserted or resolved it verbatim. Because
-- `axiom.delivery_for_lines` is `security definer` and no table here sets `force row level security`,
-- the `sites_read` policy did not apply inside it: hand the function a site id belonging to another
-- account and it returned that account's site name, zone and a charge computed for it. The same id
-- then persisted onto the caller's own quote, and `axiom.accept_quote` copied the foreign site's
-- name into `order_items.site_name` and from there into the frozen invoice line's spec.
--
-- Exploiting the read needs a site UUID one does not have; the write path needs only a wrong value.
-- Both are closed here, at the database, so no surface has to remember.

-- The one place the rule is written. Null means "the account's default" and is always allowed;
-- anything else must belong to the account, and a site that does not is refused rather than ignored,
-- so a mis-addressed line never quietly ships to the default destination.
create or replace function axiom.site_of(acct uuid, site uuid) returns uuid
language plpgsql stable security definer set search_path = public, axiom, pg_catalog as $$
begin
  if site is null then return null; end if;
  if not exists (select 1 from public.account_sites s where s.id = site and s.account_id = acct) then
    raise exception 'destination does not belong to this account' using errcode = 'check_violation';
  end if;
  return site;
end $$;

revoke all on function axiom.site_of(uuid, uuid) from public, anon;
grant execute on function axiom.site_of(uuid, uuid) to authenticated, service_role;

-- Defence in depth: even handed a foreign id, the delivery calculation names only the account's own
-- destinations. Restated in full — it is the definer function that did the disclosing.
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
  from l join public.account_sites s on s.id = l.site_id and s.account_id = acct
  group by s.id, s.name, s.zone
  order by s.name
$$;

-- The basket. An anonymous basket has no account, so it may not name a destination at all; an
-- account's basket may name only its own. The `on conflict` expression must keep matching
-- `cart_items_line_uq`, so the body is restated whole.
create or replace function axiom.cart_set(cid uuid, anon text, sku_or_id text, qty int, site uuid default null) returns void
language plpgsql security definer set search_path = public as $$
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
  if qty <= 0 then
    delete from public.cart_items where cart_id = cid and variant_id = vid and site_id is not distinct from site;
  else
    insert into public.cart_items (cart_id, variant_id, qty, site_id) values (cid, vid, qty, site)
    on conflict (cart_id, variant_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid))
    do update set qty = excluded.qty;
  end if;
  update public.carts set updated_at = now() where id = cid;
end $$;

-- The client's own request, and the Console's draft. Both walk the same lines; both now put every
-- destination through the rule before it is stored.
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
    values (qid, vid, axiom.site_of(acct, nullif(x->>'site_id','')::uuid), greatest((x->>'qty')::int, 1));
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
    insert into public.quote_items (quote_id, variant_id, site_id, qty)
    values (qid, vid, axiom.site_of(acct, nullif(x->>'site_id','')::uuid), greatest((x->>'qty')::int, 1));
  end loop;
  perform axiom.enter_fn('quote', qid);
  update public.quotes set notes = coalesce(note, notes), state = 'draft' where id = qid;
  perform axiom.leave_fn();
  if st = 'requested' then perform axiom.log_quote(qid, 'requested', 'draft'); end if;
end $$;

-- ================================================================ the payment marks
-- `axiom.guard_invoice_edit` froze the money on an issued invoice but left `paid_at`, `paid_ref` and
-- `voided_at` open, and `invoices_write` (0003) is `for all using (axiom.is_staff())` — so the
-- `paid_by_owner_only` setting that `axiom.mark_paid` enforces was a check on one path, not on the
-- column. The Console already writes `public.invoices` directly for notes and the sent stamp, so the
-- next direct write is one line away from stamping a payment nobody was allowed to record.
--
-- The frame mechanism already exists for exactly this: the two functions that legitimately move
-- these columns now name themselves, and the guard refuses the change from anywhere else.
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
    if (new.paid_at is distinct from old.paid_at or new.paid_ref is distinct from old.paid_ref
        or new.paid_by is distinct from old.paid_by or new.voided_at is distinct from old.voided_at)
       and not axiom.frame_is('invoice', old.id) then
      raise exception 'payment and void are recorded by the functions that check who may record them'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
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
  perform axiom.enter_fn('invoice', inv.id);
  update public.invoices set paid_at = now(), paid_ref = ref, paid_by = auth.uid() where id = inv.id;
  perform axiom.leave_fn();
  perform axiom.enter_fn('mark_paid', oid);
  update public.orders set state = 'packing' where id = oid;
  perform axiom.leave_fn();
  perform axiom.log_invoice(inv.id, 'paid', ref);
  perform axiom.log_order(oid, 'awaiting_payment', 'packing');
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
    perform axiom.enter_fn('invoice', inv.id);
    update public.invoices set voided_at = now() where id = inv.id;
    perform axiom.leave_fn();
    perform axiom.log_invoice(inv.id, 'voided', reason);
  end loop;
end $$;
