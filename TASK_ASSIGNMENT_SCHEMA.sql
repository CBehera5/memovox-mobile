-- Database Schema for Task Assignment & Notifications

-- 1. Add shared_with column to voice_memos if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'voice_memos' and column_name = 'shared_with') then
    alter table public.voice_memos add column shared_with jsonb default '[]'::jsonb;
  end if;
end $$;

-- 1b. Create agent_actions table if not exists
create table if not exists public.agent_actions (
  id text primary key,
  "userId" text not null,
  type text not null,
  title text not null,
  description text,
  "dueDate" text,
  "dueTime" text,
  priority text,
  status text not null,
  "createdFrom" text,
  "createdAt" text not null,
  "completedAt" text,
  "linkedMemoId" text,
  data jsonb,
  shared_with jsonb default '[]'::jsonb
);

-- 1c. Add shared_with column to agent_actions if not exists (redundant but safe)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'agent_actions' and column_name = 'shared_with') then
    alter table public.agent_actions add column shared_with jsonb default '[]'::jsonb;
  end if;
end $$;

-- 2. Create Notifications table for cross-user alerts
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  title text not null,
  body text not null,
  type text not null, -- 'assignment', 'reminder', 'system', 'group_invite', 'group_invite'
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable RLS
alter table public.notifications enable row level security;

-- 4. Policies for Notifications
drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "System can insert notifications" on public.notifications;
create policy "System can insert notifications"
  on public.notifications for insert
  with check (true); -- Allow any authenticated user to insert (sending notification) OR restrict to server-side functions

-- 5. Realtime for Notifications
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' 
    and schemaname = 'public' 
    and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end;
$$;
