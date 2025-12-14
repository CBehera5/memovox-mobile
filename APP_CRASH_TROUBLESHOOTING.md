# 🚨 App Crash Troubleshooting Guide

## Your Situation
- ✅ APK built successfully
- ✅ Installed on emulator
- ✅ Started successfully
- ❌ **App crashed: "App has stopped"**

---

## 🔍 Most Likely Causes

### 1. **Supabase Configuration Missing** (MOST LIKELY)
**Problem**: App tries to connect to Supabase but credentials are missing

**Check**: Look for these in your app:
```typescript
// Should be in app.json or environment
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
```

**Fix**: Add Supabase credentials

### 2. **Missing Native Modules**
**Problem**: App uses native modules that aren't included in build

**Modules that might cause crashes**:
- `expo-av` (audio recording)
- `@react-native-async-storage/async-storage`
- `expo-notifications`

### 3. **Groq API Key Issues**
**Problem**: Hardcoded API key or network call on startup

**Check**: `src/services/AIService.ts` line 17

### 4. **Storage/AsyncStorage Not Initialized**
**Problem**: App tries to read from storage before it's ready

---

## 🔧 Quick Fixes to Try

### Fix 1: Check Supabase Configuration

<function_calls>
<invoke name="read_file">
<parameter name="filePath">/Users/chinmaybehera/memovox-rel1/memovox-mobile/app.json
