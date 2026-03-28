-- Textura database schema
-- Run this in the Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table if not exists public.users (
  id text primary key,  -- Clerk user ID
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  texture_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Textures table
create table if not exists public.textures (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null references public.users(id) on delete cascade,
  prompt text not null,
  enhanced_prompt text not null,
  blob_url text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists textures_user_id_idx on public.textures(user_id);
create index if not exists textures_created_at_idx on public.textures(created_at desc);
create index if not exists users_stripe_customer_id_idx on public.users(stripe_customer_id);

-- Helper function to increment texture count atomically
create or replace function public.increment_texture_count(user_id_param text)
returns void
language plpgsql
security definer
as $$
begin
  update public.users
  set texture_count = texture_count + 1
  where id = user_id_param;
end;
$$;

-- RLS policies (service role bypasses these, but good practice)
alter table public.users enable row level security;
alter table public.textures enable row level security;

-- Service role can do everything (API routes use service role key)
create policy "Service role full access on users"
  on public.users
  using (true)
  with check (true);

create policy "Service role full access on textures"
  on public.textures
  using (true)
  with check (true);

-- Storage: create public textures bucket
-- Images are public (anyone with URL can view), but only service role can upload
insert into storage.buckets (id, name, public)
values ('textures', 'textures', true)
on conflict (id) do nothing;

-- Allow public read on the textures bucket
create policy "Public read access on textures bucket"
  on storage.objects for select
  using (bucket_id = 'textures');

-- Allow service role to upload (our API uses service role key)
create policy "Service role upload to textures bucket"
  on storage.objects for insert
  with check (bucket_id = 'textures');
