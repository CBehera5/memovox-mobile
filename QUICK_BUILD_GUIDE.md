# 🚀 Quick Start: Build APK in 5 Minutes

## The Fastest Way to Get Your APK

### Step 1: Install EAS CLI (one-time)
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```
*Enter your Expo credentials (create account at expo.dev if needed)*

### Step 3: Configure Project
```bash
eas build:configure
```
*Press Enter to accept defaults*

### Step 4: Build APK
```bash
eas build -p android --profile preview
```
*This builds a testable APK*

### Step 5: Wait & Download
- ⏱️ Wait 15-20 minutes
- 📥 Download from link provided in terminal
- 📱 Transfer to Android device and install

---

## One-Line Setup (Copy & Paste)

```bash
npm install -g eas-cli && eas login && eas build:configure && eas build -p android --profile preview
```

---

## Alternative: Use the Setup Script

```bash
./build-setup.sh
```

Then follow the prompts.

---

## What You'll Get

✅ **Installable APK file** (~50-100 MB)  
✅ **Works on any Android device** (Android 5.0+)  
✅ **Includes all your features**:
- Voice recording
- AI chat
- Task management
- Carousel UI
- Animated buttons
- Bulk sharing

---

## Testing Your APK

### On Android Device:

1. **Enable Unknown Sources**:
   - Settings → Security → Unknown Sources → Enable

2. **Install APK**:
   - Download APK to device
   - Tap APK file
   - Tap "Install"
   - Open app

3. **Test Core Features**:
   - [ ] Sign up/Login
   - [ ] Record voice memo
   - [ ] Create task
   - [ ] Swipe carousel
   - [ ] Complete task
   - [ ] Share tasks

---

## Troubleshooting

### "eas: command not found"
```bash
npm install -g eas-cli
# or
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm install -g eas-cli
```

### "Not logged in"
```bash
eas login
```

### "No projectId in app.json"
Already configured! Your projectId: `ce1f9f7a-de8f-42e5-85b5-347a9f0ae981`

### Build fails
```bash
# Clear cache and retry
eas build -p android --profile preview --clear-cache
```

---

## Build Profiles Explained

| Profile | Use Case | Build Time | Size | Features |
|---------|----------|------------|------|----------|
| **preview** | Testing MVP | 15-20 min | ~60 MB | Full features, faster build |
| **development** | Dev testing | 15-20 min | ~80 MB | Dev tools included |
| **production** | Play Store | 20-25 min | ~40 MB | Optimized, minified |

**Recommendation**: Use `preview` for your MVP testing!

---

## Check Build Status

```bash
# List all builds
eas build:list

# Check specific build
eas build:view [build-id]
```

Or visit: https://expo.dev/accounts/chinuchinu8/projects/memovox/builds

---

## Cost

- **Free tier**: 30 builds/month
- **Your current usage**: Check at expo.dev
- **No credit card needed** for testing

---

## Expected Timeline

```
00:00 - Run eas build command
00:01 - Uploading project (~1 min)
00:05 - Installing dependencies (~4 min)
00:15 - Building APK (~10 min)
00:20 - APK ready for download
```

---

## What Happens During Build?

1. ✅ Code uploaded to Expo servers
2. ✅ Dependencies installed
3. ✅ Android build tools configured
4. ✅ Native code compiled
5. ✅ Assets bundled
6. ✅ APK signed
7. ✅ APK uploaded for download

---

## After Build Success

You'll see:
```
✔ Build finished

📱 Install and run your app on Android devices with the Expo Go app:
   https://expo.dev/artifacts/eas/[build-id].apk

Or download directly:
   https://expo.dev/accounts/chinuchinu8/projects/memovox/builds/[build-id]
```

**Copy that URL** and share it with testers or download to your device!

---

## Pro Tips

1. **Build once, test on multiple devices**: Share the APK URL with team
2. **Check logs if build fails**: `eas build:view [build-id]`
3. **Use preview profile for speed**: Production is slower
4. **Keep Expo dashboard open**: Monitor build progress visually

---

## Ready to Build?

```bash
# Copy and paste this now:
npm install -g eas-cli && eas login
```

Then:
```bash
eas build -p android --profile preview
```

**That's it!** ✅

---

**Support**: Check BUILD_APK_GUIDE.md for detailed troubleshooting
