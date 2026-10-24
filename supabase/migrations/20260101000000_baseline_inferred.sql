-- Baseline for LOCAL development and CI only.
--
-- The production schema was created by hand in the Supabase dashboard and has
-- never been captured as a migration. This file recreates just the two tables
-- the ledger migration depends on, inferred from the application code, so
-- `supabase start` / `supabase db reset` produce a working local database.
--
-- Every statement is idempotent (`if not exists`), so it is a no-op against a
-- database that already has these tables. Verify the columns against
-- production before relying on this file for anything beyond local testing.

create table if not exists public.credits (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  credits_remaining  integer not null default 0,
  credits_used       integer not null default 0,
  last_purchase_at   timestamptz,
  last_purchase_type text,
  created_at         timestamptz default now()
);

create table if not exists public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  transaction_type    text not null,
  plan_id             text,
  credits_delta       integer not null,
  amount_paise        integer,
  currency            text,
  razorpay_payment_id text,
  razorpay_order_id   text,
  promo_code          text,
  description         text,
  created_at          timestamptz default now()
);

-- Production tables were created when Supabase granted full table privileges to
-- anon/authenticated by default (newer projects no longer do). Mirror that so the
-- ledger migration's REVOKEs are what close the hole in tests. UNVERIFIED against
-- production: compare with the role_table_grants query output before trusting it.
grant all on public.credits, public.transactions to anon, authenticated, service_role;

alter table public.credits      enable row level security;
alter table public.transactions enable row level security;

-- The permissive policies that exist in production today. The ledger migration
-- removes the write policies; they are recreated here so local tests prove the
-- REVOKEs (not the absence of policies) are what close the hole.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='credits' and policyname='Users can view own credits') then
    create policy "Users can view own credits"   on public.credits for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='credits' and policyname='Users can insert own credits') then
    create policy "Users can insert own credits" on public.credits for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='credits' and policyname='Users can update own credits') then
    create policy "Users can update own credits" on public.credits for update using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transactions' and policyname='Users can view own transactions') then
    create policy "Users can view own transactions"   on public.transactions for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='transactions' and policyname='Users can insert own transactions') then
    create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
  end if;
end $$;
