-- Group Tasks Schema for Jeetu Proactive Follow-ups
-- Run this in your Supabase SQL Editor
-- Updated to work with the existing JSONB members structure

-- Create group_tasks table
CREATE TABLE IF NOT EXISTS group_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES group_planning_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  assigned_to_name TEXT,
  created_by UUID NOT NULL,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  reminder_sent BOOLEAN DEFAULT false,
  personal_action_id UUID, -- Links to the personal action in agent_actions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add personal_action_id if table already exists without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'group_tasks' AND column_name = 'personal_action_id'
  ) THEN
    ALTER TABLE group_tasks ADD COLUMN personal_action_id UUID;
  END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_group_tasks_session ON group_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_group_tasks_assigned ON group_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_group_tasks_due_date ON group_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_group_tasks_status ON group_tasks(status);
CREATE INDEX IF NOT EXISTS idx_group_tasks_personal_action ON group_tasks(personal_action_id);

-- Enable Row Level Security
ALTER TABLE group_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view tasks in sessions they're members of (using JSONB members)
CREATE POLICY "Users can view group tasks they're part of"
ON group_tasks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_planning_sessions
    WHERE group_planning_sessions.id = group_tasks.session_id
    AND group_planning_sessions.members @> cast('[{"user_id": "' || auth.uid() || '"}]' as jsonb)
  )
  OR created_by = auth.uid()
);

-- RLS Policy: Users can create tasks in sessions they're members of
CREATE POLICY "Users can create tasks in their groups"
ON group_tasks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_planning_sessions
    WHERE group_planning_sessions.id = group_tasks.session_id
    AND group_planning_sessions.members @> cast('[{"user_id": "' || auth.uid() || '"}]' as jsonb)
  )
  OR created_by = auth.uid()
);

-- RLS Policy: Users can update tasks in their groups
CREATE POLICY "Users can update tasks in their groups"
ON group_tasks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM group_planning_sessions
    WHERE group_planning_sessions.id = group_tasks.session_id
    AND group_planning_sessions.members @> cast('[{"user_id": "' || auth.uid() || '"}]' as jsonb)
  )
  OR created_by = auth.uid()
);

-- Add to realtime publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'group_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_tasks;
  END IF;
END;
$$;

-- ============================================================
-- ADD COLUMNS TO agent_actions FOR GROUP TASK LINKING
-- ============================================================

-- Add linked_group_task_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_actions' AND column_name = 'linked_group_task_id'
  ) THEN
    ALTER TABLE agent_actions ADD COLUMN linked_group_task_id UUID;
  END IF;
END $$;

-- Add linked_session_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_actions' AND column_name = 'linked_session_id'
  ) THEN
    ALTER TABLE agent_actions ADD COLUMN linked_session_id UUID;
  END IF;
END $$;

-- Add created_from column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'agent_actions' AND column_name = 'created_from'
  ) THEN
    ALTER TABLE agent_actions ADD COLUMN created_from TEXT DEFAULT 'manual';
  END IF;
END $$;

-- Create index for linked tasks
CREATE INDEX IF NOT EXISTS idx_agent_actions_group_task ON agent_actions(linked_group_task_id);
