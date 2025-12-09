# Audio Chat Feature - Quick Test Guide

## 🚀 Quick Start Test (5 minutes)

### **Test 1: Text Chat (Easiest)**
```
1. Open app and go to Chat tab (💬 icon)
2. Type: "Hello, what can you do?"
3. Tap send arrow →
4. Verify: AI responds with helpful message
5. Type: "What are my voice memos about?"
6. Verify: AI asks contextual follow-up or responds intelligently
```

### **Test 2: Create Multiple Sessions**
```
1. Tap the menu icon (☰) at top
2. See current chat session listed
3. Tap the "+" button (Add New Chat)
4. Type: "What's the weather?"
5. Tap send
6. Tap menu (☰) again
7. Verify: Two sessions now listed
8. Tap first session to switch back
```

### **Test 3: Delete a Session**
```
1. Tap menu (☰) to see all chats
2. Find a session
3. Tap trash icon 🗑️
4. Confirm deletion
5. Verify: Session is removed from list
```

### **Test 4: Voice Chat (Most Fun)**
```
1. Tap Record button (blue, with microphone)
2. Speak clearly: "What's 2 plus 2?"
3. Watch recording timer count up
4. Tap Stop button (red, with stop icon)
5. Wait for transcription...
6. Verify: Your speech appears as message
7. Verify: AI responds to your question
8. Verify: Message appears with timestamp
```

## 📋 Full Feature Test Checklist

### **Session Management** (5 tests)
- [ ] Create new chat session → Session appears in menu
- [ ] Load existing session → Messages load correctly
- [ ] Switch between sessions → Different messages appear
- [ ] Rename session → Title updates in menu
- [ ] Delete session → Removed from menu

### **Text Chat** (5 tests)
- [ ] Type single line message → Sends correctly
- [ ] Type multi-line message → Formats properly
- [ ] Send empty message → Prevented (button disabled)
- [ ] AI responds → Response appears immediately
- [ ] Timestamps show → Correct time displayed

### **Voice Chat** (6 tests)
- [ ] Start recording → Timer appears
- [ ] Record message → Timer counts up
- [ ] Stop recording → Timer stops
- [ ] Transcription → Voice converts to text
- [ ] AI transcription accuracy → Matches what was said
- [ ] AI responds to voice → Answers question asked

### **UI/UX** (5 tests)
- [ ] Messages auto-scroll down → Latest visible
- [ ] User messages are blue → Visual distinction
- [ ] AI messages are gray → Visual distinction
- [ ] Loading indicator → Shows while thinking
- [ ] Empty state → Shows when no messages

### **Data Persistence** (3 tests)
- [ ] Close and reopen app → Chat history intact
- [ ] Switch sessions → Data loads correctly
- [ ] Delete session locally → Gone after restart

## 🔧 Technical Tests

### **API Integration** (3 tests)
```
1. Check Console for errors
2. Verify Groq API responses
3. Confirm conversation context is used
```

### **Error Handling** (2 tests)
```
1. Disable internet and try to send → Shows error alert
2. Try to record without permission → Shows error alert
```

### **Performance** (2 tests)
```
1. Send 10 messages → All load quickly
2. Switch sessions rapidly → No crashes
```

## 📊 Expected Behaviors

### **Normal Flow:**
1. User taps record → Recording starts, timer shows
2. User stops recording → Displays transcription + sends
3. AI processes → "AI is thinking..." appears
4. AI responds → Message appears with timestamp
5. Chat updates → Auto-scroll to latest message

### **Text Input Flow:**
1. User types text → Text appears in input
2. User taps send → Message sent
3. AI responds → Response appears below
4. Conversation continues → Context maintained

### **Session Switch:**
1. User taps menu → Sessions list visible
2. User taps session → Different messages load
3. Chat state updates → Input clears, new messages show

## 🎯 Success Criteria

✅ **All Tests Pass If:**
1. Text messages send and AI responds
2. Voice messages record and transcribe
3. AI maintains conversation context
4. Multiple sessions work independently
5. Sessions persist across restarts
6. UI is responsive and beautiful
7. No console errors
8. Loading states show properly
9. Timestamps are accurate
10. Error handling works gracefully

## 🆘 If Something Breaks

### **Chat tab won't open:**
- Check console for import errors
- Verify chat.tsx file exists in app/(tabs)/
- Restart app/development server

### **Messages won't send:**
- Check internet connection
- Verify Groq API key is set in ChatService
- Check console for API errors

### **Voice recording fails:**
- Check microphone permissions
- Verify device has microphone
- Check AudioService is initialized

### **Sessions not persisting:**
- Check AsyncStorage is working
- Verify user ID is set
- Check device has storage space

## 📈 Performance Benchmarks

**Target Times:**
- Create new session: < 500ms
- Send text message: < 2 seconds
- Record and send voice: < 5 seconds
- AI response time: 1-3 seconds
- Session switch: < 500ms
- Load 20 messages: < 1 second

## 🎓 Test Scenarios

### **Scenario 1: Product Demo**
```
1. "I'm thinking about buying a laptop for work"
2. "What specs should I look for?"
3. "Can you compare MacBook and Dell?"
4. "What about the price range?"
5. Verify: AI provides thoughtful, contextual responses
```

### **Scenario 2: Real World Usage**
```
1. Record: "Remind me to call the dentist"
2. Type: "What's their number?"
3. Record: "Actually, I think they're closed today"
4. Type: "So when should I call?"
5. Verify: AI understands the evolving context
```

### **Scenario 3: Multi-Session**
```
Session A: "Tell me about Python programming"
Session B: "How do I make pasta?"
Session A: "What about JavaScript?" - Should still discuss Python
Session B: "Any dessert ideas?" - Should still discuss cooking
Verify: Each session has separate context
```

## ✅ Before Submitting to Production

- [ ] All 20+ tests pass
- [ ] No console errors or warnings
- [ ] Tested on iOS and Android
- [ ] Tested on slow networks
- [ ] Tested with large conversations (100+ messages)
- [ ] Tested voice with accents/background noise
- [ ] Tested with maximum message length
- [ ] Memory usage is acceptable

## 📞 Quick Support

If something isn't working:
1. Check console (Ctrl+Shift+I or Cmd+Option+I)
2. Look for red error messages
3. Note the error message
4. Check TROUBLESHOOTING.md

**Common errors and solutions:**
- "Cannot find ChatService" → Check file path
- "API Error 429" → Rate limited, wait and retry
- "Recording failed" → Check permissions
- "Message won't send" → Check internet connection
