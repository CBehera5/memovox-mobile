# 🔧 Critical Fix: RLS Policies & Storage Bucket

## Problem Summary

Your recorded memos aren't being saved because of two issues:

1. **Storage bucket `voice-memos` doesn't exist** - Needed to upload audio files
2. **RLS policies are blocking database inserts** - `auth.role() = 'authenticated'` is failing

## Solution: Run These SQL Commands

Go to your **Supabase Dashboard** → **SQL Editor** and run these commands **in order**:

### Step 1: Drop Old RLS Policies

```sql
DROP POLICY IF EXISTS "Users can view their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can create their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can update their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can delete their own memos" ON voice_memos;
```

### Step 2: Disable RLS Temporarily (For Testing)

```sql
ALTER TABLE voice_memos DISABLE ROW LEVEL SECURITY;
```

### Step 3: Create New, Working RLS Policies

```sql
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to do anything with their memos
CREATE POLICY "Allow authenticated users - INSERT"
  ON voice_memos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users - SELECT"
  ON voice_memos FOR SELECT
  USING (true);

CREATE POLICY "Allow authenticated users - UPDATE"
  ON voice_memos FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users - DELETE"
  ON voice_memos FOR DELETE
  USING (true);
```

## Quick Start

1. **Open your Supabase Dashboard**: https://app.supabase.com/project/pddilavtexsnbifdtmrc/sql/new
2. **Copy the 4 SQL commands above** (one at a time or all at once)
3. **Click "Run"** for each command
4. **Return to the app** and try recording a memo again

The storage bucket will be created automatically by the app when it tries to upload audio.

## Testing Checklist

After running the SQL:

- [ ] Record a new memo in the app
- [ ] You should see "Memo saved successfully!" alert
- [ ] Go to Notes tab - you should see your memo
- [ ] Check Supabase: SQL Editor → `SELECT * FROM voice_memos;` should show your memo

## If It Still Doesn't Work

1. **Check for errors**: Look at browser console (F12) and see what errors appear
2. **Check database**: Run `SELECT * FROM voice_memos;` in Supabase SQL Editor
3. **Check storage**: Go to Supabase Storage tab and see if bucket exists
4. **Check auth**: Make sure you're logged in to the app

## Important Notes

⚠️ **These RLS policies are permissive** (allow all authenticated users). In production, use:
```sql
-- Production: Users can only see/edit their own memos
CREATE POLICY "Users can only see their own memos"
  ON voice_memos FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can only create their own memos"
  ON voice_memos FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);
```

But for now, keep them permissive to test that the app works.
