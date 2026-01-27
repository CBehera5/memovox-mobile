-- Fix RLS Policy to Allow System Messages (Jeetu)
-- Run this in Supabase SQL Editor to fix group message storage

-- First, let's check the actual column type
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'group_planning_messages' AND column_name = 'user_id';

-- Drop the restrictive insert policy
drop policy if exists "Users can insert messages in their sessions" on public.group_planning_messages;
drop policy if exists "Users and system can insert messages in their sessions" on public.group_planning_messages;

-- Create new policy that allows:
-- 1. Authenticated users who are members of the session
-- 2. System messages (user_name = 'JEETU' to identify system messages)
create policy "Users and system can insert messages in their sessions"
  on public.group_planning_messages for insert
  with check (
    -- Allow Jeetu/system messages (identified by user_name)
    user_name = 'JEETU'
    OR
    -- Allow authenticated users who are session members
    exists (
      select 1 from public.group_planning_sessions
      where id = session_id
      and members @> cast('[{"user_id": "' || auth.uid()::text || '"}]' as jsonb)
    )
  );

-- Also update the SELECT policy to allow reading all messages in sessions
drop policy if exists "Users can view messages in their sessions" on public.group_planning_messages;
drop policy if exists "Users can view all messages in their sessions" on public.group_planning_messages;

create policy "Users can view all messages in their sessions"
  on public.group_planning_messages for select
  using (
    exists (
      select 1 from public.group_planning_sessions
      where id = session_id
      and members @> cast('[{"user_id": "' || auth.uid()::text || '"}]' as jsonb)
    )
  );

-- Verify policies were created
select policyname, cmd from pg_policies 
where schemaname = 'public' 
and tablename = 'group_planning_messages';
