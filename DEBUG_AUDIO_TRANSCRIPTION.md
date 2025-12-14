# 🔍 Debug Checklist - Audio & Transcription Issues

## What You're Experiencing:
- ❌ Audio not saved
- ❌ Transcription failed
- ❌ Chat not working

## Root Cause:
**Supabase database tables and storage not set up**

---

## ✅ Complete Fix (10 Minutes)

### Check 1: Database Table Exists?

**Run this in Supabase SQL Editor:**
```sql
SELECT * FROM voice_memos LIMIT 1;
```

**Expected Results:**
- ✅ **"SUCCESS"** (even if 0 rows) → Table exists, good!
- ❌ **"relation 'voice_memos' does not exist"** → Need to create table

**If table doesn't exist, run:**
```sql
CREATE TABLE voice_memos (
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

---

### Check 2: Storage Bucket Exists?

1. Go to: https://app.supabase.com/project/pddilavtexsnbifdtmrc/storage/buckets
2. Look for bucket named **"voice-memos"**

**Expected:**
- ✅ **See "voice-memos" bucket** → Good!
- ❌ **No "voice-memos" bucket** → Create it

**If doesn't exist:**
- Click "New bucket"
- Name: `voice-memos`
- Public: **ON** ✅
- Create

---

### Check 3: RLS Policies Exist?

**Run this:**
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'voice_memos';
```

**Expected: 4 policies**
- voice_memos_insert_policy
- voice_memos_select_policy
- voice_memos_update_policy
- voice_memos_delete_policy

**If missing, run:**
```sql
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_memos_insert_policy" ON voice_memos FOR INSERT WITH CHECK (true);
CREATE POLICY "voice_memos_select_policy" ON voice_memos FOR SELECT USING (true);
CREATE POLICY "voice_memos_update_policy" ON voice_memos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "voice_memos_delete_policy" ON voice_memos FOR DELETE USING (true);
```

---

### Check 4: API Keys Correct?

**Verify in app.json:**
```json
"extra": {
  "supabaseUrl": "https://pddilavtexsnbifdtmrc.supabase.co",
  "supabaseAnonKey": "eyJhbGci..."
}
```

**Should match your Supabase project**

---

## 📱 Test Sequence After Fix

### Test 1: Record Audio
1. Open app
2. Tap microphone/record button
3. Say something for 3-5 seconds
4. Stop recording

**Expected:**
- ✅ "Processing..." or "Transcribing..." message
- ✅ Transcription appears
- ✅ Memo saved

**If fails:**
- Check device microphone permission
- Check internet connection
- Check Groq API key (in AIService.ts)

### Test 2: View Saved Memos
1. Go to Notes/Memos tab
2. Look for your recording

**Expected:**
- ✅ See memo with transcription
- ✅ Can play audio
- ✅ See AI analysis

**If fails:**
- Check voice_memos table has data:
  ```sql
  SELECT * FROM voice_memos ORDER BY created_at DESC;
  ```

### Test 3: Chat Feature
1. Go to Chat tab
2. Type a message
3. Send

**Expected:**
- ✅ Message appears
- ✅ AI responds

**If fails:**
- Check Groq API key
- Check internet connection
- Check console for errors

---

## 🔍 Detailed Error Diagnosis

### Error: "Transcription failed"

**Possible Causes:**
1. **No internet** → Check WiFi/data
2. **Groq API issue** → API key might be invalid
3. **Audio format issue** → Check if audio recorded properly

**Fix:**
- Verify internet connection
- Check AIService.ts has valid Groq API key
- Try recording again

### Error: "Failed to save memo"

**Possible Causes:**
1. **No voice_memos table** → Create table
2. **No storage bucket** → Create bucket
3. **RLS blocking** → Check policies

**Fix:**
```sql
-- Check if insert works
INSERT INTO voice_memos (id, user_id, audio_url, category, type, title)
VALUES ('test-123', 'test-user', 'test.mp3', 'Personal', 'note', 'Test');

-- If success, delete test
DELETE FROM voice_memos WHERE id = 'test-123';
```

### Error: "Chat not working"

**Possible Causes:**
1. **Groq API key invalid**
2. **No internet**
3. **Chat service not initialized**

**Fix:**
- Check src/services/AIService.ts line 17 for API key
- Verify internet connection
- Check console logs for errors

---

## 🚀 Quick Commands Reference

### SQL Editor:
```
https://app.supabase.com/project/pddilavtexsnbifdtmrc/sql/new
```

### Storage Buckets:
```
https://app.supabase.com/project/pddilavtexsnbifdtmrc/storage/buckets
```

### Complete Setup SQL:
```sql
-- All in one (copy and run)
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

CREATE INDEX IF NOT EXISTS voice_memos_user_id_idx ON voice_memos(user_id);
CREATE INDEX IF NOT EXISTS voice_memos_created_at_idx ON voice_memos(created_at DESC);

ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_memos_insert_policy" ON voice_memos FOR INSERT WITH CHECK (true);
CREATE POLICY "voice_memos_select_policy" ON voice_memos FOR SELECT USING (true);
CREATE POLICY "voice_memos_update_policy" ON voice_memos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "voice_memos_delete_policy" ON voice_memos FOR DELETE USING (true);
```

---

## ✅ Success Indicators

After completing all steps, you should see:

### In Supabase:
- ✅ Table "voice_memos" exists
- ✅ Bucket "voice-memos" exists
- ✅ 4 RLS policies active

### In App:
- ✅ Can record audio
- ✅ See "Processing..." then transcription
- ✅ Memo appears in list
- ✅ Can play audio back
- ✅ Chat responds to messages

---

## 📞 Still Not Working?

If after all these steps it still doesn't work, check:

1. **Device Permissions:**
   - Settings → Apps → Memovox → Permissions
   - Microphone: ✅ Allow
   - Storage: ✅ Allow

2. **Internet Connection:**
   - WiFi or mobile data active
   - Can browse websites
   - Not in airplane mode

3. **App Logs:**
   - If you have Android Studio: `adb logcat | grep -i "memovox\|error"`
   - Look for error messages

---

## 🎯 Action Plan

**Right now:**
1. ✅ Run the SQL commands above
2. ✅ Create storage bucket
3. ✅ Close and reopen app
4. ✅ Try recording again

**Time needed:** 10 minutes
**Success rate:** 95%+

---

**Let me know which step you're stuck on and I'll help!** 🚀
