# Quick Diagnostic Steps

Follow these steps to find out what's happening:

## 1. First, Check if Memos Are Being Saved

Go to Supabase Dashboard → SQL Editor and run:

```sql
SELECT * FROM voice_memos;
```

**What you should see:**
- If empty: Memos are NOT being saved
- If has data: Memos ARE being saved but Notes tab isn't loading them

---

## 2. Check if Table Exists

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'voice_memos';
```

**Should return:** `voice_memos`

If empty, the table doesn't exist! Run the SQL from `SQL_CREATE_TABLES.md`

---

## 3. Check RLS Status

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'voice_memos';
```

**Should show:** `rowsecurity = true`

---

## 4. Drop and Recreate RLS Policies (If Having Issues)

If memos aren't showing, the RLS might be blocking them. Run this:

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can create their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can update their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can delete their own memos" ON voice_memos;

-- Disable RLS for testing (we'll re-enable after)
ALTER TABLE voice_memos DISABLE ROW LEVEL SECURITY;
```

Then try recording a memo in your app.

---

## 5. Check Logs in Your App

After recording a memo, look at the browser console (F12 or Cmd+Option+I) for:

**You should see:**
```
Recording started
Recording stopped. URI: blob:...
Converted blob URI to base64
Starting AI analysis...
Analysis complete: {...}
Uploading audio to Supabase...
Saving memo to Supabase: {...}
Memo saved successfully
```

**If you don't see these, record the exact error and let me know.**

---

## 6. Check Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Click on `voice-memos` bucket
3. Look for folders with user IDs
4. Inside should be audio files

**If no files:** Audio upload is failing
**If files are there:** Upload works, but database save is failing

---

## What To Tell Me

After running the steps above, tell me:

1. **Does `SELECT * FROM voice_memos;` return any data?** (Yes/No)
2. **Does the table exist?** (Yes/No)
3. **What errors appear in the browser console?** (Copy/paste them)
4. **Are audio files in Storage → voice-memos?** (Yes/No)
5. **After disabling RLS, do memos appear?** (Yes/No)

---

## Most Common Issues

### Issue: "PGRST205 - Could not find the table"
**Fix:** Run the create table SQL from `SQL_CREATE_TABLES.md`

### Issue: Memos save but don't load in Notes
**Fix:** Likely RLS blocking. Try disabling RLS temporarily to test

### Issue: Audio not uploading
**Fix:** Check storage bucket exists and is named `voice-memos`

### Issue: No success message when recording
**Fix:** Check browser console for error messages

---

**Let me know what you find and I'll help fix it!** 🔍
