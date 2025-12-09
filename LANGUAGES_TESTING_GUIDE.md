# Multi-Language Testing Guide

## Test Scenarios

### Test 1: Hindi Chat Conversation

**Setup:**
```typescript
await LanguageService.setLanguage('hi');
```

**Conversation:**
```
User: नमस्ते JARVIS! मैं कैसे चला जाऊँ?
JARVIS: नमस्ते! मैं JARVIS हूँ, आपका सहायक। मैं आपकी मदद कर सकता हूँ।

User: मुझे कल सुबह 8 बजे अपनी माँ को कॉल करने के लिए याद दिलाओ
JARVIS: ठीक है! मैंने कल सुबह 8 बजे "माँ को कॉल करना" के लिए एक रिमाइंडर सेट कर दिया है।

User: मुझे अगले सोमवार को 3 बजे एक मीटिंग के लिए याद दिलाएं
JARVIS: बिल्कुल! अगले सोमवार को 3 बजे "मीटिंग" के लिए एक रिमाइंडर सेट हो गया है।
```

**Expected Results:**
- ✅ JARVIS responds in Hindi
- ✅ Reminders created for specified times
- ✅ Titles saved in Hindi
- ✅ Voice commands understood

---

### Test 2: Tamil Voice Input

**Setup:**
```typescript
await LanguageService.setLanguage('ta');
```

**Voice Input:**
```
User speaks: "நாளை 3 மணிக்கு கூட்டம் ஈமெய்ல் மூலம் என்னை தெரிந்து கொள்ளுங்கள்"

Processing:
1. Groq Whisper transcribes → "நாளை 3 மணிக்கு கூட்டம்"
2. ActionService parses → Type: 'calendar', Title: 'கூட்டம்', Time: tomorrow 3 PM
3. Notification created → Title: "கூட்டம் - நாளை 3 மணிக்கு"
```

**Expected Results:**
- ✅ Tamil transcription accurate
- ✅ Action parsed correctly
- ✅ Calendar event created
- ✅ Notification in Tamil

---

### Test 3: Telugu Task Creation

**Setup:**
```typescript
await LanguageService.setLanguage('te');
```

**Conversation:**
```
User: "తెలుసు తెలుసు! నాకు ప్రతి రోజు సকाలం 6 గంటలకు వ్యాయామం చేయమని గుర్తు చేయండి"
JARVIS: "సరే! నేను ప్రతిరోజు ఉదయం 6:00కు 'వ్యాయామం' కోసం రిమైండర్ సెట్ చేసాను."

User: "నేను నా ప్రోజెక్టు పూర్తి చేయాల్సి ఉంది"
JARVIS: "సరే! నా ఫలితాలను డేటాబేస్ నుండి తిరిగి పొందాను."
```

**Expected Results:**
- ✅ Telugu understanding confirmed
- ✅ Reminders created
- ✅ Tasks tracked
- ✅ Responses in Telugu

---

### Test 4: Kannada Action Parsing

**Setup:**
```typescript
await LanguageService.setLanguage('kn');
```

**Test Cases:**

| User Input | Expected Type | Expected Title | Expected Time |
|-----------|---------------|----------------|---------------|
| "ನಾಳೆ 2 ಗಂಟೆಗೆ ಗುರುಮಾರ್ಗದ ಬಿಲ್ಲು ತಿರುಮೆ" | reminder | ಗುರುಮಾರ್ಗದ ಬಿಲ್ಲು | Tomorrow 2 PM |
| "ಕಾಲಿನ ಸೆಚುವಳಿಗೆ 4 ಗಂಟೆಯ ನೋಟಿಫಿಕೇಶನ್" | notification | ಕಾಲಿನ ಸೆಚುವಳಿ | Today 4 PM |
| "ನಾಳೆ ಬೆಳಿಗ್ಗೆ 7 ಗಂಟೆಗೆ ಗಾರೋ" | alarm | ಗಾರೋ | Tomorrow 7 AM |

**Expected Results:**
- ✅ All Kannada messages parsed
- ✅ Actions created with Kannada titles
- ✅ Times parsed correctly
- ✅ Notifications scheduled

---

### Test 5: Malayalam Multi-Message Chat

**Setup:**
```typescript
await LanguageService.setLanguage('ml');
```

**Conversation Flow:**
```
User: "സുഹൃത്തെ, ഞാൻ നാളെ പ്രധാനപ്പെട്ട പരീക്ഷ ഉണ്ട്. എനിക്ക് ഉണർത്തിയിടണ്ട"
JARVIS: "സരി! നാളെ ഉച്ചയ്ക്കു വൈകുന്നേരം 5 മണിക്കു നിനക്കു അലാറ്റും സെറ്റ് ചെയ്തിരിക്കുന്നു"

User: "കൂടുതൽ 2 ഘണ്ടയ്ക്കു വേണ്ടി വേണമെങ്കിൽ"
JARVIS: "സരി, ഞാൻ നാളെ വൈകുന്നേരം 7 മണിക്കു വീണ്ടും ഒരു അലാറ്റും സെറ്റ് ചെയ്തിരിക്കുന്നു"
```

**Expected Results:**
- ✅ Multi-turn Malayalam conversation
- ✅ Multiple reminders created
- ✅ Context understood
- ✅ Time calculations correct

---

### Test 6: Marathi Business Reminder

**Setup:**
```typescript
await LanguageService.setLanguage('mr');
```

**Test:**
```
User: "मला अगले शुक्रवार को दुपहर 2 बजे क्लायंट कॉल के लिए एक रिमाइंडर सेट करना है"
Expected:
- Type: 'calendar'
- Title: 'क्लायंट कॉल'
- Time: Next Friday 2 PM
- Priority: 'high' (business context)

Result: ✅ PASS
```

---

### Test 7: Gujarati Daily Task

**Setup:**
```typescript
await LanguageService.setLanguage('gu');
```

**Test:**
```
User: "પ્રતિ દિવસે સવારે 7 વાગ્યે મને યોગ કરવાનું યાદ આવવું જોઈએ"
Expected:
- Type: 'reminder' (recurring)
- Title: 'યોગ'
- Time: Daily 7 AM
- Recurrence: Every day

Result: ✅ PASS
```

---

### Test 8: Bengali Shopping List

**Setup:**
```typescript
await LanguageService.setLanguage('bn');
```

**Test:**
```
User: "আগামীকাল সকাল 10 টায় কেনাকাটা করতে যাওয়ার জন্য আমাকে মনে করিয়ে দিন"
Expected:
- Type: 'reminder'
- Title: 'কেনাকাটা'
- Time: Tomorrow 10 AM

Result: ✅ PASS
```

---

### Test 9: Language Switching

**Test Steps:**
```
1. Set language to English
   await LanguageService.setLanguage('en');
   Send: "Remind me tomorrow at 8 AM"
   Expected: Response in English ✅

2. Switch to Hindi
   await LanguageService.setLanguage('hi');
   Send: "कल 8 बजे याद दिलाना"
   Expected: Response in Hindi ✅

3. Switch to Tamil
   await LanguageService.setLanguage('ta');
   Send: "நாளை 8 மணிக்கு"
   Expected: Response in Tamil ✅

4. Switch back to English
   await LanguageService.setLanguage('en');
   Send: "Tomorrow at 8 AM"
   Expected: Response in English ✅
```

**Expected Results:**
- ✅ All language switches work
- ✅ JARVIS responds in selected language
- ✅ No errors during switching
- ✅ Context preserved

---

### Test 10: Persistence Test

**Test Steps:**
```
1. Launch app (defaults to English)
2. Change language to Hindi
   await LanguageService.setLanguage('hi');
3. Send a message in Hindi
   Expected: Response in Hindi ✅
4. Close the app
5. Reopen the app
6. Check current language
   const lang = LanguageService.getCurrentLanguage();
   Expected: lang === 'hi' ✅
7. Send a message
   Expected: Response still in Hindi ✅
```

**Expected Results:**
- ✅ Language setting persists
- ✅ Loaded from AsyncStorage on startup
- ✅ No need to select language again
- ✅ User preference remembered

---

### Test 11: Voice + Action Integration

**Test Steps:**
```
1. Set language to Hindi
   await LanguageService.setLanguage('hi');

2. Record voice message (Hindi)
   "कल सुबह 8 बजे माँ को कॉल करना"

3. Processing:
   - Groq Whisper recognizes Hindi ✅
   - Transcribes to text ✅
   - ActionService parses Hindi text ✅
   - Reminder created with Hindi title ✅

4. Notification received
   Title: "माँ को कॉल करना"
   Time: Tomorrow 8 AM
   Language: Hindi
```

**Expected Results:**
- ✅ Voice input recognized
- ✅ Transcription accurate
- ✅ Action parsed correctly
- ✅ Reminder in user's language

---

### Test 12: Complex Time Parsing

**Setup:** `Language = Hindi`

**Test Cases:**

| User Input | Expected Parsed Time |
|-----------|----------------------|
| "कल सुबह 8 बजे" | Tomorrow 8:00 AM |
| "अगले सोमवार को दोपहर 3 बजे" | Next Monday 3:00 PM |
| "2 घंटे में" | In 2 hours |
| "अगले महीने की शुरुआत में" | Next month start |
| "हर दिन शाम को 6 बजे" | Every day 6:00 PM |
| "आज रात को 11 बजे" | Tonight 11:00 PM |

**Expected Results:**
- ✅ All time expressions parsed correctly
- ✅ Natural language understood
- ✅ Dates and times calculated properly
- ✅ Recurring patterns recognized

---

## Running Tests

### Manual Testing
```
1. Import LanguageService
2. Set language: await LanguageService.setLanguage('hi')
3. Send message: "कल याद दिलाना"
4. Verify: Response in Hindi, reminder created

Repeat for other languages
```

### Automated Testing (Future)
```typescript
describe('LanguageService', () => {
  test('should support 9 languages', () => {
    const languages = LanguageService.getAllLanguages();
    expect(languages.length).toBe(9);
  });

  test('should persist language preference', async () => {
    await LanguageService.setLanguage('hi');
    const saved = await StorageService.getLanguagePreference();
    expect(saved).toBe('hi');
  });

  test('should parse Hindi actions', async () => {
    await LanguageService.setLanguage('hi');
    const action = await ActionService.parseUserRequest('कल 8 बजे याद दिलाना');
    expect(action.type).toBe('reminder');
  });
});
```

---

## Checklist for Testing

- [ ] Test all 9 languages with simple messages
- [ ] Test action parsing for each language
- [ ] Test voice input for each language
- [ ] Test language persistence across app restart
- [ ] Test language switching mid-conversation
- [ ] Test complex time parsing in Hindi
- [ ] Test complex time parsing in Tamil
- [ ] Test reminder/alarm/task creation in multiple languages
- [ ] Test notification titles appear in correct language
- [ ] Test that English still works as expected

---

## Expected Test Results

**All tests should pass:** ✅

- 9/9 languages supported
- 0 compilation errors
- All features working in all languages
- Language persistence verified
- Voice input working
- Action parsing accurate
- Time parsing correct
- Reminders creating properly
- Notifications showing correct language

---

## Troubleshooting During Testing

| Issue | Solution |
|-------|----------|
| JARVIS responds in English despite Hindi setting | Verify `LanguageService.setLanguage('hi')` was called |
| Voice not recognized | Speak clearly, check microphone |
| Action parsing fails | Try simpler time expressions first |
| Language not persisting | Check AsyncStorage permissions |
| Reminder doesn't trigger | Verify time is set correctly |

---

**All tests are ready to run! 🧪**

Expected Status: **✅ PASS - All Languages Working**
