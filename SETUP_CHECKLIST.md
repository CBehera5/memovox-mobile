# Supabase Configuration Checklist

Follow this checklist step-by-step. ✅ each item as you complete it.

---

## 📋 TABLE & INDEXES (SQL Editor)

**URL:** https://app.supabase.com/project/pddilavtexsnbifdtmrc/sql/new

- [ ] **STEP 1:** Paste CREATE TABLE query and click "Run"
  - Expected: Green checkmark, "Success"
  
- [ ] **STEP 2:** Paste CREATE INDEX query and click "Run"
  - Expected: Green checkmark, "Success"

---

## 🔐 ROW-LEVEL SECURITY (SQL Editor)

- [ ] **STEP 3:** Paste ALTER TABLE ENABLE ROW LEVEL SECURITY and click "Run"
  - Expected: Green checkmark, "Success"

- [ ] **STEP 4A:** Paste INSERT policy and click "Run"
  - Expected: Green checkmark, "Success"
  
- [ ] **STEP 4B:** Paste SELECT policy and click "Run"
  - Expected: Green checkmark, "Success"
  
- [ ] **STEP 4C:** Paste UPDATE policy and click "Run"
  - Expected: Green checkmark, "Success"
  
- [ ] **STEP 4D:** Paste DELETE policy and click "Run"
  - Expected: Green checkmark, "Success"

---

## 🪣 STORAGE BUCKET

**URL:** https://app.supabase.com/project/pddilavtexsnbifdtmrc/storage/buckets

- [ ] **STEP 5A:** Click "New bucket" button
  
- [ ] **STEP 5B:** Type bucket name: `voice-memos` (lowercase, exact!)
  
- [ ] **STEP 5C:** Toggle "Public bucket" to ON
  
- [ ] **STEP 5D:** Click "Create bucket"
  - Expected: Bucket appears in list

---

## ✅ VERIFICATION

**Back in SQL Editor:**

- [ ] **STEP 6:** Run `SELECT * FROM voice_memos;`
  - Expected: Empty table (0 rows)
  
- [ ] **STEP 7:** Run `SELECT policyname FROM pg_policies WHERE tablename = 'voice_memos';`
  - Expected: 4 policies listed

---

## 🧪 TEST IN APP

- [ ] **STEP 8A:** Completely close the app
  
- [ ] **STEP 8B:** Reopen the app
  
- [ ] **STEP 8C:** Sign up or log in
  - Expected: You're logged in
  
- [ ] **STEP 8D:** Go to Record tab and record a memo
  - Expected: See "Memo saved successfully!" alert
  
- [ ] **STEP 8E:** Go to Notes tab
  - Expected: Your memo appears in the list ✨

---

## 🎯 FINAL VERIFICATION

**In SQL Editor, run:**
```sql
SELECT id, user_id, title, created_at FROM voice_memos ORDER BY created_at DESC;
```

- [ ] Your memo appears in the results

---

## ❌ TROUBLESHOOTING

If something fails:

1. **For table/index errors:**
   - Copy the full error message
   - Share it with me

2. **For policy errors:**
   - Drop the policy: `DROP POLICY IF EXISTS "policy_name" ON voice_memos;`
   - Run the CREATE POLICY command again

3. **For bucket errors:**
   - If it says "bucket already exists", that's OK - it means it's already set up

4. **For app errors:**
   - Open browser developer console: Press **F12**
   - Try recording a memo
   - Share any red error messages

---

## 📝 NOTES

- All SQL should be run in Supabase SQL Editor
- Each command should show a green checkmark
- Don't skip any steps
- Some commands you might run twice if you make a mistake - that's fine
- The bucket name MUST be exactly: `voice-memos` (lowercase, with hyphen)

---

## ✨ YOU'RE DONE WHEN:

✅ All steps are checked
✅ All SQL commands show green checkmarks
✅ Storage bucket exists
✅ Memo appears in Notes tab after recording
✅ Memo appears in SQL query results

**Congratulations! Your Supabase is configured!** 🎉
