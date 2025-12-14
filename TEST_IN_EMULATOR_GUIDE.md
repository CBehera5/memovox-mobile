# Testing in Android Emulator - Quick Guide

## Prerequisites

Before you start, make sure you have:

1. **Android Studio** installed with:
   - Android SDK
   - Android Emulator
   - At least one AVD (Android Virtual Device) set up

2. **Node.js and npm** installed

3. **Project dependencies** installed

## Step 1: Install Dependencies

If you haven't already, install the project dependencies:

```bash
cd /Users/chinmaybehera/memovox-rel1/memovox-mobile
npm install
```

## Step 2: Start Android Emulator

### Option A: Start from Android Studio
1. Open Android Studio
2. Click on "Device Manager" (phone icon in the top right)
3. Select an AVD and click the Play button

### Option B: Start from Command Line
```bash
# List available emulators
emulator -list-avds

# Start a specific emulator (replace <emulator-name> with actual name)
emulator -avd <emulator-name>
```

## Step 3: Start the Development Server

In your project directory, run:

```bash
# Start Expo development server
npx expo start
```

This will:
- Start the Metro bundler
- Show a QR code and options menu
- Open a browser window with Expo Dev Tools

## Step 4: Run on Android Emulator

Once the Expo dev server is running, you have two options:

### Option A: Press 'a' in Terminal
In the terminal where Expo is running, simply press the **'a'** key to automatically:
- Detect running Android emulator
- Build and install the app
- Launch the app on the emulator

### Option B: Use Expo Dev Tools
In the browser window that opened:
- Click "Run on Android device/emulator"

## Step 5: Testing Your Fixes

### Test the Recording Feature
1. Navigate to the **Record** tab in the emulator
2. Click the **microphone button** to start recording
3. Speak clearly: "Buy milk and eggs tomorrow"
4. Stop the recording
5. Wait for transcription to complete
6. Verify:
   - ✅ No "400 error" appears
   - ✅ Transcription text is shown
   - ✅ AI analysis creates action items
   - ✅ Recording is saved

### Test the Start Recording Button
1. Go to the **Home** tab
2. Scroll down to find "Start Recording" button
3. Tap it - should navigate to Record screen
4. Try the "Quick Voice Note" example card
5. Verify both navigate correctly

### Test Navigation
1. Navigate between all tabs: Home, Record, Chat, Notes, Profile
2. Verify no crashes or errors
3. Check that all features load properly

## Useful Commands

### Restart the App
```bash
# In Expo terminal, press:
r  # Reload app
shift+r  # Reload app and clear cache
```

### View Logs
The terminal running Expo will show:
- Console logs from your app
- Errors and warnings
- Network requests
- API responses

Look for logs like:
```
🔴 DEBUG: messages
Audio URI type: file://...
Transcribing audio using Groq Whisper API...
```

### Clear Cache
```bash
npx expo start -c
```

## Common Issues and Solutions

### Emulator Not Detected
```bash
# Check if adb can see the emulator
adb devices

# If not listed, restart adb
adb kill-server
adb start-server
```

### App Not Installing
```bash
# Clear Expo cache and rebuild
npx expo start -c

# Or uninstall from emulator first
adb uninstall host.exp.exponent
```

### Metro Bundler Port Conflict
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Start Expo again
npx expo start
```

### Audio Recording Not Working in Emulator
**Note:** Some Android emulators may not support microphone input properly. If recording fails:
1. Check emulator settings → enable "Virtual microphone uses host audio input"
2. Or test on a physical device instead
3. You can still test UI/navigation without recording

## Testing Checklist

Before building APK, verify:

- [ ] App launches without crashes
- [ ] All tabs are accessible
- [ ] "Start Recording" button works
- [ ] Recording feature works (if emulator supports audio)
- [ ] Transcription completes successfully
- [ ] AI analysis generates insights
- [ ] Memos are saved and displayed
- [ ] Navigation between screens works
- [ ] No console errors in critical flows
- [ ] UI looks good on different screen sizes

## Pro Tips

### 1. Enable Hot Reload
- Changes to your code will automatically reload in the emulator
- Saves time during development

### 2. Use Chrome DevTools
- Press `j` in Expo terminal to open Chrome debugger
- Inspect network requests, console logs, React components

### 3. Test on Multiple Screen Sizes
In Android Studio Device Manager, create AVDs with different:
- Screen sizes (phone, tablet)
- Android versions (API 21+)
- RAM configurations

### 4. Simulate Network Conditions
In Android Studio:
- Extended Controls → Network
- Test with different speeds or offline mode

### 5. Record Screen for Bug Reports
```bash
# Record emulator screen
adb shell screenrecord /sdcard/demo.mp4

# Pull the recording
adb pull /sdcard/demo.mp4
```

## Next Steps

Once you've thoroughly tested in the emulator:

1. ✅ All features work correctly
2. ✅ No crashes or errors
3. ✅ UI looks good
4. ✅ Performance is acceptable

Then you're ready to:
- Test on a physical Android device
- Build the APK for production
- Share with beta testers

## Building APK After Testing

When ready to build:

```bash
# For development APK
eas build --platform android --profile preview

# For production APK
eas build --platform android --profile production
```

Refer to `BUILD_APK_GUIDE.md` for detailed build instructions.

---

**Need Help?**
- Check Expo documentation: https://docs.expo.dev
- View logs in the terminal for debugging
- Test features one by one to isolate issues
