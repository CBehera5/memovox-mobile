-- ============================================================
-- SUPABASE CONFIGURATION SQL COMMANDS
-- ============================================================
-- Copy and paste these commands one at a time in Supabase SQL Editor
-- URL: https://app.supabase.com/project/pddilavtexsnbifdtmrc/sql/new
-- ============================================================

-- ============================================================
-- STEP 1: CREATE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS voice_memos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  transcription TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  duration INTEGER,
  ai_analysis JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- STEP 2: CREATE INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS voice_memos_user_id_idx ON voice_memos(user_id);
CREATE INDEX IF NOT EXISTS voice_memos_created_at_idx ON voice_memos(created_at DESC);

-- ============================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: CREATE RLS POLICIES (run each separately)
-- ============================================================

-- POLICY 1: Insert
CREATE POLICY "voice_memos_insert_policy"
  ON voice_memos FOR INSERT
  WITH CHECK (true);

-- POLICY 2: Select
CREATE POLICY "voice_memos_select_policy"
  ON voice_memos FOR SELECT
  USING (true);

-- POLICY 3: Update
CREATE POLICY "voice_memos_update_policy"
  ON voice_memos FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- POLICY 4: Delete
CREATE POLICY "voice_memos_delete_policy"
  ON voice_memos FOR DELETE
  USING (true);

-- ============================================================
-- VERIFICATION QUERIES (run these to check setup)
-- ============================================================

-- Check if table is empty (should show 0 rows)
SELECT * FROM voice_memos;

-- Check if RLS policies are created (should show 4 policies)
SELECT policyname FROM pg_policies WHERE tablename = 'voice_memos';

-- After recording memos, run this to see them
SELECT id, user_id, title, transcription, created_at FROM voice_memos ORDER BY created_at DESC;

-- ============================================================
-- STORAGE BUCKET SETUP (do this in Supabase UI, not SQL)
-- ============================================================
-- Steps:
-- 1. Go to: https://app.supabase.com/project/pddilavtexsnbifdtmrc/storage/buckets
-- 2. Click "New bucket"
-- 3. Name it: voice-memos (lowercase, exact!)
-- 4. Toggle "Public bucket" to ON
-- 5. Click "Create bucket"

-- ============================================================
-- TROUBLESHOOTING - DROP EXISTING POLICIES (if needed)
-- ============================================================
-- If you get "policy already exists" error, run these first:

DROP POLICY IF EXISTS "voice_memos_insert_policy" ON voice_memos;
DROP POLICY IF EXISTS "voice_memos_select_policy" ON voice_memos;
DROP POLICY IF EXISTS "voice_memos_update_policy" ON voice_memos;
DROP POLICY IF EXISTS "voice_memos_delete_policy" ON voice_memos;

-- Then run the CREATE POLICY commands above again
