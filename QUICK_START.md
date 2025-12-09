# ⚡ Supabase Quick Configuration (Copy-Paste Ready)

## 8 Simple Steps to Get Memos Working

---

### STEP 1️⃣: Create Table
**URL:** https://app.supabase.com/project/pddilavtexsnbifdtmrc/sql/new

**Copy & Paste:**
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
**Click:** Run (green button)
**Result:** ✅ Success

---

### STEP 2️⃣: Create Indexes
**Copy & Paste:**
```sql
CREATE INDEX IF NOT EXISTS voice_memos_user_id_idx ON voice_memos(user_id);
CREATE INDEX IF NOT EXISTS voice_memos_created_at_idx ON voice_memos(created_at DESC);
```
**Click:** Run
**Result:** ✅ Success

---

### STEP 3️⃣: Enable RLS
**Copy & Paste:**
```sql
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;
```
**Click:** Run
**Result:** ✅ Success

---

### STEP 4️⃣: Create 4 Policies

**Policy 1 - INSERT:**
```sql
CREATE POLICY "voice_memos_insert_policy"
  ON voice_memos FOR INSERT WITH CHECK (true);
```
**Click:** Run

**Policy 2 - SELECT:**
```sql
CREATE POLICY "voice_memos_select_policy"
  ON voice_memos FOR SELECT USING (true);
```
**Click:** Run

**Policy 3 - UPDATE:**
```sql
CREATE POLICY "voice_memos_update_policy"
  ON voice_memos FOR UPDATE USING (true) WITH CHECK (true);
```
**Click:** Run

**Policy 4 - DELETE:**
```sql
CREATE POLICY "voice_memos_delete_policy"
  ON voice_memos FOR DELETE USING (true);
```
**Click:** Run

**Result:** ✅ All 4 have green checkmarks

---

### STEP 5️⃣: Create Storage Bucket
**URL:** https://app.supabase.com/project/pddilavtexsnbifdtmrc/storage/buckets

**Steps:**
1. Click **"New bucket"**
2. Type: `voice-memos` (exact name!)
3. Toggle **"Public bucket"** ON
4. Click **"Create bucket"**

**Result:** ✅ Bucket appears in list

---

### STEP 6️⃣: Verify Table
**Copy & Paste:**
```sql
SELECT * FROM voice_memos;
```
**Click:** Run
**Result:** ✅ Empty table (0 rows)

---

### STEP 7️⃣: Verify Policies
**Copy & Paste:**
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'voice_memos';
```
**Click:** Run
**Result:** ✅ Shows 4 policies

---

### STEP 8️⃣: Test in App
1. Close app completely
2. Reopen app
3. **Sign up** or **Log in**
4. **Record a memo**
5. Go to **Notes** tab
6. **Should see your memo!** ✨

---

## Verify in Supabase

**After recording, run this to see your memo:**
```sql
SELECT id, user_id, title, created_at FROM voice_memos ORDER BY created_at DESC LIMIT 5;
```

**Result:** ✅ Your memo should appear

---

## If Something Goes Wrong

❌ **"Table already exists"** → That's fine, continue to STEP 2

❌ **"Policy already exists"** → Drop and recreate:
```sql
DROP POLICY IF EXISTS "voice_memos_insert_policy" ON voice_memos;
CREATE POLICY "voice_memos_insert_policy" ON voice_memos FOR INSERT WITH CHECK (true);
```

❌ **Still no memos** → Open browser console (F12) and record again, share the error

---

**That's it! 8 steps to working memos!** 🎉
