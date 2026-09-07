-- Local Postgres only. Supabase provides auth.users, auth.uid(), auth.role(), auth.jwt() and the
-- anon / authenticated / service_role roles itself; this stub gives plain Postgres the same
-- surface so the identical migrations, policies and gate tests run without the Supabase stack.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon')          then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')  then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique,
  created_at  timestamptz not null default now()
);

create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', current_setting('role', true))
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
-- anon reads; it never writes. Supabase's own default grants `all` to anon here, which quietly
-- hands an unauthenticated caller TRUNCATE on every table added later — and TRUNCATE is the one
-- write that row-level security does not reach. 0003 grants what each role actually needs.
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant all on tables to authenticated, service_role;
alter default privileges in schema public revoke truncate on tables from authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
grant select on auth.users to service_role, authenticated;
