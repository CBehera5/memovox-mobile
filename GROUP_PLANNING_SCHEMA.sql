-- Safe Setup Script for Group Planning
-- This script is "idempotent" - it is safe to run multiple times.

-- 1. Create tables if they don't exist
create table if not exists public.group_planning_sessions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  created_by uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  members jsonb not null default '[]'::jsonb,
  is_active boolean default true
);

create table if not exists public.group_planning_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.group_planning_sessions(id) on delete cascade not null,
  user_id text not null,
  user_name text not null,
  role text not null check (role in ('user', 'assistant')),
  content text,
  audio_uri text,
  image_uri text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 1b. Safely add image_uri if missing (for existing tables)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'group_planning_messages' and column_name = 'image_uri') then
    alter table public.group_planning_messages add column image_uri text;
  end if;
end $$;

-- 2. Add to publication safely (ignore if already added)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'group_planning_sessions'
  ) then
    alter publication supabase_realtime add table group_planning_sessions;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'group_planning_messages'
  ) then
    alter publication supabase_realtime add table group_planning_messages;
  end if;
end;
$$;

-- 3. Add indexes (if not exist)
create index if not exists idx_group_planning_sessions_members on public.group_planning_sessions using gin (members);
create index if not exists idx_group_planning_messages_session_id on public.group_planning_messages(session_id);

-- 4. Enable RLS
alter table public.group_planning_sessions enable row level security;
alter table public.group_planning_messages enable row level security;

-- 5. Drop existing policies to avoid conflicts
drop policy if exists "Users can view sessions they are members of" on public.group_planning_sessions;
drop policy if exists "Users can insert sessions" on public.group_planning_sessions;
drop policy if exists "Users can update sessions they are members of" on public.group_planning_sessions;
drop policy if exists "Users can view messages in their sessions" on public.group_planning_messages;
drop policy if exists "Users can insert messages in their sessions" on public.group_planning_messages;

-- 6. Re-create policies
create policy "Users can view sessions they are members of"
  on public.group_planning_sessions for select
  using (
    members @> cast('[{"user_id": "' || auth.uid() || '"}]' as jsonb)
  );

create policy "Users can insert sessions"
  on public.group_planning_sessions for insert
  with check (auth.uid() = created_by);

create policy "Users can update sessions they are members of"
  on public.group_planning_sessions for update
  using (
    members @> cast('[{"user_id": "' || auth.uid() || '"}]' as jsonb)
  );

create policy "Users can view messages in their sessions"
  on public.group_planning_messages for select
  using (
    exists (
      select 1 from public.group_planning_sessions
      where id = public.group_planning_messages.session_id
      and members @> cast('[{"user_id": "' || auth.uid() || '"}]' as jsonb)
    )
  );

create policy "Users can insert messages in their sessions"
  on public.group_planning_messages for insert
  with check (
    exists (
      select 1 from public.group_planning_sessions
      where id = public.group_planning_messages.session_id
      and members @> cast('[{"user_id": "' || auth.uid() || '"}]' as jsonb)
    )
  );
