# Groq SDK React Native Compatibility Issue

## Problem

✅ **Works on Web** - Chat functionality works in web browser
❌ **Fails on Android Emulator** - Chat fails on native Android

## Root Cause

The `groq-sdk` npm package is designed for Node.js and web browsers, but **may not be fully compatible with React Native's native environment** (Android/iOS).

React Native uses JavaScriptCore (or Hermes) as the JavaScript engine, which has different APIs than Node.js or web browsers.

## Solution: Use Fetch API Directly

Instead of using the Groq SDK, we should make direct HTTP requests using the built-in `fetch` API, which works on all platforms.

### Current Approach (Using SDK):
```typescript
const groqClient = new Groq({ apiKey: '...' });
const response = await groqClient.chat.completions.create({...});
```

### Better Approach (Using Fetch):
```typescript
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [...],
  }),
});
```

## Implementation Plan

1. Replace Groq SDK client with fetch-based implementation
2. Keep same interface so rest of app doesn't change
3. Works on all platforms: web, Android, iOS

## Next Step

Implement fetch-based Groq API client in ChatService.
