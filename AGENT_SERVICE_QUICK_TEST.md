# 🧪 Quick Test Guide: AgentService

## TL;DR - Test in 30 Seconds

```bash
1. Open MemoVox app
2. Tap "Profile" tab (bottom right)
3. Scroll to bottom
4. Tap "🧪 Test AgentService" button
5. Watch tests run ✅
```

---

## What You'll See

### 🟢 SUCCESS (Expected)
```
🧪 Testing AgentService...

📋 Test 1: Suggesting Actions from Memo
Input: "Team Meeting Notes"
✅ Generated 3 suggestion(s):

1. Prepare Q4 Presentation
   Type: task
   Priority: high
   Due: 2025-12-13
   Confidence: 95%

2. Review Everything Thursday
   Type: reminder
   Priority: medium
   Due: 2025-12-12
   Confidence: 88%

3. Coordinate with Team
   Type: task
   Priority: medium
   Due: 2025-12-13
   Confidence: 75%

📝 Test 2: Creating Action
✅ Created: "Prepare Q4 Presentation"

📚 Test 3: Retrieving User Actions
✅ Found 1 action(s)

📅 Test 4: Today's Actions
✅ 0 action(s) due today

✓ Test 5: Completing Action
✅ Completed: "Prepare Q4 Presentation"
   Status: completed

📊 Test 6: Completion Statistics
✅ Stats:
   Total: 1
   Completed: 1
   Percentage: 100.0%
   Trend: up

⚠️  Test 7: Overdue Actions
✅ 0 overdue action(s)

🎉 All Tests Passed!
```

### 🔴 FAILURE (Troubleshoot)
If you see red error messages:

1. **Check Groq API Key**
   - Open `src/services/AIService.ts`
   - Verify API key is present
   - Test key at https://console.groq.com

2. **Check Network**
   - LLM API should work in dev build
   - Whisper API blocked (expected)
   - Try on different network

3. **Clear Storage**
   - Profile → "Clear All Data"
   - Restart app
   - Try test again

4. **Check Console**
   - Open React Native debugger
   - Look for error messages
   - Share logs if needed

---

## What Gets Tested

| Test # | Feature | What It Checks |
|--------|---------|----------------|
| 1 | AI Suggestions | Groq LLM analyzes memo and suggests 1-3 actions |
| 2 | Action Creation | Creates task in AsyncStorage with ID and timestamp |
| 3 | Action Retrieval | Gets all user actions from storage |
| 4 | Today's Filter | Filters actions due today |
| 5 | Mark Complete | Updates action status and sets completion time |
| 6 | Stats Calculation | Computes completion %, trend, weekly/monthly metrics |
| 7 | Overdue Detection | Finds past-due tasks |

---

## Visual Flow

```
┌─────────────────────────────────────────┐
│         MemoVox App Running             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Profile Tab → Scroll → Test Button    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Test Suite Executes             │
│   (7 tests run automatically)           │
└─────────────────┬───────────────────────┘
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
┌─────────────┐     ┌─────────────┐
│  ✅ PASS    │     │  ❌ FAIL    │
│  Green text │     │  Red text   │
└─────────────┘     └─────────────┘
```

---

## Verification Checklist

After running tests, verify:

- [ ] All 7 tests show ✅ checkmarks
- [ ] No ❌ error messages
- [ ] AI generated 1-3 suggestions
- [ ] Action was created with unique ID
- [ ] Action was retrieved successfully
- [ ] Completion updated with timestamp
- [ ] Stats calculated correctly (100%)
- [ ] No console errors

---

## Test Data Used

**Mock Voice Memo:**
```json
{
  "title": "Team Meeting Notes",
  "transcription": "We need to prepare the Q4 presentation by Friday. John will handle the data analysis, Sarah will create the slides, and I need to review everything by Thursday evening.",
  "category": "Work",
  "type": "note",
  "duration": 45,
  "aiAnalysis": {
    "keywords": ["presentation", "Q4", "Friday", "data analysis", "review"],
    "actionItems": ["Prepare Q4 presentation", "Review everything Thursday"],
    "sentiment": "neutral"
  }
}
```

**Expected AI Suggestions:**
- 3 actionable tasks extracted
- High/medium priority assignments
- Due dates 1-2 days out
- 75-95% confidence scores

---

## Performance Expectations

| Operation | Expected Time | Status |
|-----------|--------------|--------|
| AI Suggestions | < 3 seconds | ⚡ Fast |
| Create Action | < 100ms | ⚡⚡ Very Fast |
| Get Actions | < 50ms | ⚡⚡⚡ Instant |
| Complete Action | < 100ms | ⚡⚡ Very Fast |
| Calculate Stats | < 200ms | ⚡ Fast |

---

## Screenshot Guide

### Step 1: Open Profile
```
┌──────────────────────────────────┐
│  [  ]  [  ]  [▶️]  [  ]  [👤]   │ ← Tap Profile (far right)
└──────────────────────────────────┘
```

### Step 2: Find Test Button
```
┌──────────────────────────────────┐
│ ...                              │
│ [  Clear All Data  ]  ← Red      │
│ [🧪 Test AgentService]  ← Blue   │ ← Tap this!
│ [  Logout  ]                     │
└──────────────────────────────────┘
```

### Step 3: Watch Results
```
┌──────────────────────────────────┐
│ 🧪 AgentService Test Suite       │
│ Test AI-powered actions...       │
│                                  │
│ [  ▶️  Run Tests  ]              │
│                                  │
│ ┌────────────────────────────┐  │
│ │ 🧪 Testing AgentService... │  │
│ │                            │  │
│ │ ✅ Test 1: PASS            │  │
│ │ ✅ Test 2: PASS            │  │
│ │ ✅ Test 3: PASS            │  │
│ │ ...                        │  │
│ └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

## Quick Commands

### Run test programmatically:
```typescript
import { runAgentServiceTest } from './src/tests/testAgentService';
await runAgentServiceTest();
```

### Test individual features:
```typescript
import AgentService from './services/AgentService';

// Test suggestions
const suggestions = await AgentService.suggestActions(memo);
console.log('Suggestions:', suggestions);

// Test action creation
const action = await AgentService.createAction(suggestions[0].action, userId);
console.log('Created:', action);

// Test stats
const stats = await AgentService.getCompletionStats(userId);
console.log('Stats:', stats);
```

---

## Common Issues & Solutions

### Issue 1: "No suggestions generated"
**Solution**: Check Groq API key and network connection

### Issue 2: "Action not found"
**Solution**: Ensure action was created before trying to retrieve

### Issue 3: "Storage error"
**Solution**: Clear AsyncStorage and try again

### Issue 4: "Test button not visible"
**Solution**: Make sure profile.tsx was updated with test button

---

## Success Criteria

✅ **Test passes if:**
- All 7 tests complete without errors
- Green ✅ checkmarks for each test
- No red ❌ error messages
- Results appear within 5 seconds
- Stats calculate to 100% completion

---

## Next Steps After Testing

1. ✅ **Verify tests pass** - All 7 tests green
2. 🔄 **Continue Phase 1** - Add mark complete to VoiceMemoService
3. 🚀 **Start Phase 2** - Integrate AI suggestions into chat
4. 🎨 **Start Phase 3** - Build smart home page UI
5. 📦 **Build APK** - Production build with real APIs

---

## Support

If tests fail or you see unexpected behavior:

1. Check console logs for detailed error messages
2. Verify all files compiled without errors
3. Ensure network connection is stable
4. Try clearing app data and restarting
5. Review `AGENT_SERVICE_TEST_RESULTS.md` for troubleshooting

---

**Status**: ✅ Ready to Test
**Estimated Time**: 30 seconds
**Difficulty**: 🟢 Easy (just tap a button!)
