# Chat Debugging Guide

## Current Status

We've hardcoded the Groq API key directly in ChatService.ts, but the chat is still failing.

## What We've Done

1. ✅ **Verified API key works** - Tested with Node.js script, gets successful responses
2. ✅ **Hardcoded API key** in all 5 services
3. ✅ **Added detailed logging** to ChatService initialization and sendMessage

## What to Check Now

### Look for these log messages when you open the chat:

```
=== ChatService Initialization ===
API Key present: true
API Key length: 56
API Key starts with: gsk_7pmu4O
✅ Chat service Groq client initialized successfully
Groq client exists: true
```

If you see `false` for any of these, we have a problem.

### When sending a message, look for:

```
=== SendMessage Called ===
Current session exists: true
Groq client exists: true
API key exists: true
```

## Possible Issues

### Issue 1: ChatService not initializing
**Symptoms**: Don't see initialization logs at all
**Solution**: ChatService singleton might not be running constructor

### Issue 2: Groq client is null
**Symptoms**: See "Groq client exists: false"
**Solution**: Constructor failing silently, check for errors

### Issue 3: Session not created
**Symptoms**: See "Current session exists: false"
**Solution**: createSession() is failing

### Issue 4: API call failing
**Symptoms**: See all "true" but still get error
**Solution**: Network issue or API error

## How to Get Logs

### In Development (Emulator):
1. Open app in emulator
2. Press `Cmd+M` (Mac) or `Ctrl+M` (Windows) to open dev menu
3. Select "Debug JS Remotely" OR "Open Dev Tools"
4. Check Console tab in Chrome DevTools

### OR use React Native Debugger:
1. The logs should appear in the Metro bundler terminal
2. Look for console.log output

### OR use adb logcat:
```bash
adb logcat | grep -i "chatservice\|groq\|sendmessage"
```

## Expected Flow

1. **App starts** → ChatService constructor runs → initializeGroq() called
2. **User opens chat** → createSession() called → Session created in storage
3. **User sends message** → sendMessage() called → Checks groqClient → Calls Groq API → Returns response

## Quick Test

Try this in the chat:
1. Type: "Hello"
2. Look for log: `=== SendMessage Called ===`
3. Look for log: `Sending message to Groq API: Hello...`
4. Look for log: `AI Response received successfully`

If you see all three, the API is working and something else is wrong.
If you don't see the first log, the sendMessage function isn't being called.
If you see the first but not the second, groqClient is null.
If you see the second but not the third, the API call is failing.

## Next Actions

Based on what logs you see, we can:
- Fix the initialization if constructor isn't running
- Fix the Groq client creation if it's failing
- Fix the API call if network is the issue
- Fix error handling if responses aren't being processed
