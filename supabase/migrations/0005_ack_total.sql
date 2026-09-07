-- axiom.ack_state_for is read by scripts and jobs that run outside an authenticated session, where
-- the 0004 caller guard returned NULL rather than a state. NULL is not a state: make the function
-- total. It stays closed to a caller who is neither staff nor a member — such a caller now reads
-- 'none', which is the safe default and discloses nothing about the account.
create or replace function axiom.ack_state_for(acct uuid) returns text
language sql stable security definer set search_path = public as $$
  with permitted as (
    -- `current_user` inside a definer function is the function's owner, never the caller, so the
    -- trusted-caller test reads the role the session actually assumed: the app sets 'anon' or
    -- 'authenticated' per request, while a migration, a job or the gate suite assumes none.
    select axiom.is_staff() or axiom.member_of(acct)
        or coalesce(current_setting('role', true), 'none') in ('none', 'service_role') as ok
  ), age as (
    -- §4 reads "18+ AND qualified researcher": without an age acknowledgement there is no state.
    select exists (
      select 1 from public.acknowledgements a
      where a.kind = 'age_18'
        and (a.account_id = acct or a.profile_id in (select profile_id from public.account_members where account_id = acct))
    ) ok
  ), last as (
    select max(a.acknowledged_at) at
    from public.acknowledgements a
    where a.kind = 'qualified_researcher'
      and (a.account_id = acct or a.profile_id in (select profile_id from public.account_members where account_id = acct))
  )
  select case
    when not (select ok from permitted) then 'none'
    when not (select ok from age) then 'none'
    when (select at from last) is null then 'none'
    when (select at from last) > now() - interval '10 months' then 'current'
    when (select at from last) > now() - interval '12 months' then 'expiring'
    else 'lapsed' end
$$;
