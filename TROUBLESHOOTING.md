# Troubleshooting: Memos Not Showing

## Step 1: Check if Table Has Data

Go to your Supabase dashboard and run this query:

```sql
SELECT * FROM voice_memos;
```

**If you see data:** The memos ARE being saved to the database. The issue is the Notes tab isn't loading them.

**If you see NO data:** The memos aren't being saved at all.

---

## Step 2: Check Database Table Structure

Run this to see if the table exists:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

Look for `voice_memos` in the results.

---

## Step 3: Check User ID Format

The RLS policies expect `user_id` to match `auth.uid()::text`. Let me verify the format:

```sql
-- Get the current user ID
SELECT auth.uid()::text;

-- Check what user_ids are in the database
SELECT DISTINCT user_id FROM voice_memos;
```

**If they don't match**, that's the problem! The auth.uid() returns a UUID but we're storing it as TEXT.

---

## Step 4: Disable RLS for Testing (Temporary)

To test if the problem is RLS policies:

```sql
-- Disable RLS temporarily
ALTER TABLE voice_memos DISABLE ROW LEVEL SECURITY;

-- Now try in your app - record a memo
-- Then check if it appears:
SELECT * FROM voice_memos;

-- When done, re-enable RLS:
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;
```

---

## Step 5: Check App Logs

Look in your browser console for these messages:

- ✅ "Recording started"
- ✅ "Recording stopped"  
- ✅ "Converted blob URI to base64"
- ✅ "Starting AI analysis..."
- ✅ "Analysis complete"
- ✅ "Uploading audio to Supabase..."
- ✅ "Saving memo to Supabase"
- ✅ "Memo saved successfully"
- ✅ "Success" alert

**Missing any of these?** That's where it's failing.

---

## Step 6: Check Storage Bucket

Go to Storage → voice-memos and check if audio files are being uploaded.

**If files are there:** Upload is working, problem is database save
**If files aren't there:** Upload is failing

---

## Most Likely Issue: RLS Policies

The RLS policies might be preventing inserts. Try this fix:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can create their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can update their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can delete their own memos" ON voice_memos;

-- Disable RLS temporarily for testing
ALTER TABLE voice_memos DISABLE ROW LEVEL SECURITY;

-- Test your app here - record a memo and check if it appears

-- If it works, re-enable RLS with simpler policies:
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memos"
  ON voice_memos FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own memos"
  ON voice_memos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own memos"
  ON voice_memos FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own memos"
  ON voice_memos FOR DELETE
  USING (true);
```

---

## What To Tell Me

Run the queries above and tell me:

1. Does `SELECT * FROM voice_memos;` return any rows?
2. What do you see in the browser console after recording?
3. Are audio files appearing in Storage → voice-memos?
4. What does `SELECT auth.uid()::text;` return?
5. What does `SELECT DISTINCT user_id FROM voice_memos;` return?

This will help me identify exactly where the issue is! 🔍
