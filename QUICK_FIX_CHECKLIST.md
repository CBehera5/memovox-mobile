# ✅ QUICK FIX CHECKLIST

## Two Issues Found:

### Issue 1: ✅ FIXED - Groq Model Updated
- Changed from `mixtral-8x7b-32768` (decommissioned) to `llama-3.3-70b-versatile`
- Code updated in `AIService.ts`
- **Action:** Refresh browser to load new code

### Issue 2: ❌ NEEDS FIX - Storage RLS Policy Blocking Uploads
- Error: `StorageApiError: new row violates row-level security policy`
- Need to create proper storage bucket policies
- **Action:** Run SQL commands in Supabase

---

## 📋 STEP-BY-STEP FIX (5 minutes)

### Step 1: Copy SQL Commands
Open `FIX_STORAGE_RLS.md` in your editor

### Step 2: Go to Supabase SQL Editor
https://app.supabase.com/project/pddilavtexsnbifdtmrc/sql/new

### Step 3: Run Each SQL Command
Copy the SQL from `FIX_STORAGE_RLS.md`:

1. **Step 2:** Drop existing policies
   - Copy the DROP POLICY commands
   - Paste in SQL editor
   - Click Run
   - Should see: `✅ Success`

2. **Step 3:** Create upload policy
   - Copy the CREATE POLICY command for uploads
   - Paste in SQL editor
   - Click Run
   - Should see: `✅ Success`

3. **Step 4:** Create read policy
   - Copy the CREATE POLICY command for reads
   - Paste in SQL editor
   - Click Run
   - Should see: `✅ Success`

### Step 4: Verify Bucket Settings
Go to: https://app.supabase.com/project/pddilavtexsnbifdtmrc/storage/buckets

- Click on `voice-memos` bucket
- Make sure "Public bucket" is **ON**
- If not, toggle it ON

### Step 5: Refresh Browser
Press **Cmd+R** (or F5)

### Step 6: Test Recording
1. Go to Record tab
2. Record a short memo
3. Watch the console
4. Should now see:
   - ✅ "Upload returned audioUrl: https://..."
   - ✅ "Memo saved successfully"

### Step 7: Verify Memo Was Saved
1. Go to Notes tab
2. Your memo should appear!
3. Go to Supabase SQL Editor and run:
   ```sql
   SELECT * FROM voice_memos;
   ```
4. Should see your memo in the results

---

## 🎉 That's It!

Once you complete these steps:
- ✅ Recording works
- ✅ AI analysis works
- ✅ Audio uploads to storage
- ✅ Memo saves to database
- ✅ Notes appear in app
- ✅ Everything works end-to-end!

---

## If Something Goes Wrong

Share the console output and I'll help debug!

**Key logs to watch for:**
```
✅ "Uploading audio to Supabase..."
✅ "Upload returned audioUrl: https://..."
✅ "Saving memo to Supabase:"
✅ "Memo saved successfully"
```

If you see any ❌ RED errors instead, share them with me.
