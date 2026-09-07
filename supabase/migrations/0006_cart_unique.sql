-- cart_items' unique (cart_id, variant_id, site_id) does not constrain rows whose site_id is null,
-- because Postgres treats NULLs as distinct in a unique constraint. axiom.cart_set's `on conflict`
-- therefore never fired for a line with no destination, and the same lot accumulated a new row on
-- every add. The basket is the public surface most likely to hit that, so the constraint is fixed
-- here rather than worked around in the caller.
delete from public.cart_items a
using public.cart_items b
where a.cart_id = b.cart_id and a.variant_id = b.variant_id
  and a.site_id is not distinct from b.site_id and a.ctid > b.ctid;

alter table public.cart_items drop constraint if exists cart_items_cart_id_variant_id_site_id_key;
create unique index if not exists cart_items_line_uq
  on public.cart_items (cart_id, variant_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- The two writers must name the same expression the index is built on, or ON CONFLICT finds no
-- arbiter. Both are restated here in full so this migration leaves the database consistent.
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
    on conflict (cart_id, variant_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid))
    do update set qty = excluded.qty;
  end if;
  update public.carts set updated_at = now() where id = cid;
end $$;

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
      on conflict (cart_id, variant_id, coalesce(site_id, '00000000-0000-0000-0000-000000000000'::uuid))
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
