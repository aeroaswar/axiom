-- AXIOM platform — the protocol card.
--
-- One card per client, reached by a QR code. The QR encodes a URL and nothing else: the card
-- behind it is mutable, so a card printed with the first consignment is still the right card on
-- the fifth. Compounds are appended over months by AXIOM in the Console and by the account's own
-- members; the printed square never changes.
--
-- Two identifiers, and the difference is the whole access model. `number` is the handle ops says
-- out loud and writes on a packing note. `code` is 96 bits of randomness, appears only inside the
-- QR, and is the sole thing an anonymous holder presents. Neither is a capability to write: the
-- card is read through one definer function and every write requires a session.
--
-- The dosing recorded here is AXIOM's own, entered per client (decision 12 in docs/DECISIONS.md).
-- It is an operational record about one account, not catalogue copy, and it is deliberately
-- outside the reach of gate 9 — which lints what AXIOM publishes to everybody. Nothing in this
-- migration relaxes that gate, and no amount, frequency or route may become a literal in src/ or
-- messages/ as a result of it.

-- Crockford base32 over 10 random bytes. Defined before the table whose default calls it.
create or replace function axiom.new_protocol_code() returns text
language sql volatile security definer set search_path = public, axiom, pg_catalog as $$
  select string_agg(substr('0123456789ABCDEFGHJKMNPQRSTVWXYZ',
                           get_byte(b, i) % 32 + 1, 1), '')
  from (select gen_random_bytes(16) b) g, generate_series(0, 15) i
$$;

create type public.protocol_state as enum ('draft','issued','revoked');
create type public.recur_freq     as enum ('once','daily','weekly','monthly');

create table public.protocols (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  number        text not null unique default '',        -- 'AX-PC-2609-0001', trigger-generated
  -- 80 bits in Crockford base32: guessing is not a threat model, and when a scan fails on a
  -- scuffed vial box someone has to read this out loud. The alphabet drops I, L, O and U, so
  -- there is no 0/O or 1/l to mishear, and it is uppercase because the path is case-sensitive.
  code          text not null unique default axiom.new_protocol_code() check (code ~ '^[0-9A-HJKMNP-TV-Z]{16}$'),
  subject_label text not null,                           -- the client's name as it prints, frozen at issue
  title         text not null default '',
  state         public.protocol_state not null default 'draft',
  locale        text not null default 'id',
  tz            text not null default 'Asia/Jakarta',
  starts_on     date not null default current_date,
  order_id      uuid references public.orders(id),       -- provenance, optional
  issued_at     timestamptz,
  revoked_at    timestamptz,
  -- Bumped by a trigger on every item write. A calendar subscriber's ETag is built from this, so
  -- an added compound invalidates the feed without anything having to remember to say so.
  ics_seq       int not null default 0,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.protocols(account_id, state);

create table public.protocol_items (
  id           uuid primary key default gen_random_uuid(),
  protocol_id  uuid not null references public.protocols(id) on delete cascade,
  variant_id   uuid not null references public.product_variants(id),
  lot_id       uuid references public.lots(id),
  brief        text not null default '',
  amount       text,
  route        text,
  freq         public.recur_freq not null default 'weekly',
  every_n      int not null default 1 check (every_n between 1 and 52),
  -- Straight into an RRULE, which is not a quoted value and cannot be escaped on the way out. A
  -- constraint here is what stops a form field from writing a line of its own into an .ics file.
  byday        text[] not null default '{}' check (byday <@ array['MO','TU','WE','TH','FR','SA','SU']),
  at_time      time not null default '08:00',
  starts_on    date,
  ends_on      date,
  occurrences  int check (occurrences is null or occurrences > 0),
  -- RRULE takes UNTIL or COUNT, never both (RFC 5545 §3.3.10). A row that carried both would
  -- produce a rule Apple Calendar rejects outright, so the pair is refused at the column.
  constraint protocol_items_end_once check (ends_on is null or occurrences is null),
  reminder_min int not null default 30 check (reminder_min between 0 and 10080),
  -- A compound is ended, never deleted. Removing the row would drop its VEVENT from the feed,
  -- and a subscribed calendar keeps an event it simply stops being told about: the client would
  -- go on being reminded of a compound they have stopped. The feed emits STATUS:CANCELLED for a
  -- recently ended item instead, which is the only thing that clears it from Apple and Google.
  is_active    boolean not null default true,
  ended_at     timestamptz,
  seq          int not null default 0,                   -- this item's VEVENT SEQUENCE
  sort         int not null default 0,
  added_by     uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.protocol_items(protocol_id, sort);
create index on public.protocol_items(protocol_id) where is_active;
-- No unique index on (protocol_id, variant_id): one compound may legitimately carry two schedules.

create table public.protocol_events (
  id          bigint generated always as identity primary key,
  protocol_id uuid not null references public.protocols(id) on delete cascade,
  at          timestamptz not null default now(),
  actor_id    uuid references public.profiles(id),
  actor_label text not null,
  kind        text not null,                             -- issued | item_added | item_changed | item_ended | revoked
  detail      text not null default ''
);
create index on public.protocol_events(protocol_id, at);

-- ---------------------------------------------------------------- numbering and sequence
create or replace function axiom.set_protocol_number() returns trigger
language plpgsql security definer set search_path = public as $$
declare p text := to_char(now(), 'YYMM');
begin
  if new.number is null or new.number = '' then new.number := axiom.next_number('protocol', 'AX-PC-' || p || '-', p); end if;
  return new;
end $$;
create trigger t_protocol_number before insert on public.protocols for each row execute function axiom.set_protocol_number();

-- An edited event must carry a higher SEQUENCE or a calendar that already holds it ignores the
-- update. Bumped here rather than in each writer, so a direct staff UPDATE cannot forget.
create or replace function axiom.bump_protocol_item() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.seq := old.seq + 1;
  new.updated_at := now();
  return new;
end $$;
create trigger t_protocol_item_seq before update on public.protocol_items for each row execute function axiom.bump_protocol_item();

create or replace function axiom.touch_protocol() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.protocols set ics_seq = ics_seq + 1, updated_at = now()
  where id = coalesce(new.protocol_id, old.protocol_id);
  return coalesce(new, old);
end $$;
create trigger t_protocol_touch after insert or update or delete on public.protocol_items
for each row execute function axiom.touch_protocol();

-- ---------------------------------------------------------------- the anonymous read path
-- The one thing a QR holder may call. `security definer`, so row-level security does not apply
-- inside it and every column it returns is a column it chose to publish: it names them one by one
-- and never touches v_catalogue, whose price column is visible to the definer and gated for the
-- caller. A `select *` here would hand the whole peptide price list to anyone holding a code.
-- Null for a draft, a revoked card, or a code that does not exist — the page 404s on all three.
create or replace function axiom.protocol_card(p_code text) returns jsonb
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  select jsonb_build_object(
    'number',     pr.number,
    'title',      pr.title,
    'subject',    pr.subject_label,
    'locale',     pr.locale,
    'tz',         pr.tz,
    'starts_on',  pr.starts_on,
    'issued_at',  pr.issued_at,
    'updated_at', pr.updated_at,
    'seq',        pr.ics_seq,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',                it.id,
        'name',              p.name,
        'sku',               v.sku,
        'pack',              v.dose,          -- the vial's size, not a schedule
        'content',           v.content,
        'cold_chain',        v.is_cold_chain,
        'slug',              p.slug,
        'pathway_slug',      pw.slug,
        'published',         p.is_published,
        'compound_class_en', p.compound_class_en,
        'compound_class_id', p.compound_class_id,
        'brief',             it.brief,
        'amount',            it.amount,
        'route',             it.route,
        'freq',              it.freq,
        'every_n',           it.every_n,
        'byday',             it.byday,
        'at_time',           to_char(it.at_time, 'HH24:MI'),
        'starts_on',         coalesce(it.starts_on, pr.starts_on),
        'ends_on',           it.ends_on,
        'occurrences',       it.occurrences,
        'reminder_min',      it.reminder_min,
        'seq',               it.seq,
        'active',            it.is_active,
        'ended_at',          it.ended_at,
        'lot_code',          coalesce(l.lot_code, c.lot_code),
        'coa', case when c.id is null then null else jsonb_build_object(
                 'method', c.method, 'purity_pct', c.purity_pct,
                 'issued_at', c.issued_at, 'file_path', c.file_path, 'is_sample', c.is_sample) end
      ) order by it.sort, it.created_at)
      from public.protocol_items it
      join public.product_variants v on v.id = it.variant_id
      join public.products p on p.id = v.product_id
      join public.pathways pw on pw.id = p.pathway_id
      left join public.lots l on l.id = it.lot_id
      left join lateral (
        select d.* from public.coa_documents d
        where (it.lot_id is not null and d.lot_id = it.lot_id)
           or (it.lot_id is null and d.variant_id = v.id)
        order by (d.lot_id is not null) desc, d.issued_at desc nulls last
        limit 1) c on true
      -- Ended items stay in the payload for sixty days so the feed can carry their cancellation;
      -- after that every calendar has seen it and the row stops being published.
      where it.protocol_id = pr.id
        and (it.is_active or it.ended_at > now() - interval '60 days')
    ), '[]'::jsonb))
  from public.protocols pr
  where pr.code = p_code and pr.state = 'issued'
$$;

-- The account behind a card, for the magic-link flow: the link must reach the address on file and
-- never an address typed into a public page. The address itself is never returned to a browser —
-- this is service_role only, read server-side in the action that sends the link, so holding a code
-- reveals that a card exists and nothing about who holds it.
create or replace function axiom.protocol_contact(p_code text)
returns table (account_id uuid, email text, locale text)
language sql stable security definer set search_path = public, axiom, pg_catalog as $$
  select a.id, nullif(a.email, ''), pr.locale
  from public.protocols pr join public.accounts a on a.id = pr.account_id
  where pr.code = p_code and pr.state = 'issued'
$$;

-- ---------------------------------------------------------------- writers
-- Authority in one place. A card belongs to an account; AXIOM writes any card, an account's own
-- members write theirs, and a withdrawn card takes no further writes from anyone. Every refusal
-- here is marked check_violation because it is a sentence the clinic is meant to read
-- (src/lib/db.ts passes only that class through to an account screen).
create or replace function axiom.protocol_writable(p_protocol uuid) returns uuid
language plpgsql stable security definer set search_path = public, axiom, pg_catalog as $$
declare v_acct uuid; v_state public.protocol_state;
begin
  select account_id, state into v_acct, v_state from public.protocols where id = p_protocol;
  if v_acct is null then
    raise exception 'no such protocol card' using errcode = 'check_violation';
  end if;
  if v_state = 'revoked' then
    raise exception 'this card has been withdrawn' using errcode = 'check_violation';
  end if;
  if not (axiom.is_staff() or axiom.member_of(v_acct)) then
    raise exception 'this card belongs to another account' using errcode = 'check_violation';
  end if;
  return v_acct;
end $$;

-- A lot id arrives from a form field exactly as a site id did before 0007, and inside a definer
-- function no policy would catch one belonging to a different compound. A card that named the
-- wrong lot would link the wrong certificate, which is the one thing a certificate cannot do.
create or replace function axiom.lot_of(p_variant uuid, p_lot uuid) returns uuid
language plpgsql stable security definer set search_path = public, axiom, pg_catalog as $$
begin
  if p_lot is null then return null; end if;
  if not exists (select 1 from public.lots l where l.id = p_lot and l.variant_id = p_variant) then
    raise exception 'that lot is not a lot of this compound' using errcode = 'check_violation';
  end if;
  return p_lot;
end $$;

-- AXIOM issues a card, and only against an account whose qualified-researcher acknowledgement is
-- current: the same gate that decides whether a peptide has a price decides whether it has a card.
create or replace function axiom.issue_protocol(
  p_account uuid, p_title text default '', p_subject text default null,
  p_locale text default 'id', p_starts date default null
) returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare v_id uuid; v_subject text;
begin
  if not axiom.is_staff() then
    raise exception 'only AXIOM issues a protocol card' using errcode = 'check_violation';
  end if;
  select coalesce(nullif(p_subject, ''), a.name) into v_subject from public.accounts a where a.id = p_account;
  if v_subject is null then
    raise exception 'no such account' using errcode = 'check_violation';
  end if;
  if not axiom.account_has_ack(p_account) then
    raise exception 'this account has no current qualified-researcher acknowledgement' using errcode = 'check_violation';
  end if;
  insert into public.protocols (account_id, subject_label, title, locale, starts_on, state, issued_at, created_by)
  values (p_account, v_subject, coalesce(p_title, ''), coalesce(nullif(p_locale, ''), 'id'),
          coalesce(p_starts, current_date), 'issued', now(), auth.uid())
  returning id into v_id;
  insert into public.protocol_events (protocol_id, actor_id, actor_label, kind, detail)
  values (v_id, auth.uid(), axiom.actor_label(), 'issued', v_subject);
  return v_id;
end $$;

create or replace function axiom.add_protocol_item(
  p_protocol uuid, p_variant uuid, p_lot uuid default null, p_brief text default '',
  p_amount text default null, p_route text default null,
  p_freq public.recur_freq default 'weekly', p_every_n int default 1, p_byday text[] default '{}',
  p_at time default '08:00', p_starts date default null, p_ends date default null,
  p_occurrences int default null, p_reminder int default 30
) returns uuid
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare v_id uuid; v_name text;
begin
  perform axiom.protocol_writable(p_protocol);
  select p.name into v_name from public.product_variants v join public.products p on p.id = v.product_id where v.id = p_variant;
  if v_name is null then
    raise exception 'no such compound' using errcode = 'check_violation';
  end if;
  insert into public.protocol_items (
    protocol_id, variant_id, lot_id, brief, amount, route, freq, every_n, byday,
    at_time, starts_on, ends_on, occurrences, reminder_min, sort, added_by)
  values (
    p_protocol, p_variant, axiom.lot_of(p_variant, p_lot), coalesce(p_brief, ''), nullif(p_amount, ''), nullif(p_route, ''),
    p_freq, p_every_n, coalesce(p_byday, '{}'), coalesce(p_at, '08:00'), p_starts, p_ends, p_occurrences,
    coalesce(p_reminder, 30),
    coalesce((select max(sort) + 1 from public.protocol_items where protocol_id = p_protocol), 1),
    auth.uid())
  returning id into v_id;
  insert into public.protocol_events (protocol_id, actor_id, actor_label, kind, detail)
  values (p_protocol, auth.uid(), axiom.actor_label(), 'item_added', v_name);
  return v_id;
end $$;

create or replace function axiom.update_protocol_item(
  p_item uuid, p_lot uuid default null, p_brief text default '',
  p_amount text default null, p_route text default null,
  p_freq public.recur_freq default 'weekly', p_every_n int default 1, p_byday text[] default '{}',
  p_at time default '08:00', p_starts date default null, p_ends date default null,
  p_occurrences int default null, p_reminder int default 30
) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare v_protocol uuid; v_variant uuid; v_name text;
begin
  select protocol_id, variant_id into v_protocol, v_variant from public.protocol_items where id = p_item;
  if v_protocol is null then
    raise exception 'no such line on this card' using errcode = 'check_violation';
  end if;
  perform axiom.protocol_writable(v_protocol);
  update public.protocol_items set
    lot_id = axiom.lot_of(v_variant, p_lot), brief = coalesce(p_brief, ''),
    amount = nullif(p_amount, ''), route = nullif(p_route, ''),
    freq = p_freq, every_n = p_every_n, byday = coalesce(p_byday, '{}'),
    at_time = coalesce(p_at, '08:00'), starts_on = p_starts, ends_on = p_ends,
    occurrences = p_occurrences, reminder_min = coalesce(p_reminder, 30)
  where id = p_item;
  select p.name into v_name from public.product_variants v join public.products p on p.id = v.product_id where v.id = v_variant;
  insert into public.protocol_events (protocol_id, actor_id, actor_label, kind, detail)
  values (v_protocol, auth.uid(), axiom.actor_label(), 'item_changed', v_name);
end $$;

-- Ends a compound rather than deleting it; see the note on protocol_items.is_active.
create or replace function axiom.end_protocol_item(p_item uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
declare v_protocol uuid; v_name text;
begin
  select it.protocol_id, p.name into v_protocol, v_name
  from public.protocol_items it
  join public.product_variants v on v.id = it.variant_id
  join public.products p on p.id = v.product_id
  where it.id = p_item;
  if v_protocol is null then
    raise exception 'no such line on this card' using errcode = 'check_violation';
  end if;
  perform axiom.protocol_writable(v_protocol);
  update public.protocol_items set is_active = false, ended_at = now()
  where id = p_item and is_active;
  insert into public.protocol_events (protocol_id, actor_id, actor_label, kind, detail)
  values (v_protocol, auth.uid(), axiom.actor_label(), 'item_ended', v_name);
end $$;

-- Withdrawing a card is how a printed square is taken out of service: the code stays valid input
-- and stops resolving, so a photographed box stops being a way in.
create or replace function axiom.revoke_protocol(p_protocol uuid) returns void
language plpgsql security definer set search_path = public, axiom, pg_catalog as $$
begin
  if not axiom.is_staff() then
    raise exception 'only AXIOM withdraws a protocol card' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.protocols where id = p_protocol) then
    raise exception 'no such protocol card' using errcode = 'check_violation';
  end if;
  update public.protocols set state = 'revoked', revoked_at = now(), ics_seq = ics_seq + 1, updated_at = now()
  where id = p_protocol and state <> 'revoked';
  insert into public.protocol_events (protocol_id, actor_id, actor_label, kind, detail)
  values (p_protocol, auth.uid(), axiom.actor_label(), 'revoked', '');
end $$;

-- ---------------------------------------------------------------- row-level security
-- Reads only. Every write to these three tables goes through a function above, so the audit trail
-- in protocol_events cannot be sidestepped by a direct UPDATE — not even by the owner.
alter table public.protocols enable row level security;
create policy protocols_read on public.protocols for select
  using (axiom.is_staff() or account_id in (select axiom.my_account_ids()));

alter table public.protocol_items enable row level security;
create policy protocol_items_read on public.protocol_items for select
  using (axiom.is_staff() or exists (
    select 1 from public.protocols pr
    where pr.id = protocol_id and pr.account_id in (select axiom.my_account_ids())));

alter table public.protocol_events enable row level security;
create policy protocol_events_read on public.protocol_events for select
  using (axiom.is_staff() or exists (
    select 1 from public.protocols pr
    where pr.id = protocol_id and pr.account_id in (select axiom.my_account_ids())));

-- ---------------------------------------------------------------- grants
-- 0003 granted select on all tables and execute on all functions to anon; those were one-time
-- grants over what existed then, and nothing extends them to objects created here. What does
-- reach these objects is the default privilege set in 0004 (select on new public tables, to anon)
-- and PostgreSQL's own default of EXECUTE to PUBLIC on every new function. So RLS above is the
-- whole of the table boundary, and each function is named here rather than left to that default.
revoke all on public.protocols, public.protocol_items, public.protocol_events from anon, authenticated;
grant select on public.protocols, public.protocol_items, public.protocol_events to authenticated, service_role;
grant select, insert, update, delete on public.protocols, public.protocol_items, public.protocol_events to service_role;

revoke all on function axiom.new_protocol_code() from public, anon, authenticated;
revoke all on function axiom.set_protocol_number() from public, anon, authenticated;
revoke all on function axiom.bump_protocol_item() from public, anon, authenticated;
revoke all on function axiom.touch_protocol() from public, anon, authenticated;
revoke all on function axiom.protocol_writable(uuid) from public, anon, authenticated;
revoke all on function axiom.lot_of(uuid, uuid) from public, anon;
grant execute on function axiom.lot_of(uuid, uuid) to authenticated, service_role;

revoke all on function axiom.issue_protocol(uuid, text, text, text, date) from public, anon;
grant execute on function axiom.issue_protocol(uuid, text, text, text, date) to authenticated, service_role;
revoke all on function axiom.add_protocol_item(uuid, uuid, uuid, text, text, text, public.recur_freq, int, text[], time, date, date, int, int) from public, anon;
grant execute on function axiom.add_protocol_item(uuid, uuid, uuid, text, text, text, public.recur_freq, int, text[], time, date, date, int, int) to authenticated, service_role;
revoke all on function axiom.update_protocol_item(uuid, uuid, text, text, text, public.recur_freq, int, text[], time, date, date, int, int) from public, anon;
grant execute on function axiom.update_protocol_item(uuid, uuid, text, text, text, public.recur_freq, int, text[], time, date, date, int, int) to authenticated, service_role;
revoke all on function axiom.end_protocol_item(uuid) from public, anon;
grant execute on function axiom.end_protocol_item(uuid) to authenticated, service_role;
revoke all on function axiom.revoke_protocol(uuid) from public, anon;
grant execute on function axiom.revoke_protocol(uuid) to authenticated, service_role;

-- auth_stub.sql:39 grants execute on new functions to anon by default privilege, and Supabase
-- does the same, so every function above had to be named and revoked. This is the one an
-- anonymous QR holder may call, granted deliberately rather than left to that default.
revoke all on function axiom.protocol_card(text) from public;
grant execute on function axiom.protocol_card(text) to anon, authenticated, service_role;
-- Not this one. It returns an email address, so it is read server-side under asService and is
-- reachable from no browser session at all.
revoke all on function axiom.protocol_contact(text) from public, anon, authenticated;
grant execute on function axiom.protocol_contact(text) to service_role;
