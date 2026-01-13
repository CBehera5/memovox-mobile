-- COMPREHENSIVE SCHEMA FIX
-- Run this in Supabase SQL Editor to fix the "column does not exist" error

-- 1. Ensure full_name column exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'full_name') then
    -- Try to find 'name' column and rename it, or add full_name
    if exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'name') then
        alter table public.profiles rename column name to full_name;
    else
        alter table public.profiles add column full_name text;
    end if;
  end if;
end $$;

-- 2. Enable RLS (Security)
alter table public.profiles enable row level security;

-- 3. Policy: Allow Authenticated Users to View All Profiles (Crucial for Search)
drop policy if exists "Authenticated users can view all profiles" on public.profiles;
create policy "Authenticated users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- 4. Policy: Users can update their own profile
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 5. Policy: Users can insert their own profile
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 6. Create Indexes for fast search
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_fullname_idx on public.profiles (full_name);

-- 7. Grant Update Shared Actions
alter table public.agent_actions enable row level security;

drop policy if exists "Users can update their own agent actions" on public.agent_actions;
create policy "Users can update their own agent actions"
  on public.agent_actions for update
  using (auth.uid()::text = "userId");
