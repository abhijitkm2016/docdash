-- Run this in the Supabase SQL Editor:
-- https://app.supabase.com/project/ubeqeidayrdedmpcsyvm/sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Documents table
create table public.documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  file_name text not null,
  title text,
  dashboard_data jsonb not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Shares table
create table public.shares (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now() not null,
  expires_at timestamptz default null
);

-- Row Level Security
alter table public.documents enable row level security;
alter table public.shares enable row level security;

-- Documents policies
create policy "Users can view own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id);

-- Shares policies
create policy "Users can create shares for own documents"
  on public.shares for insert
  with check (
    exists (
      select 1 from public.documents
      where id = document_id and user_id = auth.uid()
    )
  );

create policy "Anyone can view shares"
  on public.shares for select
  using (true);

create policy "Users can delete own shares"
  on public.shares for delete
  using (
    exists (
      select 1 from public.documents
      where id = document_id and user_id = auth.uid()
    )
  );

-- Indexes
create index shares_token_idx on public.shares(share_token);
create index documents_user_idx on public.documents(user_id, created_at desc);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on public.documents
  for each row execute function update_updated_at();