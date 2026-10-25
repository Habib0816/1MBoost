-- Run in the Supabase SQL editor after creating your project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('YouTube','Facebook','X')),
  topic text not null,
  tone text not null default 'Engaging',
  content text not null,
  status text not null default 'draft' check (status in ('draft','scheduled','published','archived')),
  scheduled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  plan text not null check (plan in ('starter','professional')),
  amount_kobo bigint not null check (amount_kobo > 0),
  currency text not null default 'NGN',
  paystack_reference text not null unique,
  status text not null default 'pending' check (status in ('pending','success','failed','abandoned')),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.content_drafts enable row level security;
alter table public.payment_orders enable row level security;

-- Users can read/update only their own profile and drafts.
create policy "profile_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profile_update_own" on public.profiles for update using (auth.uid() = id);
create policy "draft_select_own" on public.content_drafts for select using (auth.uid() = user_id);
create policy "draft_insert_own" on public.content_drafts for insert with check (auth.uid() = user_id);
create policy "draft_update_own" on public.content_drafts for update using (auth.uid() = user_id);
create policy "draft_delete_own" on public.content_drafts for delete using (auth.uid() = user_id);

-- Do not expose payment orders to browser clients yet. Add carefully scoped policies after
-- authentication, order ownership, and payment lifecycle logic are implemented.

-- ===== Stage 2 additions =====
alter table public.profiles add column if not exists plan text not null default 'free' check (plan in ('free','starter','professional'));

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1)) on conflict do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Users must not be able to change their own plan from the browser; only the server (service role) does.
-- Browser users may only edit display_name; plan and expiry are set by the server only.
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;

-- ===== Stage 5: planner + campaign planner =====
create table if not exists public.content_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('YouTube','Facebook','X','Instagram','TikTok')),
  title text not null check (char_length(title) between 3 and 200),
  notes text check (char_length(notes) <= 2000),
  scheduled_for timestamptz not null,
  status text not null default 'planned' check (status in ('planned','posted')),
  created_at timestamptz not null default now()
);
create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('YouTube','Facebook','X','Instagram','TikTok')),
  goal text not null check (goal in ('Views','Followers','Engagement','Website visits')),
  budget_ngn integer not null check (budget_ngn between 1000 and 100000000),
  start_date date not null, end_date date not null check (end_date >= start_date),
  audience text check (char_length(audience) <= 1000),
  created_at timestamptz not null default now()
);
alter table public.content_plans enable row level security;
alter table public.ad_campaigns enable row level security;
create policy "own plans" on public.content_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own campaigns" on public.ad_campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== Stage 6: auto posting plan + monthly Boost =====
alter table public.profiles add column if not exists plan_expires_at timestamptz;
alter table public.profiles add column if not exists trial_started_at timestamptz;
-- (plan columns are protected by the grant above)

-- ===== Stage 7: social profile links (no passwords, ever) =====
create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('YouTube','Facebook','X','Instagram','TikTok')),
  url text not null check (char_length(url) <= 300 and url like 'https://%'),
  created_at timestamptz not null default now(),
  unique (user_id, platform)
);
alter table public.social_links enable row level security;
create policy "own links" on public.social_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
