-- AXIOM platform — closing three breaks in the workflow, found by walking every path end to end.
--
--  1. The public request could not be finished. A visitor's request creates an unverified account,
--     a lead and a `requested` quote, but nothing links the person who signs in afterwards to that
--     account, so they see none of it, and nothing records the account's acknowledgement, so
--     `send_quote` refuses every peptide line. The Console could price the quote and never send it.
--     The remedy is the link: once a person belongs to the account they acknowledge for themselves
--     on their own profile screen, which is where a compliance statement belongs.
--  2. Cancelling a paid order left the money silent. The order closed, the paid invoice stayed
--     paid, no credit note was raised and no surface said a refund was owed.
--  3. The lead pipeline never moved. Leads were written at 'new' and left there; five of the six
--     stages were unreachable and `activities` was never written at all.

-- ---------------------------------------------------------------- activity log
-- One line per thing a person did to a subject. Staff read it; the domain functions write it.
create or replace function axiom.log_activity(p_type text, p_id uuid, p_kind text, p_body text default null)
returns void language sql security definer set search_path = public, axiom, pg_catalog as $$
  insert into public.activities (subject_type, subject_id, kind, body, actor_id)
  values (p_type, p_id, p_kind, p_body, auth.uid())
$$;

alter table public.activities enable row level security;
drop policy if exists activities_staff on public.activities;
create policy activities_staff on public.activities for all using (axiom.is_staff()) with check (axiom.is_staff());
revoke execute on function axiom.log_activity(text, uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- 1 · the missing link
-- Only the owner links a profile to an account — the rule 0004 states and no surface offered.
-- Linking is deliberately not a move: a profile already on another account is refused, so a
-- mis-click cannot hand one client's orders to another.
create or replace function axiom.link_member(p_profile uuid, p_account uuid, p_primary boolean default false)
returns void language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare cur uuid; nm text;
begin
  if not axiom.is_owner() then
    raise insufficient_privilege using message = 'only the owner links a person to an account';
  end if;
  select account_id, full_name into cur, nm from public.profiles where id = p_profile;
  if not found then raise exception 'no such person' using errcode = 'check_violation'; end if;
  if cur is not null and cur <> p_account then
    raise exception 'that person already belongs to another account; unlink them there first' using errcode = 'check_violation';
  end if;
  update public.profiles set account_id = p_account where id = p_profile;
  insert into public.account_members (account_id, profile_id, is_primary)
  values (p_account, p_profile, p_primary)
  on conflict (account_id, profile_id) do update set is_primary = excluded.is_primary;
  if p_primary then
    update public.account_members set is_primary = false where account_id = p_account and profile_id <> p_profile;
  end if;
  perform axiom.log_activity('account', p_account, 'member_linked', coalesce(nm, p_profile::text));
  -- A person joining an account may complete its pipeline stage.
  update public.leads set stage = 'contacted' where account_id = p_account and stage = 'new';
end $$;

-- Unlinking is the same act in reverse, and is what makes a wrong link recoverable.
create or replace function axiom.unlink_member(p_profile uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare acct uuid;
begin
  if not axiom.is_owner() then
    raise insufficient_privilege using message = 'only the owner unlinks a person from an account';
  end if;
  select account_id into acct from public.profiles where id = p_profile;
  if acct is null then return; end if;
  delete from public.account_members where profile_id = p_profile and account_id = acct;
  update public.profiles set account_id = null where id = p_profile;
  perform axiom.log_activity('account', acct, 'member_unlinked', p_profile::text);
end $$;

-- People who have signed in and belong to no account yet: exactly the queue the Console needs to
-- clear after a public request. Staff read it; the owner acts on it.
create or replace view public.v_unlinked_people as
select p.id, coalesce(nullif(p.full_name, ''), u.email, p.id::text) as label, u.email, p.created_at
from public.profiles p
left join auth.users u on u.id = p.id
where p.account_id is null and p.role in ('client','clinic') and axiom.is_staff();

grant select on public.v_unlinked_people to authenticated;

-- ---------------------------------------------------------------- 2 · cancel and the money
-- What an order has actually taken: paid invoices less the credit notes already raised against it.
-- Every surface that says "a refund is owed" reads this one expression, so the Console, the client's
-- own order screen and the cancel guard cannot each carry their own arithmetic. It is closed the
-- way ack_state_for is closed: staff, or a member of the account the order belongs to. Anyone else
-- reads 0 and learns nothing from naming an order id.
create or replace function axiom.net_paid(oid uuid) returns bigint
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  select case when axiom.is_staff()
                or exists (select 1 from public.orders o where o.id = oid and axiom.member_of(o.account_id))
                or coalesce(current_setting('role', true), 'none') in ('none', 'service_role')
    then coalesce((select sum(case when kind = 'invoice' and paid_at is not null and voided_at is null then total_idr
                                   when kind = 'credit_note' then total_idr else 0 end)
                   from public.invoices where order_id = oid), 0)
    else 0 end::bigint
$$;

-- Cancel is still a state, still allowed before dispatch. What changes is that it can no longer
-- close over money: an order that has been paid is refused until the credit note exists, and the
-- refusal names the remedy rather than leaving the operator to guess.
create or replace function axiom.cancel_order(oid uuid, reason text default null) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare o public.orders; inv public.invoices; held bigint;
begin
  select * into o from public.orders where id = oid for update;
  if not (axiom.is_staff() or axiom.member_of(o.account_id)) then raise insufficient_privilege; end if;
  if o.state not in ('awaiting_payment','packing') then raise exception 'order % is % and cannot be cancelled', o.number, o.state using errcode = 'check_violation'; end if;

  held := axiom.net_paid(oid);
  if held > 0 then
    -- The amount is what the order is still holding, not what to type into the credit note: a
    -- credit note adds its own PPN, so the figure the operator enters is the pre-tax one. Naming
    -- the sum held states the obligation without prescribing arithmetic that would over-credit.
    -- `translate` because the group separator follows the server's locale, and IDR is written 1.887.000.
    raise exception 'order % has been paid and is holding Rp %: raise the credit note for the refund before cancelling, so the money leaves as a document',
      o.number, translate(to_char(held, 'FM999G999G999G999'), ',.', '..') using errcode = 'check_violation';
  end if;

  perform axiom.enter_fn('order', oid);
  update public.orders set state = 'cancelled' where id = oid;
  perform axiom.leave_fn();
  perform axiom.log_order(oid, o.state::text, 'cancelled');
  for inv in select * from public.invoices where order_id = oid and voided_at is null and paid_at is null and kind = 'invoice' loop
    perform axiom.enter_fn('invoice', inv.id);
    update public.invoices set voided_at = now() where id = inv.id;
    perform axiom.leave_fn();
    perform axiom.log_invoice(inv.id, 'voided', reason);
  end loop;
  perform axiom.log_activity('order', oid, 'cancelled', reason);
end $$;

-- ---------------------------------------------------------------- 3 · the lead pipeline
-- new → contacted → acknowledged → quoted → won, with lost off to the side. The stage is derived
-- from what has actually happened wherever it can be, and set by hand only for 'contacted'.
create or replace function axiom.lead_rank(s public.lead_stage) returns int
language sql immutable as $$
  select case s when 'new' then 0 when 'contacted' then 1 when 'acknowledged' then 2
                when 'quoted' then 3 when 'won' then 4 when 'lost' then -1 end
$$;

-- Advance only: a lead never walks backwards, and 'won' is never undone by a later lost quote.
create or replace function axiom.advance_lead(p_account uuid, p_to public.lead_stage) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
begin
  if p_account is null then return; end if;
  update public.leads set stage = p_to
  where account_id = p_account
    and stage <> 'won'
    and (case when p_to = 'lost' then stage <> 'lost' else axiom.lead_rank(stage) < axiom.lead_rank(p_to) end);
end $$;

create or replace function axiom.set_lead_stage(p_lead uuid, p_to public.lead_stage, note text default null) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare was public.lead_stage;
begin
  if not axiom.is_staff() then raise insufficient_privilege; end if;
  select stage into was from public.leads where id = p_lead for update;
  if not found then raise exception 'no such lead' using errcode = 'check_violation'; end if;
  update public.leads set stage = p_to, owner_id = coalesce(owner_id, auth.uid()) where id = p_lead;
  perform axiom.log_activity('lead', p_lead, 'stage', was::text || ' → ' || p_to::text || coalesce(' · ' || note, ''));
end $$;

-- Every quote transition already flows through log_quote, so the pipeline follows the commerce
-- record instead of asking anyone to keep a second one by hand.
create or replace function axiom.log_quote(q uuid, from_s text, to_s text) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare acct uuid;
begin
  insert into public.quote_events (quote_id, actor_id, actor_label, from_state, to_state)
  values (q, auth.uid(), axiom.actor_label(), from_s, to_s);
  select account_id into acct from public.quotes where id = q;
  perform axiom.advance_lead(acct, case to_s
    when 'sent'     then 'quoted'
    when 'accepted' then 'won'
    when 'lost'     then 'lost'
    else 'contacted' end::public.lead_stage);
end $$;

-- Recording an acknowledgement is what 'acknowledged' means; it is not a stage anyone types.
create or replace function axiom.acknowledge(k public.ack_kind, ver text, ip_addr text default null, ua text default null) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare acct uuid;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  select account_id into acct from public.profiles where id = auth.uid();
  insert into public.acknowledgements (profile_id, account_id, kind, version, ip, user_agent)
  values (auth.uid(), acct, k, ver, nullif(ip_addr,'')::inet, ua);
  if acct is not null and axiom.ack_state_for(acct) = 'current' then
    perform axiom.advance_lead(acct, 'acknowledged');
  end if;
end $$;

-- ---------------------------------------------------------------- the feed learns the new facts
-- Three things could go wrong in silence and now cannot: a quote that can never be sent, money
-- held against a cancelled order, and a lead nobody has answered.
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
      -- An open quote on an account that has never acknowledged: send_quote will refuse it, so say
      -- so here rather than at the button.
      select 'ack-none-'||a.id, 'ack_none', 'err', 'account', a.id, a.name, null::bigint, min(q.created_at), jsonb_build_object('account', a.name, 'quote', min(q.number))
      from public.accounts a join public.quotes q on q.account_id = a.id
      where q.state in ('requested','draft') and axiom.ack_state_for(a.id) = 'none'
        and exists (select 1 from public.quote_items qi join public.product_variants v on v.id = qi.variant_id
                    join public.products p on p.id = v.product_id where qi.quote_id = q.id and p.kind = 'peptide')
      group by a.id, a.name
      union all
      select 'o-transfer-'||o.id, 'transfer_to_match', 'warn', 'order', o.id, o.number, o.total_idr, o.paid_claim_at, jsonb_build_object('account', a.name, 'ref', o.paid_claim_ref)
      from public.orders o join public.accounts a on a.id = o.account_id where o.state = 'awaiting_payment' and o.paid_claim_at is not null
      union all
      select 'i-overdue-'||i.id, 'invoice_overdue', 'err', 'order', o.id, i.number, i.total_idr, i.due_at, jsonb_build_object('account', a.name)
      from public.invoices i join public.orders o on o.id = i.order_id join public.accounts a on a.id = o.account_id
      where i.kind = 'invoice' and i.paid_at is null and i.voided_at is null and i.due_at < now()
      union all
      -- Money taken against an order that no longer exists: a refund owed, and nothing else said it.
      select 'refund-'||o.id, 'refund_due', 'err', 'order', o.id, o.number, axiom.net_paid(o.id), o.updated_at, jsonb_build_object('account', a.name)
      from public.orders o join public.accounts a on a.id = o.account_id
      where o.state = 'cancelled' and axiom.net_paid(o.id) > 0
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
      -- A lead nobody has answered. It leaves the feed the moment someone moves it on.
      select 'lead-'||l.id, 'lead_new', 'warn', 'lead', l.id, l.name, null::bigint, l.created_at, jsonb_build_object('account', coalesce(a.name, l.clinic, l.name))
      from public.leads l left join public.accounts a on a.id = l.account_id where l.stage = 'new'
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
      -- The account is owed money back; it should not have to notice that for itself.
      select 'refund-'||o.id, 'refund_due', 'warn', 'order', o.id, o.number, axiom.net_paid(o.id), null::timestamptz, '{}'::jsonb
      from public.orders o where axiom.member_of(o.account_id) and o.state = 'cancelled' and axiom.net_paid(o.id) > 0
      union all
      select 'o-progress-'||o.id, 'order_'||o.state, 'info', 'order', o.id, o.number, o.total_idr, null::timestamptz, '{}'::jsonb
      from public.orders o where axiom.member_of(o.account_id) and o.state in ('packing','dispatched');
  end if;
end $$;

-- 0003 granted the schema wholesale; these functions were created after it, so they are granted
-- one by one, as 0007 does. Each checks the caller's role itself before it writes.
revoke execute on function axiom.link_member(uuid, uuid, boolean) from public, anon;
revoke execute on function axiom.unlink_member(uuid) from public, anon;
revoke execute on function axiom.set_lead_stage(uuid, public.lead_stage, text) from public, anon;
grant execute on function axiom.link_member(uuid, uuid, boolean) to authenticated, service_role;
grant execute on function axiom.unlink_member(uuid) to authenticated, service_role;
grant execute on function axiom.set_lead_stage(uuid, public.lead_stage, text) to authenticated, service_role;

-- net_paid answers only for the caller's own orders (or to staff), so the surfaces may read it.
revoke execute on function axiom.net_paid(uuid) from public, anon;
grant execute on function axiom.net_paid(uuid) to authenticated, service_role;

-- Internal: read inside the definer functions above, never called from a surface.
revoke execute on function axiom.lead_rank(public.lead_stage) from public, anon, authenticated;
revoke execute on function axiom.advance_lead(uuid, public.lead_stage) from public, anon, authenticated;
revoke execute on function axiom.log_quote(uuid, text, text) from public, anon, authenticated;

-- Leads that already exist were written before the pipeline moved; bring them to where the record
-- they are attached to actually stands, so the queue starts honest.
update public.leads l set stage = 'won'    where exists (select 1 from public.quotes q where q.id = l.quote_id and q.state = 'accepted');
update public.leads l set stage = 'quoted' where l.stage = 'new' and exists (select 1 from public.quotes q where q.id = l.quote_id and q.state = 'sent');
update public.leads l set stage = 'lost'   where l.stage = 'new' and exists (select 1 from public.quotes q where q.id = l.quote_id and q.state = 'lost');
