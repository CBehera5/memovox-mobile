# 📱 Complete Emulator Testing Guide

## 🎯 Three Ways to Test on Emulator

---

## Method 1: Development Mode (BEST for Testing) ✅

### **What You Just Started:**

The command `npx expo start --android` is running now!

### **What Will Happen:**

1. ⏳ **Metro bundler starts** (JavaScript bundler)
2. ⏳ **Emulator launches** (if not already running)
3. ⏳ **App installs automatically**
4. ✅ **App opens on emulator**

### **Expected Output in Terminal:**

```
› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code above with Expo Go (Android) or enter the URL manually

› Press a │ open Android
› Press w │ open web

› Press j │ open debugger
› Press r │ reload app
› Press m │ toggle menu
```

### **Advantages:**
- ✅ **Hot reload** - See changes instantly
- ✅ **Better debugging** - Console logs visible
- ✅ **Real-time updates** - Edit code and see changes
- ✅ **No rebuild needed** - Fastest iteration

### **How to Use:**

1. **Wait for emulator to open** (~30-60 seconds)
2. **App will launch automatically**
3. **Test all features**
4. **If you make code changes:**
   - Press `r` in terminal to reload
   - Or shake device and press "Reload"

---

## Method 2: Install APK on Emulator

### **If You Already Have APK:**

```bash
# Make sure emulator is running first
# Check with:
adb devices

# Install APK
adb install /Users/chinmaybehera/Downloads/memovox.apk
```

### **If APK Installation Fails:**

```bash
# Uninstall old version first
adb uninstall com.memovox.app

# Then install new one
adb install /Users/chinmaybehera/Downloads/memovox.apk
```

### **Advantages:**
- ✅ Tests production build
- ✅ Tests exactly what users get
- ✅ Faster startup (no Metro bundler)

### **Disadvantages:**
- ❌ Need to rebuild for every change
- ❌ No hot reload
- ❌ Harder to debug

---

## Method 3: Build and Run Production APK

### **For Final Testing Before Release:**

```bash
# Build production APK
eas build -p android --profile preview --local

# Install on emulator
adb install build-*.apk
```

---

## 🧪 Emulator Testing Checklist

### **Before Testing:**

- [ ] ✅ Run Supabase SQL commands (voice_memos table)
- [ ] ✅ Create storage bucket (voice-memos)
- [ ] ✅ Internet connection active
- [ ] ✅ Emulator has enough storage (2GB+)

---

### **Test 1: Authentication**

1. **Sign Up:**
   - [ ] Open app
   - [ ] Enter email and password
   - [ ] Tap "Sign Up"
   - [ ] Should succeed ✅

2. **Login:**
   - [ ] Close app (swipe away)
   - [ ] Open app again
   - [ ] Should auto-login ✅
   - [ ] Or enter credentials manually

**Expected Result:** ✅ Authentication works

---

### **Test 2: Voice Recording**

**Emulator Microphone:**
- Emulators have a virtual microphone
- It may capture your computer's microphone
- Or use pre-recorded samples

**Steps:**
1. [ ] Tap microphone/record button
2. [ ] Grant microphone permission when prompted
3. [ ] Speak clearly: "This is a test recording"
4. [ ] Stop recording
5. [ ] Wait for "Processing..." message

**Expected Results:**
- ✅ Recording captured
- ✅ "Processing..." or "Transcribing..." message shows
- ✅ Transcription appears (may take 10-30 seconds)
- ✅ Memo saved

**If Fails:**
- Check internet connection
- Check Groq API key in AIService.ts
- Check voice_memos table exists

---

### **Test 3: View Saved Memos**

1. [ ] Navigate to Notes/Memos tab
2. [ ] Look for your recording

**Expected Results:**
- ✅ See memo with transcription
- ✅ See category (Personal, Work, etc.)
- ✅ See timestamp
- ✅ Can tap to view details

**If Fails:**
- Check Supabase table:
  ```sql
  SELECT * FROM voice_memos ORDER BY created_at DESC;
  ```
- Verify storage bucket exists

---

### **Test 4: Audio Playback**

1. [ ] Tap on a saved memo
2. [ ] Tap play button

**Expected Results:**
- ✅ Audio plays
- ✅ Progress bar shows
- ✅ Can pause/resume

**If Fails:**
- Check storage bucket is public
- Check audio_url in database is valid

---

### **Test 5: Home Page Features**

1. **Carousel:**
   - [ ] Swipe left/right
   - [ ] See "Progress" and "Today's Tasks"
   - [ ] Task count badge updates

2. **Animated Buttons:**
   - [ ] Icons bounce on press
   - [ ] "Start Recording" works
   - [ ] "Import Conversations" shows dialog

3. **Task List:**
   - [ ] Tasks sorted by date then priority
   - [ ] Priority badges show (High/Medium/Low)
   - [ ] Complete button works
   - [ ] Bulk share works

**Expected Results:** ✅ All UI features work smoothly

---

### **Test 6: Chat Feature**

1. [ ] Navigate to Chat tab
2. [ ] Type a message: "Hello, can you help me?"
3. [ ] Send message

**Expected Results:**
- ✅ Message appears in chat
- ✅ AI responds within 5-10 seconds
- ✅ Response is relevant

**If Fails:**
- Check internet connection
- Check Groq API key
- Check console for errors

---

### **Test 7: Navigation**

1. [ ] Test all bottom tabs
2. [ ] Navigate between screens
3. [ ] Go back and forth

**Expected Results:**
- ✅ No crashes
- ✅ All tabs load
- ✅ Smooth transitions

---

### **Test 8: Permissions**

1. [ ] Settings → Apps → Memovox → Permissions

**Should See:**
- ✅ Microphone: Allowed
- ✅ Storage: Allowed (if needed)

---

### **Test 9: Performance**

1. [ ] App starts quickly (<5 seconds)
2. [ ] Animations are smooth
3. [ ] No lag when typing
4. [ ] No freezing

**Expected Results:** ✅ App performs well

---

### **Test 10: Offline Mode**

1. [ ] Turn off WiFi on emulator
2. [ ] Try recording

**Expected Results:**
- ⚠️ Recording works
- ❌ Transcription fails (needs internet)
- ✅ App doesn't crash
- ✅ Graceful error message

---

## 🐛 Troubleshooting Emulator Issues

### **Emulator Won't Start**

```bash
# Kill existing emulator processes
pkill -9 qemu-system

# Start fresh
emulator -avd Medium_Phone_API_33
```

### **App Not Installing**

```bash
# Check if emulator is connected
adb devices

# Should show:
# emulator-5554   device

# If not listed, restart emulator
```

### **App Crashes Immediately**

**Check:**
1. Supabase credentials in app.json
2. Internet connection in emulator
3. Voice_memos table exists

**View Logs:**
```bash
adb logcat | grep -i "memovox\|error\|crash"
```

### **"Network Error" in App**

**Fix:**
1. Emulator Settings → Network → WiFi ON
2. Or restart emulator

### **Microphone Not Working**

**In Android Studio:**
1. Emulator toolbar → ... (More)
2. Microphone → Enable
3. Select "Virtual microphone uses host audio input"

### **App Too Slow**

**Optimize Emulator:**
1. Close other apps
2. Allocate more RAM (Android Studio → AVD Manager → Edit AVD)
3. Enable hardware acceleration
4. Use x86_64 image (faster than ARM)

---

## 🎮 Emulator Controls

### **Keyboard Shortcuts:**

| Action | Shortcut |
|--------|----------|
| Home | Cmd+H (Mac) / Ctrl+H (Windows) |
| Back | Cmd+← (Mac) / Ctrl+← (Windows) |
| Recent apps | Cmd+S (Mac) / Ctrl+S (Windows) |
| Rotate | Cmd+Left/Right |
| Volume Up | Cmd+↑ |
| Volume Down | Cmd+↓ |

### **Emulator Toolbar:**

- **Camera** - Test camera features
- **Location** - Set GPS coordinates
- **Phone** - Make test calls
- **SMS** - Send test SMS
- **Fingerprint** - Test biometrics
- **More** - Settings, microphone, etc.

---

## 📊 Viewing Logs in Real-Time

### **Method 1: ADB Logcat**

```bash
# All logs
adb logcat

# Filter for your app
adb logcat | grep -i memovox

# Filter for errors only
adb logcat *:E

# Save logs to file
adb logcat > emulator-logs.txt
```

### **Method 2: React Native Debugger**

1. In terminal, press `j` to open debugger
2. Open Chrome DevTools
3. Go to Console tab
4. See all console.log() outputs

### **Method 3: Expo Dev Tools**

1. Press `Shift + m` in terminal
2. Opens browser with Expo DevTools
3. View logs, performance, etc.

---

## 🔄 Quick Commands Reference

### **Restart Development Server:**
```bash
# Press Ctrl+C to stop
# Then run again:
npx expo start --android
```

### **Clear Cache and Restart:**
```bash
npx expo start --clear --android
```

### **Reload App Without Restart:**
- Press `r` in terminal
- Or shake emulator → "Reload"

### **Open Developer Menu:**
- Shake emulator
- Or press `Cmd+M` (Mac) / `Ctrl+M` (Windows)

---

## ✅ Success Criteria

After testing, you should have:

- [ ] ✅ App installs successfully
- [ ] ✅ Authentication works
- [ ] ✅ Voice recording works
- [ ] ✅ Transcription appears
- [ ] ✅ Memos save to database
- [ ] ✅ Memos display in list
- [ ] ✅ Audio playback works
- [ ] ✅ Chat responds
- [ ] ✅ All navigation works
- [ ] ✅ No crashes
- [ ] ✅ Performance is good

---

## 🎯 Current Status

**Right Now:**
- ✅ Development server is starting
- ⏳ Waiting for emulator to launch
- ⏳ Waiting for app to install

**Next:**
- Watch the terminal for progress
- Emulator will open automatically
- App will launch when ready

---

## 📞 Need Help?

**If something isn't working:**

1. **Check terminal output** for errors
2. **Run:** `adb logcat | grep -i error`
3. **Verify Supabase setup** (tables + bucket)
4. **Check internet connection** in emulator

**Common Fixes:**
- Clear cache: `npx expo start --clear`
- Restart emulator
- Rebuild: `npx expo start --android`

---

## 🚀 You're Testing Now!

The development server is running. Just wait for:
1. Metro bundler to finish
2. Emulator to open
3. App to install automatically

**Then test all the features above!** ✨

**Time to full app launch: ~2-3 minutes**
