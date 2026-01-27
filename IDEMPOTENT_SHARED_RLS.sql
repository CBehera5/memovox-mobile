-- Fix RLS policies for Shared Tasks visibility
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Enable RLS on agent_actions (safe to run again)
alter table public.agent_actions enable row level security;

-- 2. Drop existing restrictive policies to avoid conflicts
drop policy if exists "Users can view their own agent actions" on public.agent_actions;
drop policy if exists "Users can update their own agent actions" on public.agent_actions;
drop policy if exists "Users can insert their own agent actions" on public.agent_actions;
drop policy if exists "Users can delete their own agent actions" on public.agent_actions;
drop policy if exists "Users can view actions they own or are shared with" on public.agent_actions;
drop policy if exists "Users can update actions they own or are shared with" on public.agent_actions;


-- 3. Create comprehensive policies

-- SELECT: Allow viewing if Owner OR in Shared List
create policy "Users can view actions they own or are shared with"
  on public.agent_actions for select
  using (
    "userId" = auth.uid()::text
    OR
    shared_with @> cast('[{"user_id": "' || auth.uid()::text || '"}]' as jsonb)
  );

-- INSERT: Allow inserting if userId matches auth.uid
create policy "Users can insert their own agent actions"
  on public.agent_actions for insert
  with check (
    "userId" = auth.uid()::text
  );

-- UPDATE: Allow updating if Owner OR in Shared List (e.g. to mark complete)
create policy "Users can update actions they own or are shared with"
  on public.agent_actions for update
  using (
    "userId" = auth.uid()::text
    OR
    shared_with @> cast('[{"user_id": "' || auth.uid()::text || '"}]' as jsonb)
  );

-- DELETE: Allow deleting ONLY if Owner
create policy "Users can delete their own agent actions"
  on public.agent_actions for delete
  using (
    "userId" = auth.uid()::text
  );

-- 4. Verify/Add Index for performance
create index if not exists idx_agent_actions_userid on public.agent_actions("userId");
create index if not exists idx_agent_actions_shared_with on public.agent_actions using gin (shared_with);
