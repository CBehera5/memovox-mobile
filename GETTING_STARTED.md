# Getting Started with Supabase - Checklist

Use this checklist to set up Supabase for your Memovox app.

## Pre-Setup (5 minutes)

- [ ] Read `SUPABASE_QUICKSTART.md` for overview
- [ ] Have a text editor ready for `.env.local`
- [ ] Have Supabase dashboard open in browser

## Supabase Project Setup (10 minutes)

### Create Project
- [ ] Go to https://supabase.com
- [ ] Sign up or log in
- [ ] Click "New Project"
- [ ] Enter project name: `memovox` (or your choice)
- [ ] Set a strong database password
- [ ] Select your region
- [ ] Click "Create new project"
- [ ] Wait for project creation (1-2 minutes)

### Get API Credentials
- [ ] Project created and dashboard loaded
- [ ] Go to Settings → API
- [ ] Copy `Project URL`
- [ ] Copy `anon public` key
- [ ] Save these values securely

## Local Setup (5 minutes)

### Create Environment File
- [ ] In project root, create `.env.local`
- [ ] Add:
  ```
  EXPO_PUBLIC_SUPABASE_URL=<your-project-url>
  EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
  EXPO_PUBLIC_APP_URL=http://localhost:3000
  ```
- [ ] Save file
- [ ] Do NOT commit to git (it's in `.gitignore`)

## Database Setup (5 minutes)

### Create Tables
- [ ] Go to Supabase dashboard → SQL Editor
- [ ] Click "New Query"
- [ ] Copy SQL from `SUPABASE_SETUP.md` (Create voice_memos table)
- [ ] Run the query
- [ ] Confirm success (no errors)

### Optional: Create User Personas Table
- [ ] (Skip if not needed now)
- [ ] Can be added later

## Storage Setup (5 minutes)

### Create Storage Bucket
- [ ] Go to Storage → Buckets
- [ ] Click "New Bucket"
- [ ] Name: `voice-memos`
- [ ] Select "Private"
- [ ] Click "Create"
- [ ] Confirm bucket created

## Security Setup (10 minutes)

### Set Up Row-Level Security (RLS)

**For voice_memos table:**
- [ ] Go to SQL Editor
- [ ] Run RLS setup SQL from `SUPABASE_SETUP.md`
- [ ] Confirm all policies created

**For storage bucket:**
- [ ] Go to Storage → Policies
- [ ] Apply policies from `SUPABASE_SETUP.md`
- [ ] Confirm all policies created

## Testing Setup (10 minutes)

### Install Dependencies
- [ ] Run: `npm install`
- [ ] Check for any errors

### Start App
- [ ] Run: `npm start`
- [ ] App should start without errors

### Test Authentication
- [ ] Click "Sign Up"
- [ ] Create account with test email/password
- [ ] Should see confirmation message
- [ ] Check Supabase dashboard → Auth → Users
- [ ] Your user should appear in list
- [ ] Click "Sign In" with same credentials
- [ ] Should log in successfully

### Test Voice Memo
- [ ] Record a voice memo (click record button)
- [ ] Speak something
- [ ] Stop recording
- [ ] App should save and show success
- [ ] Go to Supabase dashboard → SQL Editor
- [ ] Run: `SELECT * FROM voice_memos;`
- [ ] Your memo should appear in list
- [ ] Check Storage → voice-memos
- [ ] Your audio file should appear

### Test Loading Memos
- [ ] Refresh app
- [ ] Should see your previous memo in list
- [ ] Click to play
- [ ] Should play the audio

## Troubleshooting

### App Won't Start
- [ ] Check `.env.local` exists
- [ ] Check values are correct
- [ ] Try: `npm install`
- [ ] Try: restart app (`npm start`)

### Sign Up Fails
- [ ] Check password is 8+ characters
- [ ] Check email format is valid
- [ ] Check Supabase auth is enabled (Settings → Auth)
- [ ] Check internet connection

### Can't Save Memo
- [ ] Make sure you're logged in
- [ ] Check `voice-memos` bucket exists
- [ ] Check RLS policies are set up
- [ ] Check browser console for errors

### Memo Won't Play
- [ ] Check audio URL is correct
- [ ] Try playing in different format
- [ ] Check storage bucket permissions
- [ ] Try re-uploading memo

See `SUPABASE_SETUP.md` or `SUPABASE_INTEGRATION.md` for more troubleshooting.

## After Setup

- [ ] Review `SUPABASE_INTEGRATION.md` for usage examples
- [ ] Check `src/services/AuthService.ts` to understand auth
- [ ] Check `src/services/VoiceMemoService.ts` to understand storage
- [ ] Read code examples in integration guide
- [ ] Start integrating into your components

## Production Checklist

Before deploying to production:

- [ ] Update `.env.local` with production values
- [ ] Update `EXPO_PUBLIC_APP_URL` to production URL
- [ ] Enable additional auth providers (Google, GitHub, etc.)
- [ ] Enable 2FA in Supabase auth settings
- [ ] Test all features one more time
- [ ] Set up database backups
- [ ] Monitor Supabase analytics
- [ ] Set up error logging

## Need Help?

- **Setup issues**: See `SUPABASE_SETUP.md`
- **Usage questions**: See `SUPABASE_INTEGRATION.md`
- **Quick reference**: See `SUPABASE_QUICKSTART.md`
- **Architecture**: See `SUPABASE_MIGRATION.md`
- **Official docs**: https://supabase.com/docs

---

**Estimated Total Time:** 30-45 minutes

**Next Steps After Completion:**
1. Review the code in `src/services/`
2. Test all functionality
3. Read integration guide for advanced features
4. Start using it in your app!

Good luck! 🚀
