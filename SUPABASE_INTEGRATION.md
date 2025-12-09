# Supabase Integration Guide

This guide shows you how to use the new Supabase-integrated services in your Memovox app.

## Overview

The app now uses Supabase for:
- **Authentication**: User sign-up, sign-in, password reset
- **Voice Memo Storage**: Cloud storage for audio files
- **Database**: Storing memo metadata, transcriptions, and analysis
- **Real-time Sync**: Optional real-time updates across devices

## Service Files

### 1. AuthService (`src/services/AuthService.ts`)

Handles all authentication operations using Supabase Auth.

**Methods:**

```typescript
// Sign up
const result = await AuthService.signup({
  email: 'user@example.com',
  password: 'password123',
  name: 'John Doe'
});

// Sign in
const result = await AuthService.login({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
await AuthService.logout();

// Get current user
const user = await AuthService.getCurrentUser();

// Check if authenticated
const isAuth = await AuthService.isAuthenticated();

// Get session
const session = await AuthService.getSession();

// Reset password
await AuthService.resetPassword('user@example.com');

// Update password
await AuthService.updatePassword('newPassword123');

// Listen to auth state changes
AuthService.onAuthStateChange((user) => {
  if (user) {
    console.log('User logged in:', user);
  } else {
    console.log('User logged out');
  }
});
```

### 2. VoiceMemoService (`src/services/VoiceMemoService.ts`)

Handles voice memo storage, retrieval, and database operations.

**Methods:**

```typescript
// Initialize bucket (call once on app startup)
await VoiceMemoService.initializeBucket();

// Upload audio to storage
const audioUrl = await VoiceMemoService.uploadAudio(
  userId,
  memoId,
  audioUri,
  audioData
);

// Save memo to database
const savedMemo = await VoiceMemoService.saveMemo(memo);

// Get all memos for a user
const memos = await VoiceMemoService.getUserMemos(userId);

// Get a single memo
const memo = await VoiceMemoService.getMemo(memoId);

// Update memo
const updated = await VoiceMemoService.updateMemo(memo);

// Delete memo (removes from DB and storage)
const success = await VoiceMemoService.deleteMemo(memoId, userId);

// Search memos
const results = await VoiceMemoService.searchMemos(userId, 'meeting notes');
```

### 3. StorageService (`src/services/StorageService.ts`)

Now primarily handles local storage (auth tokens, user data, AI config, personas).

**Voice memo methods are deprecated** and proxy to VoiceMemoService:

```typescript
// These still work but are deprecated
await StorageService.saveVoiceMemo(memo);
const memos = await StorageService.getVoiceMemos();
const memo = await StorageService.getVoiceMemo(id);
await StorageService.deleteVoiceMemo(id);
await StorageService.updateVoiceMemo(memo);

// Prefer using VoiceMemoService directly instead
```

## Usage Examples

### Complete Recording and Saving Flow

```typescript
import AudioService from '../../src/services/AudioService';
import AIService from '../../src/services/AIService';
import AuthService from '../../src/services/AuthService';
import VoiceMemoService from '../../src/services/VoiceMemoService';
import { generateId } from '../../src/utils';

const handleRecordAndSave = async () => {
  try {
    // 1. Start recording
    await AudioService.startRecording();
    
    // ... recording happens ...
    
    // 2. Stop recording
    const audioUri = await AudioService.stopRecording();
    
    if (!audioUri) {
      throw new Error('Failed to record audio');
    }

    // 3. Transcribe and analyze with AI
    const analysis = await AIService.transcribeAndAnalyze(audioUri);

    // 4. Get current user
    const user = await AuthService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // 5. Upload audio to Supabase Storage
    const audioBlob = await fetch(audioUri).then(r => r.blob());
    const memoId = generateId();
    const audioUrl = await VoiceMemoService.uploadAudio(
      user.id,
      memoId,
      audioUri,
      audioBlob
    );

    if (!audioUrl) {
      throw new Error('Failed to upload audio');
    }

    // 6. Create memo object
    const memo = {
      id: memoId,
      userId: user.id,
      audioUri: audioUrl,
      transcription: analysis.transcription,
      category: analysis.category,
      type: analysis.type,
      title: analysis.title,
      duration: recordingDuration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiAnalysis: analysis.analysis,
      metadata: analysis.metadata,
    };

    // 7. Save memo to database
    await VoiceMemoService.saveMemo(memo);

    console.log('Memo saved successfully!');
  } catch (error) {
    console.error('Error:', error);
    alert(error.message);
  }
};
```

### Loading and Displaying Memos

```typescript
const loadMemos = async () => {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) {
      console.log('Not authenticated');
      return [];
    }

    const memos = await VoiceMemoService.getUserMemos(user.id);
    setMemos(memos);
  } catch (error) {
    console.error('Error loading memos:', error);
  }
};
```

### Searching Memos

```typescript
const handleSearch = async (query) => {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    const results = await VoiceMemoService.searchMemos(user.id, query);
    setSearchResults(results);
  } catch (error) {
    console.error('Error searching:', error);
  }
};
```

### Playing a Memo

```typescript
const playMemo = async (memo) => {
  try {
    // audioUri is the cloud URL from Supabase Storage
    await AudioService.playAudio(memo.audioUri);
  } catch (error) {
    console.error('Error playing memo:', error);
  }
};
```

### Authentication Flow

```typescript
// Sign up
const handleSignUp = async (email, password, name) => {
  try {
    const result = await AuthService.signup({
      email,
      password,
      name
    });
    console.log('Signed up:', result.user);
    // Navigate to home
  } catch (error) {
    console.error('Sign up error:', error);
    alert(error.message);
  }
};

// Sign in
const handleSignIn = async (email, password) => {
  try {
    const result = await AuthService.login({
      email,
      password
    });
    console.log('Logged in:', result.user);
    // Navigate to home
  } catch (error) {
    console.error('Login error:', error);
    alert(error.message);
  }
};

// Sign out
const handleSignOut = async () => {
  try {
    await AuthService.logout();
    console.log('Logged out');
    // Navigate to login
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Listen for auth changes
useEffect(() => {
  const unsubscribe = AuthService.onAuthStateChange((user) => {
    if (user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
    } else {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  });

  return () => unsubscribe();
}, []);
```

## Error Handling

All services include error handling. Here's the recommended pattern:

```typescript
try {
  // ... your operation ...
} catch (error) {
  console.error('Specific error:', error);
  
  if (error.message.includes('not authenticated')) {
    // Handle authentication error
    // Redirect to login
  } else if (error.message.includes('not found')) {
    // Handle not found error
  } else {
    // Handle other errors
    alert('An error occurred: ' + error.message);
  }
}
```

## Environment Setup Checklist

Before deploying, make sure you:

- [ ] Created a Supabase project
- [ ] Set `EXPO_PUBLIC_SUPABASE_URL` in `.env.local`
- [ ] Set `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- [ ] Created the `voice_memos` table in Supabase
- [ ] Created the `voice-memos` storage bucket
- [ ] Set up RLS policies for tables and storage
- [ ] Tested sign-up and sign-in
- [ ] Tested recording and saving a memo
- [ ] Tested loading and playing memos

See `SUPABASE_SETUP.md` for detailed setup instructions.

## Best Practices

1. **Always check authentication before database operations**
   ```typescript
   const user = await AuthService.getCurrentUser();
   if (!user) throw new Error('Not authenticated');
   ```

2. **Use try-catch for all async operations**
   ```typescript
   try {
     // operation
   } catch (error) {
     console.error('Error:', error);
     // handle error
   }
   ```

3. **Handle network errors gracefully**
   ```typescript
   try {
     // database operation
   } catch (error) {
     if (error.message.includes('network')) {
       alert('Network error. Please check your connection.');
     }
   }
   ```

4. **Initialize bucket on app startup**
   ```typescript
   useEffect(() => {
     VoiceMemoService.initializeBucket();
   }, []);
   ```

5. **Show loading states during operations**
   ```typescript
   const [isLoading, setIsLoading] = useState(false);

   const save = async () => {
     setIsLoading(true);
     try {
       // ... operation ...
     } finally {
       setIsLoading(false);
     }
   };
   ```

## Troubleshooting

### Issue: "TypeError: Cannot read property 'supabase' of undefined"

**Cause:** Supabase client not initialized

**Solution:** Make sure `src/config/supabase.ts` exists and environment variables are set

### Issue: "Auth error: Weak password"

**Cause:** Password is less than 6 characters

**Solution:** Require users to use passwords with at least 8 characters

### Issue: "Storage error: Bucket not found"

**Cause:** `voice-memos` bucket doesn't exist

**Solution:** Create the bucket in Supabase dashboard or call `VoiceMemoService.initializeBucket()`

### Issue: "Database error: Row-level security violation"

**Cause:** RLS policies not set up correctly

**Solution:** Check RLS policies in `SUPABASE_SETUP.md` and apply them

## Next Steps

1. Follow the setup guide in `SUPABASE_SETUP.md`
2. Test authentication with sign-up/sign-in
3. Test recording and saving a memo
4. Test loading and playing memos
5. Test searching memos
6. Monitor Supabase dashboard for any issues

Happy recording! 🎙️
