-- ADR-001: server-side atomic credit ledger.
--
-- DO NOT APPLY TO PRODUCTION until DD-103 (server-side payment credit grant)
-- and DD-104 (server-side promo redemption) are done. After this migration the
-- browser can no longer write to `credits` or `transactions`, so the current
-- frontend addCredits() and redeemPromoCode() flows will fail.

-- ── Ledger table ────────────────────────────────────────────────────────────
create table if not exists public.credit_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  request_id  text not null unique,
  delta       integer not null,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists credit_events_user_idx on public.credit_events (user_id, created_at desc);

alter table public.credit_events enable row level security;
revoke all on public.credit_events from public, anon, authenticated;
-- No policies: only service_role (which bypasses RLS) and the SECURITY DEFINER
-- functions below can touch it.

-- ── consume_credits ─────────────────────────────────────────────────────────
-- Atomic and idempotent. The credit_events insert claims p_request_id first, so
-- a retried request is a no-op; the guarded UPDATE is a single statement, so two
-- concurrent calls cannot both spend the last credit. Raising rolls the whole
-- call back, including the claimed event.
create or replace function public.consume_credits(
  p_user       uuid,
  p_amount     integer,
  p_reason     text,
  p_request_id text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_owner   uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;
  if p_request_id is null or length(p_request_id) = 0 then
    raise exception 'invalid_request_id' using errcode = '22023';
  end if;

  insert into credit_events (user_id, request_id, delta, reason)
  values (p_user, p_request_id, -p_amount, p_reason)
  on conflict (request_id) do nothing;

  if not found then
    -- Same request seen before: idempotent no-op, report the current balance.
    select user_id into v_owner from credit_events where request_id = p_request_id;
    if v_owner is distinct from p_user then
      raise exception 'request_id_conflict' using errcode = '23505';
    end if;
    select credits_remaining into v_balance from credits where user_id = p_user;
    return v_balance;
  end if;

  update credits
     set credits_remaining = credits_remaining - p_amount,
         credits_used      = credits_used + p_amount
   where user_id = p_user
     and credits_remaining >= p_amount
  returning credits_remaining into v_balance;

  if not found then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into transactions (user_id, transaction_type, credits_delta, currency, description)
  values (p_user, 'deduction', -p_amount, 'INR', coalesce(p_reason, 'Credit used'));

  return v_balance;
end;
$$;

-- ── refund_credits ──────────────────────────────────────────────────────────
-- Reverses a prior consume exactly once. Unknown request ids are a no-op
-- (returns null) so callers can refund defensively after a lost response.
create or replace function public.refund_credits(p_request_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid;
  v_delta   integer;
  v_balance integer;
begin
  select user_id, delta into v_user, v_delta
    from credit_events
   where request_id = p_request_id and delta < 0;

  if not found then
    return null;
  end if;

  insert into credit_events (user_id, request_id, delta, reason)
  values (v_user, 'refund:' || p_request_id, -v_delta, 'refund of ' || p_request_id)
  on conflict (request_id) do nothing;

  if not found then
    -- Already refunded.
    select credits_remaining into v_balance from credits where user_id = v_user;
    return v_balance;
  end if;

  update credits
     set credits_remaining = credits_remaining - v_delta,
         credits_used      = greatest(0, credits_used + v_delta)
   where user_id = v_user
  returning credits_remaining into v_balance;

  insert into transactions (user_id, transaction_type, credits_delta, currency, description)
  values (v_user, 'restoration', -v_delta, 'INR', 'Credit restored — generation failed');

  return v_balance;
end;
$$;

-- ── Signup seeding (replaces the browser-side seed in useCredits.js) ────────
create or replace function public.docdash_seed_credits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from credits where user_id = new.id) then
    insert into credits (user_id, credits_remaining, credits_used)
    values (new.id, 5, 0);

    insert into credit_events (user_id, request_id, delta, reason)
    values (new.id, 'signup:' || new.id, 5, 'free_tier')
    on conflict (request_id) do nothing;

    insert into transactions (user_id, transaction_type, plan_id, credits_delta, currency, description)
    values (new.id, 'free_tier', 'free', 5, 'INR', 'Welcome — 5 free credits on signup');
  end if;
  return new;
end;
$$;

drop trigger if exists docdash_seed_credits_on_signup on auth.users;
create trigger docdash_seed_credits_on_signup
  after insert on auth.users
  for each row execute function public.docdash_seed_credits();

-- Existing accounts that never opened the app after signing up have no credits
-- row (the old seeding ran in the browser). Give them the same welcome grant.
with missing as (
  select u.id from auth.users u
   where not exists (select 1 from public.credits c where c.user_id = u.id)
), seeded as (
  insert into public.credits (user_id, credits_remaining, credits_used)
  select id, 5, 0 from missing
  returning user_id
), ev as (
  insert into public.credit_events (user_id, request_id, delta, reason)
  select user_id, 'signup:' || user_id, 5, 'free_tier' from seeded
  on conflict (request_id) do nothing
)
insert into public.transactions (user_id, transaction_type, plan_id, credits_delta, currency, description)
select user_id, 'free_tier', 'free', 5, 'INR', 'Welcome — 5 free credits on signup' from seeded;

-- ── Lock the browser out of balances ────────────────────────────────────────
drop policy if exists "Users can insert own credits"      on public.credits;
drop policy if exists "Users can update own credits"      on public.credits;
drop policy if exists "Users can insert own transactions" on public.transactions;

revoke insert, update, delete on public.credits      from anon, authenticated;
revoke insert, update, delete on public.transactions from anon, authenticated;
-- SELECT stays, restricted to the caller's own rows by the existing policies.
-- Granted explicitly so it does not depend on a project's default privileges.
grant select on public.credits, public.transactions to authenticated;

-- ── Function privileges ─────────────────────────────────────────────────────
revoke execute on function public.consume_credits(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function public.refund_credits(text)                       from public, anon, authenticated;
revoke execute on function public.docdash_seed_credits()                     from public, anon, authenticated;

grant execute on function public.consume_credits(uuid, integer, text, text) to service_role;
grant execute on function public.refund_credits(text)                       to service_role;
