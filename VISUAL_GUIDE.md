# 👁️ Visual Step-by-Step Guide

This guide shows you EXACTLY what you'll see at each step.

---

## STEP 1: Open SQL Editor

**Go to:** https://app.supabase.com/project/pddilavtexsnbifdtmrc/sql/new

**You'll see:** A big text area where you can type SQL

```
┌─────────────────────────────────────────┐
│  SQL Editor                         Run │
├─────────────────────────────────────────┤
│                                         │
│  [Your cursor here - paste SQL here]   │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

---

## STEP 2: Paste & Run CREATE TABLE

**Copy this from COPY_PASTE_SQL.sql:**
```sql
CREATE TABLE IF NOT EXISTS voice_memos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  ...
);
```

**Paste it into the SQL Editor**

**Click the "Run" button (top right, green)**

**You'll see:**
```
✅ Success. No rows returned
```

---

## STEP 3: Paste & Run CREATE INDEX

**Clear the editor (Ctrl+A, Delete)**

**Copy the INDEX command:**
```sql
CREATE INDEX IF NOT EXISTS voice_memos_user_id_idx ON voice_memos(user_id);
CREATE INDEX IF NOT EXISTS voice_memos_created_at_idx ON voice_memos(created_at DESC);
```

**Paste & Click Run**

**You'll see:**
```
✅ Success. No rows returned
```

---

## STEP 4: Paste & Run ALTER TABLE

**Clear the editor**

**Copy:**
```sql
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;
```

**Paste & Click Run**

**You'll see:**
```
✅ Success. No rows returned
```

---

## STEP 5: Create INSERT Policy

**Clear the editor**

**Copy:**
```sql
CREATE POLICY "voice_memos_insert_policy"
  ON voice_memos FOR INSERT
  WITH CHECK (true);
```

**Paste & Click Run**

**You'll see:**
```
✅ Success. No rows returned
```

---

## STEP 6: Create SELECT Policy

**Clear the editor**

**Copy:**
```sql
CREATE POLICY "voice_memos_select_policy"
  ON voice_memos FOR SELECT
  USING (true);
```

**Paste & Click Run**

**You'll see:**
```
✅ Success. No rows returned
```

---

## STEP 7: Create UPDATE Policy

**Clear the editor**

**Copy:**
```sql
CREATE POLICY "voice_memos_update_policy"
  ON voice_memos FOR UPDATE
  USING (true)
  WITH CHECK (true);
```

**Paste & Click Run**

**You'll see:**
```
✅ Success. No rows returned
```

---

## STEP 8: Create DELETE Policy

**Clear the editor**

**Copy:**
```sql
CREATE POLICY "voice_memos_delete_policy"
  ON voice_memos FOR DELETE
  USING (true);
```

**Paste & Click Run**

**You'll see:**
```
✅ Success. No rows returned
```

---

## STEP 9: Create Storage Bucket

**Go to:** https://app.supabase.com/project/pddilavtexsnbifdtmrc/storage/buckets

**You'll see:**
```
┌──────────────────────────────────┐
│  Buckets          [New bucket]   │
├──────────────────────────────────┤
│                                  │
│  (empty or shows existing buckets)
│                                  │
└──────────────────────────────────┘
```

**Click "New bucket"**

**A dialog will pop up:**
```
┌─────────────────────────────────┐
│  Create a new bucket            │
├─────────────────────────────────┤
│ Name:                           │
│ [voice-memos]  ← TYPE THIS      │
│                                 │
│ [ ] Public bucket ← TOGGLE THIS │
│                                 │
│  [Cancel]  [Create bucket]      │
└─────────────────────────────────┘
```

**Type:** `voice-memos` (lowercase, with hyphen)

**Toggle:** "Public bucket" to ON (checkbox checked)

**Click:** "Create bucket"

**You'll see:**
```
✅ Bucket "voice-memos" created
```

And it will appear in the list:
```
📦 voice-memos
```

---

## STEP 10: Verify Everything

**Back in SQL Editor, run this to check the table:**

```sql
SELECT * FROM voice_memos;
```

**You'll see:**
```
✅ Success. 0 rows
```

(Empty is correct - no memos yet!)

---

## STEP 11: Verify Policies

**In SQL Editor, run:**

```sql
SELECT policyname FROM pg_policies WHERE tablename = 'voice_memos';
```

**You'll see:**
```
✅ Results (4 rows):
│ voice_memos_insert_policy
│ voice_memos_select_policy
│ voice_memos_update_policy
│ voice_memos_delete_policy
```

(All 4 should be there!)

---

## STEP 12: Test in App

**Close the app completely** (swipe it away if on phone, or close the window)

**Reopen the app**

**Sign up or Log in**

**Go to Record tab**

**Record a short memo** (say anything)

**You should see:**
```
✅ "Memo saved successfully!"
```

**Go to Notes tab**

**You should see:**
```
✨ Your memo appears in the list!
```

---

## STEP 13: Final Verification

**Back in Supabase SQL Editor, run:**

```sql
SELECT id, user_id, title, created_at FROM voice_memos ORDER BY created_at DESC;
```

**You'll see:**
```
✅ Results (1 row - your memo):
│ id: memo-123...
│ user_id: user-456...
│ title: "Untitled Memo"
│ created_at: 2025-12-07 12:34:56
```

---

## 🎉 YOU'RE DONE!

If you see your memo in:
- ✅ Notes tab in the app
- ✅ SQL query results

Then everything is working! Your Supabase is fully configured!

---

## If You Don't See Your Memo

### Check 1: Browser Console
Press **F12** on your keyboard

Click **"Console"** tab

Try recording a memo again

Look for any RED ERROR MESSAGES

**Share those error messages with me**

### Check 2: Database Query
In Supabase SQL Editor, run:
```sql
SELECT * FROM voice_memos;
```

**If empty (0 rows):** Memo is not being saved to database
- Check console for errors

**If has data:** Memo is in database but Notes tab isn't showing it
- There's an issue with the Notes tab code

### Check 3: Make Sure You're Logged In
- Look at the top of the app
- Should show your email
- If not, sign in first

---

**Follow each step carefully and you'll get it working!** 💪
