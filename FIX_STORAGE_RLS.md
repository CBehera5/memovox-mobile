# 🔴 CRITICAL FIX: Storage RLS Policy - Step by Step

## The Problem

When uploading audio to Supabase Storage, you're getting:
```
StorageApiError: new row violates row-level security policy
```

This means the storage bucket has RLS policies that are blocking uploads.

---

## The Solution: Remove Old Policies & Create New Ones

### STEP 1: Go to Supabase SQL Editor

**URL:** https://app.supabase.com/project/pddilavtexsnbifdtmrc/sql/new

---

### STEP 2: Drop Existing Storage Policies (to avoid conflicts)

**Copy and paste this SQL:**

```sql
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "authenticated_can_upload_to_voice_memos" ON storage.objects;
DROP POLICY IF EXISTS "public_can_read_voice_memos" ON storage.objects;
DROP POLICY IF EXISTS "allow_upload" ON storage.objects;
DROP POLICY IF EXISTS "allow_read" ON storage.objects;
DROP POLICY IF EXISTS "voice_memos_upload" ON storage.objects;
DROP POLICY IF EXISTS "voice_memos_read" ON storage.objects;
```

**Click Run**

**You'll see:**
```
✅ Success. No rows returned
```

(It's OK if these policies don't exist - the DROP IF EXISTS handles that)

---

### STEP 3: Create Simple Upload Policy

**Clear the editor and copy this:**

```sql
-- Allow any user to upload to voice-memos bucket
CREATE POLICY "voice_memos_upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'voice-memos');
```

**Click Run**

**You'll see:**
```
✅ Success. No rows returned
```

---

### STEP 4: Create Read Policy

**Clear the editor and copy this:**

```sql
-- Allow reading files from voice-memos bucket
CREATE POLICY "voice_memos_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'voice-memos');
```

**Click Run**

**You'll see:**
```
✅ Success. No rows returned
```

---

### STEP 5: Verify Storage Bucket Settings

**Go to:** https://app.supabase.com/project/pddilavtexsnbifdtmrc/storage/buckets

**Click on the `voice-memos` bucket**

**Check these settings:**
- ✅ Bucket name: `voice-memos`
- ✅ Public bucket: **ENABLED** (toggle should be ON)
- ✅ File size limit: Default (recommended)

**If not public, click the toggle to enable it**

---

### STEP 6: Verify Policies Were Created

**Go back to SQL Editor**

**Copy and paste this:**

```sql
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%voice_memos%';
```

**Click Run**

**You should see:**
```
✅ Results (2 rows):
│ voice_memos_upload  │ bucket_id = 'voice-memos' │ bucket_id = 'voice-memos'
│ voice_memos_read    │ bucket_id = 'voice-memos' │ (null)
```

---

### STEP 7: Back to the App

**Refresh your browser** (Cmd+R or F5)

**Try recording a memo again**

**You should now see in console:**
```
🔴 DEBUG: About to upload audio
Uploading audio to Supabase...
🔴 DEBUG: Upload returned audioUrl: https://pddilavtexsnbifdtmrc.supabase.co/storage/v1/object/public/voice-memos/...
```

✅ **Upload should work!**

---

## If Upload Still Fails

### Option A: Check Bucket Existence
In SQL Editor:
```sql
SELECT name, public FROM storage.buckets WHERE name = 'voice-memos';
```

Should return:
```
✅ Results (1 row):
│ voice-memos │ true
```

If NOT found, the bucket doesn't exist - create it in Storage UI.

### Option B: Check All Storage Policies
In SQL Editor:
```sql
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;
```

Should show at least `voice_memos_upload` and `voice_memos_read`.

### Option C: Enable Bucket Explicitly
In SQL Editor:
```sql
-- Make sure storage.objects table has RLS enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

Then recreate the policies from Step 3-4.

---

## Expected Results After Fix

**Console should show:**
```
Processing recording: data:audio/webm;base64,...
Starting AI analysis...
🔴 DEBUG: About to call AIService.transcribeAndAnalyze
Analysis complete: {transcription: '...', category: '...', ...}
🔴 DEBUG: About to call AuthService.getCurrentUser
🔴 DEBUG: getCurrentUser returned: {id: '...', email: '...'}
🔴 DEBUG: Converting audio URI to blob
🔴 DEBUG: audioBlob created, memoId: ...
🔴 DEBUG: About to upload audio
Uploading audio to Supabase...
🔴 DEBUG: Upload returned audioUrl: https://pddilavtexsnbifdtmrc.supabase.co/storage/v1/object/public/voice-memos/...
🔴 DEBUG: Memo object created
Saving memo to Supabase: {id: '...', userId: '...', ...}
🔴 DEBUG: About to call VoiceMemoService.saveMemo
🔴 DEBUG: saveMemo returned
Memo saved successfully
✅ Success - Memo saved!
```

**Then in Notes tab, you should see your memo!**

---

## Troubleshooting Summary

| Error | Solution |
|-------|----------|
| `new row violates row-level security policy` | Run Steps 2-4 (create policies) |
| `bucket_id does not exist` | Bucket missing - create in Storage UI |
| `permission denied` | Bucket is private - toggle Public ON |
| Still seeing old error | Browser cache - press Ctrl+Shift+R (hard refresh) |

---

**Run the SQL steps and refresh your browser - this should fix the storage issue!**
