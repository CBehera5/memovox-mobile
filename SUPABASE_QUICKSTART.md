# Supabase Integration - Quick Start

## 5-Minute Setup

### Step 1: Create Supabase Project (2 min)
1. Go to https://supabase.com
2. Sign up and click "New Project"
3. Fill in project name and set a password
4. Wait for project creation (1-2 minutes)

### Step 2: Get Credentials (1 min)
1. Go to Settings → API
2. Copy `Project URL` and `anon public` (the key)
3. Create `.env.local` in your project root:
```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Create Database Tables (1 min)
1. Go to SQL Editor in Supabase
2. Create new query and paste this:

```sql
CREATE TABLE voice_memos (
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
  created_at TEXT DEFAULT NOW(),
  updated_at TEXT DEFAULT NOW()
);

CREATE INDEX voice_memos_user_id_idx ON voice_memos(user_id);
```

3. Run the query

### Step 4: Create Storage Bucket (1 min)
1. Go to Storage → Buckets
2. Click "New Bucket"
3. Name: `voice-memos`
4. Select Private
5. Create

### Step 5: Test It!
```bash
npm start
```

Try signing up and recording a memo!

## What's Installed

- `@supabase/supabase-js` - Supabase client
- `@react-native-async-storage/async-storage` - Local storage

## Key Files

- `src/config/supabase.ts` - Supabase client setup
- `src/services/AuthService.ts` - Authentication (updated for Supabase)
- `src/services/VoiceMemoService.ts` - Voice memo storage (new)
- `src/services/StorageService.ts` - Local storage (uses AsyncStorage)

## Usage

```typescript
// Sign up
await AuthService.signup({
  email: 'user@example.com',
  password: 'password123',
  name: 'John'
});

// Sign in
await AuthService.login({
  email: 'user@example.com',
  password: 'password123'
});

// Save memo
await VoiceMemoService.saveMemo(memo);

// Get memos
const memos = await VoiceMemoService.getUserMemos(userId);
```

## Need Help?

See:
- `SUPABASE_SETUP.md` - Detailed setup with RLS policies
- `SUPABASE_INTEGRATION.md` - Full integration guide with examples
