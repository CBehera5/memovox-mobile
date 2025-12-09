# 🔴 BROWSER CONSOLE DEBUG GUIDE

**The database is EMPTY (0 memos) but code looks correct.**  
This means the save is failing silently somewhere. Let's find exactly where.

---

## STEP 1: Open Browser Console

1. **Open your app in web browser** (or use dev tools if in mobile)
2. **Press F12** (or Cmd+Option+I on Mac)
3. **Click "Console" tab**
4. **You should see a mostly empty console**

---

## STEP 2: Record a Memo and Watch Console

1. **In the app, go to Record tab**
2. **Click "Start Recording"**
3. **Say something** like: "Team meeting tomorrow at 10 AM"
4. **Click "Stop Recording"**
5. **IMMEDIATELY look at browser console**
6. **Watch for:**
   - ✅ All GREEN logs (expected)
   - ❌ Any RED error messages (problem!)
   - ⚠️ Any YELLOW warnings

---

## STEP 3: Look for These Specific Messages

### EXPECTED LOGS (in order):
```
✅ "Processing recording:"
✅ "Starting AI analysis..."
✅ "Analysis complete: {transcription: '...', category: '...', ...}"
✅ "Uploading audio to Supabase..."
✅ "Audio uploaded successfully:"
✅ "Saving memo to Supabase: {id: '...', userId: '...', ...}"
✅ "Memo saved to database: {id: '...', ...}"
✅ "Memo saved successfully"
```

### IF YOU SEE RED ERRORS, NOTE:
- **What the error message says**
- **At what step it appeared** (AI analysis? Upload? Save?)
- **Exact error text**

---

## STEP 4: Common Problems & What To Do

### ❌ Problem 1: Stops at "Starting AI analysis..."
**ERROR:** Something like "Failed to transcribe" or Groq error  
**SOLUTION:** Check Groq API key in `src/services/AIService.ts` line 18

### ❌ Problem 2: Stops at "Uploading audio to Supabase..."
**ERROR:** Something like "Failed to upload audio" or storage bucket error  
**SOLUTION:** 
- Go to Supabase → Storage
- Check if "voice-memos" bucket exists
- If NOT, create it (public bucket)
- If YES, check RLS permissions

### ❌ Problem 3: Stops at "Saving memo to Supabase..."
**ERROR:** Something like:
- "violates row-level security policy" → RLS blocking
- "Invalid API key" → Auth issue
- "user_id not found" → Foreign key issue

**SOLUTION:** Run SQL from CRITICAL_FIX.md in Supabase SQL Editor

### ❌ Problem 4: Shows "Memo saved successfully" but still no data
**ERROR:** Silent failure - no error thrown but data didn't save  
**SOLUTION:** 
- Check if database table `voice_memos` exists (it should)
- Run: `SELECT * FROM voice_memos;` in Supabase SQL Editor
- Check RLS policies are correct

### ❌ Problem 5: "You must be logged in" appears
**ERROR:** `AuthService.getCurrentUser()` returned null  
**SOLUTION:** 
- Make sure you're logged in (email should show in app)
- Try: Sign in → Try recording again

---

## STEP 5: Send Me The Console Output

**Copy all console messages and errors, then send them to me:**

Example format:
```
Processing recording: file:///Users/.../AUD_20250101_120000.m4a
Starting AI analysis...
Analysis complete: {transcription: 'Team meeting tomorrow...', category: 'Work', ...}
Uploading audio to Supabase...
ERROR: Failed to upload audio: voice-memos bucket does not exist
```

---

## STEP 6: Debugging Tools in Console

You can also run these commands directly in browser console to test:

### Test 1: Check if user is logged in
```javascript
// Paste in console and press Enter
const user = localStorage.getItem('supabase.auth.token');
console.log('Logged in:', !!user ? 'YES' : 'NO');
```

### Test 2: Check if Supabase client is initialized
```javascript
// Paste in console and press Enter
const { supabase } = require('./src/config/supabase');
console.log('Supabase initialized:', !!supabase);
```

### Test 3: Check network errors
In DevTools → Network tab:
- Record memo
- Look for failed requests (red X)
- Click on any red requests to see error details

---

## 🚨 CRITICAL: After Getting Console Output

1. **Copy EVERY line from the console**
2. **Note which step it stops at** (AI? Upload? Save?)
3. **Send me the exact error messages**
4. **I can then provide exact fix**

---

## Summary: What We're Looking For

| Scenario | Meaning | Solution |
|----------|---------|----------|
| Shows all greens, memo saves | ✅ Working! | Done! |
| Stops at "Analysis" | Groq API issue | Check API key |
| Stops at "Upload" | Storage bucket missing/broken | Create/fix bucket |
| Stops at "Save" | RLS policy blocking | Run CRITICAL_FIX.md SQL |
| Shows all greens but still empty | Silent failure | Check table/RLS in Supabase |
| "Must be logged in" | Auth issue | Sign in first |

---

## Pro Tip: Browser DevTools Network Tab

For more detailed debugging:
1. Open DevTools (F12)
2. Go to **Network** tab
3. Record memo
4. Look for these requests:
   - POST to `/storage/v1/object/voice-memos/...` (audio upload)
   - POST to `/rest/v1/voice_memos` (database insert)
5. Click each request and check the **Response** for errors

---

**Once you share the console output, I'll know exactly what's wrong and provide the fix!**
