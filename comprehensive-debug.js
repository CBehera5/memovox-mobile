#!/usr/bin/env node

/**
 * Comprehensive Debugging Script for Memo Saving Issue
 * Tests every step of the memo saving pipeline
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pddilavtexsnbifdtmrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZGlsYXZ0ZXhzbmJpZmR0bXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDUzODcsImV4cCI6MjA3OTk4MTM4N30.cdj_iuCAm9ErebujAQIn-_fNOnv4OekP6MXrg8h7Apg';

async function debug() {
  console.log('\n' + '='.repeat(70));
  console.log('🔴 MEMO SAVING ISSUE - COMPREHENSIVE DEBUG');
  console.log('='.repeat(70) + '\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Check 1: Table structure
  console.log('CHECK 1: Table Structure');
  console.log('-'.repeat(70));
  try {
    const { data, error } = await supabase
      .from('voice_memos')
      .select('*')
      .limit(0);

    if (error) {
      console.log('❌ Cannot access table:', error.message);
    } else {
      console.log('✅ Table is accessible');
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
  }

  // Check 2: Row count
  console.log('\nCHECK 2: Current Data');
  console.log('-'.repeat(70));
  try {
    const { count, error } = await supabase
      .from('voice_memos')
      .select('*', { count: 'exact', head: true });

    console.log('📊 Memos in database:', count || 0);
    if (count === 0) {
      console.log('   ❌ NO MEMOS - This is the problem');
      console.log('   The app is not saving memos at all');
    } else {
      console.log('   ✅ Memos exist - App is saving sometimes');
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
  }

  // Check 3: RLS policies
  console.log('\nCHECK 3: RLS Policies');
  console.log('-'.repeat(70));
  try {
    const { data: policies, error: policiesError } = await supabase
      .from('voice_memos')
      .select('*')
      .limit(1);

    // Try to insert test data
    const testId = 'debug-test-' + Date.now();
    const { error: insertError } = await supabase
      .from('voice_memos')
      .insert([
        {
          id: testId,
          user_id: 'test-user-debug',
          audio_url: 'https://example.com/test.wav',
          transcription: 'Test memo',
          category: 'Personal',
          type: 'note',
          title: 'Debug Test',
          duration: 5,
        },
      ]);

    if (insertError) {
      if (insertError.code === 'PGRST204') {
        console.log('❌ RLS POLICY BLOCKING INSERTS!');
        console.log('   Error:', insertError.message);
        console.log('   This means the RLS policies are misconfigured');
        console.log('   Solution: Run commands from CRITICAL_FIX.md');
      } else {
        console.log('❌ INSERT ERROR:', insertError.message);
        console.log('   Code:', insertError.code);
      }
    } else {
      console.log('✅ INSERT works - RLS policies are OK');
      // Clean up
      await supabase.from('voice_memos').delete().eq('id', testId);
    }
  } catch (e) {
    console.log('❌ Error testing insert:', e.message);
  }

  // Check 4: Storage bucket
  console.log('\nCHECK 4: Storage Bucket');
  console.log('-'.repeat(70));
  try {
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.log('❌ Cannot list buckets:', bucketsError.message);
    } else {
      const voiceBucket = buckets?.find(b => b.name === 'voice-memos');
      if (voiceBucket) {
        console.log('✅ voice-memos bucket EXISTS');
        
        // Try to upload test file
        const testFile = new Blob(['test'], { type: 'audio/wav' });
        const { error: uploadError } = await supabase.storage
          .from('voice-memos')
          .upload('test/debug-test.wav', testFile, { upsert: true });

        if (uploadError) {
          console.log('❌ Cannot upload to bucket:', uploadError.message);
        } else {
          console.log('✅ Can upload to bucket');
          // Clean up
          await supabase.storage
            .from('voice-memos')
            .remove(['test/debug-test.wav']);
        }
      } else {
        console.log('❌ voice-memos bucket DOES NOT EXIST');
        console.log('   Solution: Create bucket in Supabase Storage UI');
      }
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
  }

  // Check 5: Authentication
  console.log('\nCHECK 5: Authentication');
  console.log('-'.repeat(70));
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('❌ Auth error:', error.message);
    } else if (user) {
      console.log('✅ Authenticated user:', user.email || user.id);
    } else {
      console.log('⚠️  No authenticated user (expected - using anon key)');
      console.log('   In app, user must be logged in');
    }
  } catch (e) {
    console.log('❌ Error:', e.message);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  console.log(`
The issue with memos not saving is MOST LIKELY one of:

1. ❌ App not calling VoiceMemoService.saveMemo()
   → Check browser console logs for "Saving memo to Supabase"

2. ❌ AuthService.getCurrentUser() returning null
   → User must be logged in
   → Check if email shows in app

3. ❌ AI analysis failing
   → Memo needs AI data to save
   → Check console for "Analysis completed"

4. ❌ Audio upload failing
   → Need audio URL before saving to database
   → Check console for "Audio uploaded successfully"

5. ❌ RLS policy issue
   → Database rejecting inserts
   → Check console for "violates row-level security"

WHAT TO DO:
1. Open browser console (F12)
2. Record a memo
3. Watch EVERY log message
4. Look for ANY error messages
5. Share the console output with me

The console will tell us exactly where it fails!
  `);
  console.log('='.repeat(70) + '\n');
}

debug().catch(console.error);
