# 🤖 AI Testing - Quick Reference

## The Fastest Way to Test (2 minutes)

```
1. Open app in browser
2. Press F12 → Console tab
3. Record a memo
4. Watch for these logs in order:

✅ "Processing recording"
✅ "Starting AI analysis"
✅ "Transcription: [your text]"
✅ "Analysis completed"
✅ "Memo saved successfully"

5. Go to Notes tab → See memo with AI title & category
```

---

## 3 Things AI Does

| Feature | What | How to Test |
|---------|------|------------|
| **Transcription** | Audio → Text | Record memo, check console |
| **Analysis** | Text → Category, Type, Title | Record memo, check results |
| **Insights** | Understanding | View memo details |

---

## What Success Looks Like

| Check | Pass ✅ | Fail ❌ |
|-------|--------|--------|
| **Console Log** | "Analysis completed" | Error message |
| **Notes Tab** | Memo appears with title | Memo missing/untitled |
| **Database** | All AI fields filled | Fields are NULL |
| **Category** | Matches content | Wrong category |
| **Title** | Auto-generated | "Untitled Memo" |

---

## Test Cases

**Say this:** | **Expect this:**
---|---
"Meeting at 2pm" | Work/event/Meeting
"Call mom" | Personal/reminder
"Buy milk" | Shopping/note
"Great weather" | Personal/note

---

## If Something's Wrong

### Groq not initialized?
- Check API key in AIService.ts
- Check network connection
- Restart app

### Transcription missing?
- Check "Transcription: " log
- Audio file might be empty

### Analysis not running?
- Check "Analysis completed" log
- Watch for error messages
- Check Groq API status

### Memo appears but no AI data?
- Database issue, not AI
- Check CRITICAL_FIX.md
- Run RLS policy fixes

---

## Console Logs to Watch For

```javascript
// ✅ Good
"Groq client initialized successfully"
"Transcription: Your text here"
"Analysis completed: {...}"
"Memo saved successfully"

// ❌ Bad
"Error initializing Groq client"
"Error in transcription"
"Error analyzing"
"Memo saved but no analysis"
```

---

## Run Test Script

```bash
cd /Users/chinmaybehera/memovox-rel1/memovox-mobile
node test-ai.js
```

Shows if Groq API is working

---

## Links

**Open:** AI_TESTING_GUIDE.md for complete guide

**Test:** node test-ai.js

**Check:** Browser console (F12)

---

**AI working if all tests pass!** ✨
