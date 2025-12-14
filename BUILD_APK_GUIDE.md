# 📱 Building APK for MemoVox Mobile - Step by Step Guide

## Prerequisites Checklist

Before building, make sure you have:
- ✅ Expo account (sign up at https://expo.dev)
- ✅ EAS CLI installed
- ✅ All your code committed (recommended)
- ✅ Supabase credentials configured
- ✅ app.json properly configured

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

## Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials.

## Step 3: Configure Your Project

First, check your `app.json` to ensure it has proper configuration:

```json
{
  "expo": {
    "name": "MemoVox",
    "slug": "memovox-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "android": {
      "package": "com.chinmaybehera.memovox",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "permissions": [
        "RECORD_AUDIO",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

## Step 4: Initialize EAS Build

```bash
eas build:configure
```

This will create an `eas.json` file in your project root.

## Step 5: Build APK for Internal Testing

For a **development build** (fastest, for testing):

```bash
eas build --platform android --profile development
```

For a **preview build** (production-like, but allows testing):

```bash
eas build --platform android --profile preview
```

For a **production build** (final release):

```bash
eas build --platform android --profile production
```

### Recommended for MVP Testing: Preview Build

```bash
eas build -p android --profile preview
```

## Step 6: Wait for Build to Complete

- The build will run on Expo's servers
- You'll see a progress URL in your terminal
- Build typically takes 10-20 minutes
- You can close terminal and check status at: https://expo.dev/accounts/[your-username]/projects/memovox-mobile/builds

## Step 7: Download and Install APK

Once build completes:

1. **Download APK**:
   - Click the download link in terminal, OR
   - Go to https://expo.dev and navigate to your project builds
   - Click "Download" next to your build

2. **Transfer to Android Device**:
   - Email the APK to yourself
   - Upload to Google Drive/Dropbox
   - Connect device via USB and transfer directly

3. **Install on Android Device**:
   - Open APK file on Android
   - Allow "Install from Unknown Sources" if prompted
   - Tap "Install"

## Alternative: Build APK Locally (Faster for Testing)

If you want to build locally without waiting for Expo servers:

### Option A: Using EAS Build Locally

```bash
# Install local build tools
npm install -g eas-cli

# Build locally (requires Android SDK)
eas build --platform android --local
```

### Option B: Using Classic Expo Build (Deprecated but faster)

```bash
# Install expo-cli if not already installed
npm install -g expo-cli

# Build APK
expo build:android -t apk
```

## Quick Command Reference

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Configure
eas build:configure

# 4. Build Preview APK (recommended for testing)
eas build -p android --profile preview

# 5. Check build status
eas build:list

# 6. View build details
eas build:view [build-id]
```

## Troubleshooting Common Issues

### Issue 1: "No Android package name specified"
**Fix**: Add to `app.json`:
```json
"android": {
  "package": "com.yourname.memovox"
}
```

### Issue 2: "Icon not found"
**Fix**: Ensure you have these files in `assets/`:
- `icon.png` (1024x1024)
- `adaptive-icon.png` (1024x1024)
- `splash.png` (1284x2778)

### Issue 3: "Supabase URL missing"
**Fix**: Create `.env` file or add to `app.json`:
```json
"extra": {
  "supabaseUrl": "your-url",
  "supabaseAnonKey": "your-key"
}
```

### Issue 4: Build fails with dependency errors
**Fix**: Clean and reinstall:
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

## EAS.json Configuration Example

Create or update `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.9.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## Testing Your APK

Once installed on your Android device:

### ✅ Test Checklist

1. **Authentication**:
   - [ ] Sign up works
   - [ ] Login works
   - [ ] Session persists after app restart

2. **Recording**:
   - [ ] Microphone permission granted
   - [ ] Voice recording works
   - [ ] Audio playback works
   - [ ] Transcription appears

3. **Home Page**:
   - [ ] Carousel swipes correctly
   - [ ] Tasks display with priority badges
   - [ ] Complete button works
   - [ ] Bulk share works
   - [ ] Animated icons bounce

4. **Chat/AI**:
   - [ ] Can send messages
   - [ ] AI responds correctly
   - [ ] Task creation works

5. **Notes**:
   - [ ] All memos display
   - [ ] Can view/edit/delete
   - [ ] Save for later works

## Performance Tips

### Make Build Faster:
1. Use `--profile preview` instead of production for testing
2. Build with `--local` flag if you have Android SDK
3. Cache dependencies in `eas.json`

### Reduce APK Size:
1. Enable Hermes engine in `app.json`:
   ```json
   "android": {
     "jsEngine": "hermes"
   }
   ```

2. Use `app-bundle` for production (not apk)

3. Remove unused dependencies

## Next Steps After Testing

Once MVP testing is successful:

1. **Gather Feedback**: Test all features thoroughly
2. **Fix Bugs**: Address any issues found during testing
3. **Optimize**: Improve performance based on device testing
4. **Prepare for Release**:
   - Build production AAB (not APK)
   - Create Play Store listing
   - Add screenshots and descriptions
   - Submit for review

## Production Release (Future)

When ready for Play Store:

```bash
# Build production app bundle
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

## Useful Links

- EAS Build Docs: https://docs.expo.dev/build/introduction/
- Expo Dashboard: https://expo.dev
- EAS Build Status: https://expo.dev/accounts/[username]/builds
- Android Testing Guide: https://docs.expo.dev/build/internal-distribution/

## Cost Note

- EAS Build is **FREE** for open source projects
- Free tier includes limited builds per month
- Consider Expo subscription for unlimited builds if needed

---

## Quick Start Command (Copy & Paste)

```bash
# All in one - from scratch to APK
npm install -g eas-cli && \
eas login && \
eas build:configure && \
eas build -p android --profile preview
```

---

**Status**: Ready to build! 🚀  
**Estimated Time**: 15-20 minutes for first build  
**Result**: Installable APK file for Android testing
