# 🚀 Complete Supabase Configuration Guide (Step-by-Step)

## Overview
This guide will set up everything you need:
1. ✅ Database table for voice memos
2. ✅ Storage bucket for audio files
3. ✅ Authentication setup
4. ✅ Row-Level Security (RLS) policies

---

## STEP 1: Create the Database Table

**Go to:** https://app.supabase.com/project/pddilavtexsnbifdtmrc/sql/new

**Paste this SQL and click "Run":**

```sql
CREATE TABLE IF NOT EXISTS voice_memos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  transcription TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  duration INTEGER,
  ai_analysis JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Expected Result:** You'll see a green checkmark and message "Success. No rows returned"

---

## STEP 2: Create Database Indexes

**In the same SQL Editor, paste this and click "Run":**

```sql
CREATE INDEX IF NOT EXISTS voice_memos_user_id_idx ON voice_memos(user_id);
CREATE INDEX IF NOT EXISTS voice_memos_created_at_idx ON voice_memos(created_at DESC);
```

**Expected Result:** Green checkmark

---

## STEP 3: Enable Row-Level Security (RLS)

**In the same SQL Editor, paste this and click "Run":**

```sql
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;
```

**Expected Result:** Green checkmark

---

## STEP 4: Create RLS Policies (IMPORTANT!)

**Run each of these commands one at a time in the SQL Editor:**

### Policy 1 - Allow Insert
```sql
CREATE POLICY "voice_memos_insert_policy"
  ON voice_memos
  FOR INSERT
  WITH CHECK (true);
```

### Policy 2 - Allow Select
```sql
CREATE POLICY "voice_memos_select_policy"
  ON voice_memos
  FOR SELECT
  USING (true);
```

### Policy 3 - Allow Update
```sql
CREATE POLICY "voice_memos_update_policy"
  ON voice_memos
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
```

### Policy 4 - Allow Delete
```sql
CREATE POLICY "voice_memos_delete_policy"
  ON voice_memos
  FOR DELETE
  USING (true);
```

**Expected Result:** Green checkmark for each policy

---

## STEP 5: Create Storage Bucket

**Go to:** https://app.supabase.com/project/pddilavtexsnbifdtmrc/storage/buckets

**Steps:**
1. Click **"New bucket"** button (top right)
2. Enter bucket name: **`voice-memos`** (lowercase, with hyphen)
3. Toggle **"Public bucket"** to ON
4. Click **"Create bucket"**

**Expected Result:** You see the `voice-memos` bucket in the list

---

## STEP 6: Verify Everything

**In SQL Editor, run this to check the table:**

```sql
SELECT * FROM voice_memos;
```

**Expected Result:** Empty table (no rows yet, which is correct)

**To check RLS policies:**

```sql
SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'voice_memos';
```

**Expected Result:** You should see 4 policies listed

---

## STEP 7: Test the Setup

Now you're ready to test in your app!

1. **Restart your app** (close and reopen)
2. **Sign up** or **Log in** (you must be authenticated)
3. **Record a memo** in the Record tab
4. **Go to Notes tab** - your memo should appear

---

## STEP 8: Verify Memo Was Saved

**In Supabase SQL Editor, run:**

```sql
SELECT id, user_id, title, transcription, created_at FROM voice_memos ORDER BY created_at DESC LIMIT 10;
```

**Expected Result:** You should see your recorded memo(s)

---

## Troubleshooting

### ❌ "Error creating table"
- **Solution:** Table might already exist. That's OK! Proceed to STEP 2.

### ❌ "Policy already exists"
- **Solution:** Drop it first:
```sql
DROP POLICY IF EXISTS "voice_memos_insert_policy" ON voice_memos;
```
Then create it again.

### ❌ "Bucket already exists"
- **Solution:** That's OK! Your bucket is already set up.

### ❌ Still no memos showing in the app
1. Check browser console (F12) for errors
2. Make sure you're logged in
3. Run `SELECT * FROM voice_memos;` to see if memo is in database
4. If not in database, check console error when saving

---

## Key Points

⚠️ **Important:**
- The RLS policies with `WITH CHECK (true)` allow **all authenticated users** to access all memos
- This is OK for testing/development
- In production, use: `user_id = auth.uid()::text` to restrict to own memos

✅ **Your App Configuration:**
- `.env.local` already has correct Supabase credentials
- `src/config/supabase.ts` is already configured
- `VoiceMemoService.ts` is ready to use

---

## Next Steps After Configuration

1. Reload your app
2. Try recording a memo
3. Check Notes tab
4. Run `SELECT * FROM voice_memos;` to verify

Let me know if you get any errors at any step!

### Create voice_memos table

```sql
CREATE TABLE voice_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  transcription TEXT,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('event', 'reminder', 'note')),
  title TEXT,
  duration INTEGER,
  ai_analysis JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX voice_memos_user_id_idx ON voice_memos(user_id);
CREATE INDEX voice_memos_created_at_idx ON voice_memos(created_at DESC);
```

### Create user_personas table (optional)

```sql
CREATE TABLE user_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  interests TEXT[],
  communication_style TEXT,
  active_hours_start INTEGER,
  active_hours_end INTEGER,
  category_preferences JSONB,
  top_keywords JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX user_personas_user_id_idx ON user_personas(user_id);
```

## Step 5: Configure Storage

1. Go to Storage → Buckets
2. Click "New Bucket"
3. Name it: `voice-memos`
4. Make it **Private** (not public)
5. Click "Create Bucket"

The app will automatically set up the bucket if it doesn't exist, but it's good to configure it manually.

## Step 6: Set Up Row Level Security (RLS)

### For voice_memos table

```sql
-- Enable RLS
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;

-- Create policy for SELECT
CREATE POLICY "Users can view their own memos"
  ON voice_memos FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for INSERT
CREATE POLICY "Users can create their own memos"
  ON voice_memos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for UPDATE
CREATE POLICY "Users can update their own memos"
  ON voice_memos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for DELETE
CREATE POLICY "Users can delete their own memos"
  ON voice_memos FOR DELETE
  USING (auth.uid() = user_id);
```

### For storage bucket

```sql
-- Enable RLS on storage
CREATE POLICY "Users can upload their own voice memos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'voice-memos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own voice memos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'voice-memos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own voice memos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'voice-memos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## Step 7: Enable Auth Providers (Optional)

In your Supabase dashboard:

1. Go to Authentication → Providers
2. Enable desired providers:
   - Email (enabled by default)
   - Google
   - GitHub
   - Apple
   - Discord
   - etc.

## Testing the Integration

After setup, run your app:

```bash
npm start
# or
expo start
```

Then test:
1. Sign up with a new account
2. Record a voice memo
3. Check if the memo appears in the database (Supabase dashboard)
4. Check if the audio file appears in the storage bucket

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"

Make sure you installed the package:
```bash
npm install @supabase/supabase-js
```

### "Supabase URL and/or Anon Key are not set"

Make sure your `.env.local` file has the correct values and your app has been rebuilt after adding it.

### "User is not authenticated"

Make sure you're signed in before trying to save memos. The app should handle this automatically.

### "Audio upload failed"

- Check that the `voice-memos` bucket exists in your Storage
- Verify RLS policies are set up correctly
- Check browser/app console for detailed error messages

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase Database Docs](https://supabase.com/docs/guides/database)
