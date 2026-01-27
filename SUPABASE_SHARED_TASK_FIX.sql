-- Fix for Shared Task Visibility (RLS Policies)
-- Run this in your Supabase Dashboard -> SQL Editor to fix the issue where shared tasks are not visible.

-- 1. Enable RLS on agent_actions (safe to run even if already enabled)
alter table public.agent_actions enable row level security;

-- 2. Policy: Users can VIEW actions shared with them
-- Allows access if you are the owner OR if you are in the shared_with list.
-- We use the containment operator @> to check if the current user's ID is in the JSONB array.
create policy "Users can view actions shared with them"
  on public.agent_actions for select
  using (
    auth.uid()::text = "userId" -- Owner
    or
    shared_with @> format('[{"user_id": "%s"}]', auth.uid()::text)::jsonb -- Included in shared_with
  );

-- 3. Policy: Users can UPDATE actions shared with them
-- Allows shared users to mark tasks as done, etc.
create policy "Users can update actions shared with them"
  on public.agent_actions for update
  using (
    auth.uid()::text = "userId" -- Owner
    or
    shared_with @> format('[{"user_id": "%s"}]', auth.uid()::text)::jsonb -- Included in shared_with
  );

-- Note: RLS policies are combined with OR. If you already have a policy for owners, this adds strictly more access.
