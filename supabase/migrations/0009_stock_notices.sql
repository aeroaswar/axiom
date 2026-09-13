-- 0009 · a sold-out lot takes a "tell me when it is back": one row per ask, written through one
-- definer function, readable by staff only. Nothing is promised by it; ops messages when the lot
-- is booked in.

create table public.stock_notices (
  id           uuid primary key default gen_random_uuid(),
  variant_id   uuid not null references public.product_variants(id),
  email        text,
  whatsapp     text,
  locale       text not null default 'id',
  created_at   timestamptz not null default now(),
  notified_at  timestamptz,
  constraint stock_notices_contact_ck check (coalesce(email, '') <> '' or coalesce(whatsapp, '') <> '')
);
create index stock_notices_variant_idx on public.stock_notices (variant_id) where notified_at is null;

alter table public.stock_notices enable row level security;
create policy stock_notices_staff on public.stock_notices for all using (axiom.is_staff()) with check (axiom.is_staff());
revoke all on public.stock_notices from anon, authenticated;
grant select, update on public.stock_notices to authenticated;   -- staff through the policy; a client reads nothing

-- The public ask. Validates the contact and the lot, writes the row, returns its id.
create or replace function axiom.request_stock_notice(p_sku text, p_email text, p_whatsapp text, p_locale text default 'id')
returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare vid uuid; nid uuid;
begin
  if coalesce(p_email, '') = '' and coalesce(p_whatsapp, '') = '' then
    raise exception 'an email or a WhatsApp number is required' using errcode = 'check_violation';
  end if;
  select v.id into vid
    from public.product_variants v join public.products p on p.id = v.product_id
   where v.sku = p_sku and v.is_active and p.is_published;
  if vid is null then raise exception 'unknown lot %', p_sku using errcode = 'check_violation'; end if;
  insert into public.stock_notices (variant_id, email, whatsapp, locale)
  values (vid, nullif(p_email, ''), nullif(p_whatsapp, ''), coalesce(nullif(p_locale, ''), 'id'))
  returning id into nid;
  return nid;
end $$;
grant execute on function axiom.request_stock_notice(text, text, text, text) to anon, authenticated, service_role;

-- Staff: the open asks per lot, for the console and for the day the lot comes back.
create or replace function axiom.stock_notices_open()
returns table (variant_id uuid, sku text, name text, dose text, asks bigint, oldest timestamptz)
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  select n.variant_id, v.sku, p.name, v.dose, count(*)::bigint, min(n.created_at)
    from public.stock_notices n
    join public.product_variants v on v.id = n.variant_id
    join public.products p on p.id = v.product_id
   where n.notified_at is null and axiom.is_staff()
   group by n.variant_id, v.sku, p.name, v.dose
   order by min(n.created_at)
$$;
revoke all on function axiom.stock_notices_open() from public, anon;
grant execute on function axiom.stock_notices_open() to authenticated, service_role;
