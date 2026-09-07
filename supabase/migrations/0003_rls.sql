-- AXIOM platform — row-level security. Every table: RLS on, explicit policy.
-- A table with RLS enabled and no policy is invisible; that is a silent failure, so each table
-- below has at least one policy and the gate test counts them.

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema axiom to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated, service_role;
grant insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema axiom to anon, authenticated, service_role;
revoke all on axiom.stock_all from anon, authenticated;
revoke all on public.doc_sequences from anon, authenticated;
revoke all on public.variant_stock from anon, authenticated;

-- ------------------------------------------------ helpers as inline expressions
-- staff: axiom.is_staff()   owner: axiom.is_owner()   member: axiom.member_of(account_id)

-- accounts
alter table public.accounts enable row level security;
create policy accounts_read  on public.accounts for select using (axiom.is_staff() or axiom.member_of(id));
create policy accounts_write on public.accounts for all using (axiom.is_staff()) with check (axiom.is_staff());
create policy accounts_self_update on public.accounts for update using (axiom.member_of(id)) with check (axiom.member_of(id));

-- profiles
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select using (axiom.is_staff() or id = auth.uid() or exists (select 1 from public.account_members m where m.profile_id = public.profiles.id and axiom.member_of(m.account_id)));
create policy profiles_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_owner on public.profiles for all using (axiom.is_owner()) with check (axiom.is_owner());
create policy profiles_insert_self on public.profiles for insert with check (id = auth.uid() and role in ('client','clinic'));

create or replace function axiom.guard_profile_role() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.account_id is distinct from old.account_id) and not axiom.is_owner() then
    raise insufficient_privilege using message = 'only the owner changes roles and account links';
  end if;
  return new;
end $$;
create trigger t_profile_role before update on public.profiles for each row execute function axiom.guard_profile_role();

-- account_members / sites / acknowledgements
alter table public.account_members enable row level security;
create policy members_read  on public.account_members for select using (axiom.is_staff() or axiom.member_of(account_id));
create policy members_write on public.account_members for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.account_sites enable row level security;
create policy sites_read  on public.account_sites for select using (axiom.is_staff() or axiom.member_of(account_id));
create policy sites_write on public.account_sites for all using (axiom.is_staff() or axiom.member_of(account_id)) with check (axiom.is_staff() or axiom.member_of(account_id));

alter table public.acknowledgements enable row level security;
create policy ack_read   on public.acknowledgements for select using (axiom.is_staff() or profile_id = auth.uid() or (account_id is not null and axiom.member_of(account_id)));
create policy ack_insert on public.acknowledgements for insert with check (profile_id = auth.uid() or axiom.is_staff());

-- catalogue: education is public, commerce is gated
alter table public.pathways enable row level security;
create policy pathways_read  on public.pathways for select using (true);
create policy pathways_write on public.pathways for all using (axiom.is_owner()) with check (axiom.is_owner());

alter table public.products enable row level security;
create policy products_read  on public.products for select using (true);
create policy products_write on public.products for all using (axiom.is_staff()) with check (axiom.is_staff());

-- The variant row itself (which carries price_idr) is visible only when the caller may see prices.
-- Everyone else reads the catalogue through v_catalogue, where the price column is null for them.
alter table public.product_variants enable row level security;
create policy variants_read on public.product_variants for select using (
  axiom.is_staff() or axiom.prices_visible()
  or exists (select 1 from public.products p where p.id = product_id and p.kind <> 'peptide')
);
create policy variants_write on public.product_variants for all using (axiom.is_staff()) with check (axiom.is_staff());

-- cost: owner only, at the database. The policy raises for anyone else, so the query is refused.
alter table public.variant_costs enable row level security;
create policy costs_owner on public.variant_costs for all using (axiom.require_owner()) with check (axiom.require_owner());

alter table public.product_references enable row level security;
create policy refs_read  on public.product_references for select using (true);
create policy refs_write on public.product_references for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.price_changes enable row level security;
create policy price_changes_read on public.price_changes for select using (axiom.is_staff());
create policy price_changes_write on public.price_changes for insert with check (axiom.is_owner());

alter table public.site_settings enable row level security;
create policy settings_read  on public.site_settings for select using (key not in ('bank','entity') or axiom.is_staff() or auth.uid() is not null);
create policy settings_write on public.site_settings for all using (axiom.is_owner()) with check (axiom.is_owner());

alter table public.delivery_zones enable row level security;
create policy zones_read  on public.delivery_zones for select using (true);
create policy zones_write on public.delivery_zones for all using (axiom.is_owner()) with check (axiom.is_owner());

-- stock
alter table public.stock_movements enable row level security;
create policy stock_read   on public.stock_movements for select using (axiom.is_staff());
create policy stock_insert on public.stock_movements for insert with check (axiom.is_staff());

alter table public.variant_stock enable row level security;
create policy balance_read on public.variant_stock for select using (axiom.is_staff());

alter table public.lots enable row level security;
create policy lots_read  on public.lots for select using (axiom.is_staff());
create policy lots_write on public.lots for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.coa_documents enable row level security;
create policy coa_read  on public.coa_documents for select using (is_sample or axiom.is_staff());
create policy coa_write on public.coa_documents for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.doc_sequences enable row level security;
create policy seq_staff on public.doc_sequences for all using (axiom.is_staff()) with check (axiom.is_staff());

-- quotes and orders: staff, or the account's own; peptide lines only with a current acknowledgement
alter table public.quotes enable row level security;
create policy quotes_read  on public.quotes for select using (axiom.is_staff() or axiom.member_of(account_id));
create policy quotes_write on public.quotes for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.quote_items enable row level security;
create policy quote_items_read on public.quote_items for select using (
  axiom.is_staff() or exists (
    select 1 from public.quotes q join public.product_variants v on v.id = public.quote_items.variant_id join public.products p on p.id = v.product_id
    where q.id = quote_id and axiom.member_of(q.account_id) and (p.kind <> 'peptide' or axiom.account_has_ack(q.account_id))));
create policy quote_items_write on public.quote_items for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.quote_item_costs enable row level security;
create policy quote_item_costs_owner on public.quote_item_costs for all using (axiom.require_owner()) with check (axiom.require_owner());

alter table public.quote_events enable row level security;
create policy quote_events_read on public.quote_events for select using (axiom.is_staff() or exists (select 1 from public.quotes q where q.id = quote_id and axiom.member_of(q.account_id)));
create policy quote_events_write on public.quote_events for insert with check (axiom.is_staff());

alter table public.orders enable row level security;
create policy orders_read  on public.orders for select using (axiom.is_staff() or axiom.member_of(account_id));
create policy orders_write on public.orders for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.order_items enable row level security;
create policy order_items_read on public.order_items for select using (
  axiom.is_staff() or exists (
    select 1 from public.orders o join public.product_variants v on v.id = public.order_items.variant_id join public.products p on p.id = v.product_id
    where o.id = order_id and axiom.member_of(o.account_id) and (p.kind <> 'peptide' or axiom.account_has_ack(o.account_id))));
create policy order_items_write on public.order_items for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.order_item_costs enable row level security;
create policy order_item_costs_owner on public.order_item_costs for all using (axiom.require_owner()) with check (axiom.require_owner());

alter table public.order_events enable row level security;
create policy order_events_read on public.order_events for select using (axiom.is_staff() or exists (select 1 from public.orders o where o.id = order_id and axiom.member_of(o.account_id)));
create policy order_events_write on public.order_events for insert with check (axiom.is_staff());

alter table public.shipments enable row level security;
create policy shipments_read  on public.shipments for select using (axiom.is_staff() or exists (select 1 from public.orders o where o.id = order_id and axiom.member_of(o.account_id)));
create policy shipments_write on public.shipments for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.invoices enable row level security;
create policy invoices_read  on public.invoices for select using (axiom.is_staff() or exists (select 1 from public.orders o where o.id = order_id and axiom.member_of(o.account_id)));
create policy invoices_write on public.invoices for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.invoice_items enable row level security;
create policy invoice_items_read on public.invoice_items for select using (axiom.is_staff() or exists (select 1 from public.invoices i join public.orders o on o.id = i.order_id where i.id = invoice_id and axiom.member_of(o.account_id)));
create policy invoice_items_write on public.invoice_items for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.invoice_events enable row level security;
create policy invoice_events_read on public.invoice_events for select using (axiom.is_staff() or exists (select 1 from public.invoices i join public.orders o on o.id = i.order_id where i.id = invoice_id and axiom.member_of(o.account_id)));
create policy invoice_events_write on public.invoice_events for insert with check (axiom.is_staff());

-- baskets: an account's members; anonymous baskets go through the cart functions
alter table public.carts enable row level security;
create policy carts_member on public.carts for all using (axiom.is_staff() or (account_id is not null and axiom.member_of(account_id))) with check (axiom.is_staff() or (account_id is not null and axiom.member_of(account_id)));

alter table public.cart_items enable row level security;
create policy cart_items_member on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and (axiom.is_staff() or (c.account_id is not null and axiom.member_of(c.account_id)))))
  with check (exists (select 1 from public.carts c where c.id = cart_id and (axiom.is_staff() or (c.account_id is not null and axiom.member_of(c.account_id)))));

alter table public.leads enable row level security;
create policy leads_staff on public.leads for all using (axiom.is_staff()) with check (axiom.is_staff());

alter table public.activities enable row level security;
create policy activities_staff on public.activities for all using (axiom.is_staff()) with check (axiom.is_staff());

-- ------------------------------------------------ anonymous basket and public request path
create or replace function axiom.cart_for(anon text, acct uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if acct is not null then
    if not (axiom.is_staff() or axiom.member_of(acct)) then raise insufficient_privilege; end if;
    select id into cid from public.carts where account_id = acct;
    if cid is null then insert into public.carts (account_id) values (acct) returning id into cid; end if;
    -- merge the anonymous basket into the account's on sign-in
    if anon is not null then
      insert into public.cart_items (cart_id, variant_id, qty, site_id)
      select cid, variant_id, qty, null from public.cart_items ci join public.carts c on c.id = ci.cart_id where c.anon_key = anon
      on conflict (cart_id, variant_id, site_id) do update set qty = public.cart_items.qty + excluded.qty;
      delete from public.carts where anon_key = anon;
    end if;
    return cid;
  end if;
  if anon is null or length(anon) < 16 then raise exception 'anonymous basket key required'; end if;
  select id into cid from public.carts where anon_key = anon;
  if cid is null then insert into public.carts (anon_key) values (anon) returning id into cid; end if;
  return cid;
end $$;

create or replace function axiom.cart_set(cid uuid, anon text, sku_or_id text, qty int, site uuid default null) returns void
language plpgsql security definer set search_path = public as $$
declare vid uuid; ok boolean;
begin
  select (c.anon_key is not null and c.anon_key = anon) or (c.account_id is not null and (axiom.member_of(c.account_id) or axiom.is_staff()))
    into ok from public.carts c where c.id = cid;
  if not coalesce(ok, false) then raise insufficient_privilege; end if;
  select id into vid from public.product_variants where sku = sku_or_id or id::text = sku_or_id;
  if vid is null then raise exception 'unknown variant %', sku_or_id; end if;
  if qty <= 0 then
    delete from public.cart_items where cart_id = cid and variant_id = vid and site_id is not distinct from site;
  else
    insert into public.cart_items (cart_id, variant_id, qty, site_id) values (cid, vid, qty, site)
    on conflict (cart_id, variant_id, site_id) do update set qty = excluded.qty;
  end if;
  update public.carts set updated_at = now() where id = cid;
end $$;

create or replace function axiom.cart_items_for(cid uuid, anon text) returns table (variant_id uuid, sku text, qty int, site_id uuid)
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select (c.anon_key is not null and c.anon_key = anon) or (c.account_id is not null and (axiom.member_of(c.account_id) or axiom.is_staff()))
    into ok from public.carts c where c.id = cid;
  if not coalesce(ok, false) then return; end if;
  return query select ci.variant_id, v.sku, ci.qty, ci.site_id from public.cart_items ci join public.product_variants v on v.id = ci.variant_id where ci.cart_id = cid order by v.sort;
end $$;

-- Signed out: name, clinic, role, email, WhatsApp; creates a lead, an unverified account and a
-- requested quote. The acknowledgement request is sent by the app. Nothing here prices anything.
create or replace function axiom.submit_public_request(p_name text, p_clinic text, p_role text, p_email text, p_whatsapp text, lines jsonb, p_locale text default 'id', anon text default null)
returns table (lead_id uuid, account_id uuid, quote_id uuid, quote_number text)
language plpgsql security definer set search_path = public as $$
declare acct uuid; qid uuid; lid uuid; t public.account_type;
begin
  if coalesce(p_name,'') = '' or (coalesce(p_email,'') = '' and coalesce(p_whatsapp,'') = '') then
    raise exception 'name and a contact are required' using errcode = 'check_violation';
  end if;
  t := case when coalesce(p_clinic,'') = '' then 'individual' when p_role ilike '%research%' or p_role ilike '%lab%' or p_role ilike '%univers%' then 'institution' else 'clinic' end;
  insert into public.accounts (name, type, whatsapp, email, notes) values (coalesce(nullif(p_clinic,''), p_name), t, p_whatsapp, p_email, 'Unverified · created from the public request form') returning id into acct;
  insert into public.account_sites (account_id, name, is_default) values (acct, 'Primary', true);
  insert into public.leads (name, clinic, role_title, email, whatsapp, source, stage, account_id) values (p_name, p_clinic, p_role, p_email, p_whatsapp, 'site', 'new', acct) returning id into lid;
  perform set_config('axiom.in_fn', '1', true);
  insert into public.quotes (account_id, state, notes) values (acct, 'requested', 'Public request · ' || p_name || coalesce(' · ' || p_role, '')) returning id into qid;
  insert into public.quote_items (quote_id, variant_id, qty)
  select qid, v.id, greatest((x->>'qty')::int, 1) from jsonb_array_elements(lines) x join public.product_variants v on v.sku = x->>'sku';
  insert into public.quote_events (quote_id, actor_label, from_state, to_state) values (qid, p_name, 'new', 'requested');
  update public.leads set quote_id = qid where id = lid;
  if anon is not null then delete from public.carts where anon_key = anon; end if;
  return query select lid, acct, qid, q.number from public.quotes q where q.id = qid;
end $$;

-- "Prices as at": the most recent price change, for the public price list.
create or replace function axiom.prices_as_at() returns timestamptz
language sql stable security definer set search_path = public as $$
  select coalesce((select max(changed_at) from public.price_changes), (select max(updated_at) from public.product_variants))
$$;

-- Public compound guide helper: references count per product (education is public).
create or replace function axiom.reference_count(pid uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.product_references where product_id = pid
$$;
