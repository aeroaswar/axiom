-- AXIOM platform — Phase 2, first step: the per-lot verification lookup (web-app master prompt §4.6).
--
-- A buyer holding a vial types the lot code printed on its label, or scans the label's QR code, and
-- the site answers from that lot's own record: the compound, the lot, and the latest Certificate of
-- Analysis filed against it. §4.6 reserved `lots` and `coa_documents` so this would be additive,
-- and it is: no table changes shape, and no row becomes readable that was not before.
--
-- `lots` stays staff-only and non-sample `coa_documents` stay staff-only. This migration opens one
-- narrow window instead of a policy: `axiom.verify_lot` takes one code and returns at most one row,
-- matched exactly after normalising case and separators. It never takes a pattern, never returns a
-- list, and names nothing a buyer holding the vial could not already read off its label and
-- certificate — no price, no cost, no stock, no customer, no document path.

-- ================================================================ 1 · one normal form for a code
-- "AX-2606-BPC10", "ax 2606 bpc10" and "AX2606BPC10" are the same label read three ways. The key
-- keeps letters and digits only, upper-cased; everything that matches a code goes through it.
create or replace function axiom.lot_key(code text) returns text
language sql immutable strict parallel safe set search_path = pg_catalog as $$
  select upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'))
$$;

-- Two codes that normalise alike would make a lookup ambiguous, so the database refuses the second
-- one at entry rather than letting verification guess between them. The index also serves the match.
create unique index if not exists lots_lot_key_uniq on public.lots (axiom.lot_key(lot_code));

-- ================================================================ 2 · the lookup
-- `state` is derived here, once, so every surface that shows a lot says the same thing:
--   expired          the lot is past its expiry date
--   awaiting         the lot is received but no analysis has been filed against it yet
--   below_threshold  the filed purity is under the stated threshold — AXIOM does not list such a lot
--   verified         a filed analysis at or above the threshold, within date
-- A certificate belongs to a lot by `lot_id`; a row filed with only the code (as the sample on
-- The standard is) is matched by the code's key.
create or replace function axiom.verify_lot(p_code text)
returns table (
  lot_code     text,
  product      text,
  dose         text,
  received_at  date,
  expires_at   date,
  issued_at    date,
  method       text,
  purity_pct   numeric,
  is_sample    boolean,
  state        text
)
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  with k as (
    select axiom.lot_key(p_code) as key
    where length(coalesce(p_code, '')) <= 40 and length(axiom.lot_key(p_code)) >= 6
  ),
  threshold as (
    select coalesce((select (value->>'purity_threshold_pct')::numeric
                     from public.site_settings where key = 'verification'), 98) as pct
  )
  select l.lot_code, p.name, v.dose, l.received_at, l.expires_at,
         d.issued_at, d.method, d.purity_pct, coalesce(d.is_sample, false),
         case
           when l.expires_at is not null and l.expires_at < current_date then 'expired'
           when d.id is null or d.purity_pct is null then 'awaiting'
           when d.purity_pct < (select pct from threshold) then 'below_threshold'
           else 'verified'
         end
  from k
  join public.lots l on axiom.lot_key(l.lot_code) = k.key
  join public.product_variants v on v.id = l.variant_id
  join public.products p on p.id = v.product_id
  left join lateral (
    select c.id, c.issued_at, c.method, c.purity_pct, c.is_sample
    from public.coa_documents c
    where c.lot_id = l.id or (c.lot_id is null and axiom.lot_key(c.lot_code) = k.key)
    order by c.issued_at desc nulls last
    limit 1
  ) d on true
  limit 1
$$;

revoke all on function axiom.verify_lot(text) from public;
grant execute on function axiom.verify_lot(text) to anon, authenticated, service_role;
