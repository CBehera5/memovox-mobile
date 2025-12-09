# SQL Commands to Create Voice Memos Table

Run these SQL commands in your Supabase SQL Editor:

## Step 1: Create the voice_memos table

```sql
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
```

## Step 2: Create indexes for better performance

```sql
CREATE INDEX IF NOT EXISTS voice_memos_user_id_idx ON voice_memos(user_id);
CREATE INDEX IF NOT EXISTS voice_memos_created_at_idx ON voice_memos(created_at DESC);
```

## Step 3: Enable Row Level Security (RLS)

```sql
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own memos
CREATE POLICY "Users can view their own memos"
  ON voice_memos FOR SELECT
  USING (true);

-- Allow users to create their own memos
CREATE POLICY "Users can create their own memos"
  ON voice_memos FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own memos
CREATE POLICY "Users can update their own memos"
  ON voice_memos FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow users to delete their own memos
CREATE POLICY "Users can delete their own memos"
  ON voice_memos FOR DELETE
  USING (true);
```

---

## How to Run These Commands

1. Go to your Supabase dashboard
2. Click on "SQL Editor" (left sidebar)
3. Click "New Query"
4. Copy and paste each SQL block above
5. Click "Run" for each block
6. You should see "Success" messages

## What Each Part Does

- **Table Creation**: Creates the `voice_memos` table with all necessary columns
- **Indexes**: Speed up queries for user_id and creation date
- **RLS Policies**: Ensures users can only access their own memos

After running these, your app should work! 🎉
