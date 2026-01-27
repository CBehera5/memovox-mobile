-- 1a. Ensure full_name column exists (Fix for "column does not exist" error)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'full_name') then
    alter table public.profiles add column full_name text;
  end if;
end $$;

-- 1b. Allow authenticated users to view all profiles (needed for search)
-- IMPORTANT: Run this in your Supabase Dashboard -> SQL Editor

-- Enable RLS (just in case)
alter table public.profiles enable row level security;

-- Drop existing tight policy if it exists (adjust name if yours is different)
drop policy if exists "Users can see their own profile only" on public.profiles;
drop policy if exists "Public profiles" on public.profiles;
drop policy if exists "Authenticated users can view all profiles" on public.profiles;

-- Create a new policy allowing properly authenticated users to read basic profile info of others
create policy "Authenticated users can view all profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- 2. Ensure agent_actions shared_with is writable
alter table public.agent_actions enable row level security;

-- Check if policy exists before creating
do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Users can update their own agent actions' and tablename = 'agent_actions') then
    create policy "Users can update their own agent actions"
      on public.agent_actions for update
      using (auth.uid()::text = "userId");
  end if;
end $$;

-- 3. Verify indexes for search performance
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_fullname_idx on public.profiles (full_name);
