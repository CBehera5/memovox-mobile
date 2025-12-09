#!/usr/bin/env node

/**
 * Comprehensive debugging script to identify why memos aren't being saved
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pddilavtexsnbifdtmrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZGlsYXZ0ZXhzbmJpZmR0bXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDUzODcsImV4cCI6MjA3OTk4MTM4N30.cdj_iuCAm9ErebujAQIn-_fNOnv4OekP6MXrg8h7Apg';

async function debug() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 COMPREHENSIVE SUPABASE DEBUGGING');
  console.log('='.repeat(60) + '\n');

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Check 1: Auth status
    console.log('📍 1. Checking Authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('   ❌ Auth error:', authError.message);
    } else if (user) {
      console.log('   ✅ Authenticated user:', user.id);
      console.log('      Email:', user.email);
    } else {
      console.log('   ⚠️  No authenticated user (this is OK for testing with anon key)');
    }

    // Check 2: Table structure
    console.log('\n📍 2. Checking voice_memos table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('voice_memos')
      .select('*')
      .limit(0);

    if (columnsError) {
      console.log('   ❌ Error accessing table:', columnsError.message);
    } else {
      console.log('   ✅ Table is accessible');
    }

    // Check 3: Current memo count
    console.log('\n📍 3. Checking current memo count...');
    const { count, error: countError } = await supabase
      .from('voice_memos')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('   ❌ Count error:', countError.message);
    } else {
      console.log('   ✅ Total memos in database:', count || 0);
    }

    // Check 4: Display all memos
    if (count && count > 0) {
      console.log('\n📍 4. Existing memos in database:');
      const { data: memos, error: memosError } = await supabase
        .from('voice_memos')
        .select('*')
        .order('created_at', { ascending: false });

      if (memosError) {
        console.log('   ❌ Error fetching memos:', memosError.message);
      } else {
        memos?.forEach((memo, idx) => {
          console.log(`\n   Memo ${idx + 1}:`);
          console.log('   - ID:', memo.id);
          console.log('   - User ID:', memo.user_id);
          console.log('   - Title:', memo.title);
          console.log('   - Created:', memo.created_at);
          console.log('   - Transcription:', memo.transcription?.substring(0, 50) + '...');
        });
      }
    }

    // Check 5: RLS policies
    console.log('\n📍 5. Checking RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('voice_memos')
      .select('*')
      .limit(1);

    // Try inserting test data
    console.log('\n📍 6. Testing INSERT permission...');
    const testId = 'debug-test-' + Date.now();
    const { error: insertError, data: insertData } = await supabase
      .from('voice_memos')
      .insert([
        {
          id: testId,
          user_id: 'debug-user-' + Date.now(),
          audio_url: 'https://example.com/test.wav',
          transcription: 'Test transcription',
          category: 'Personal',
          type: 'note',
          title: 'Debug Test',
          duration: 5,
        },
      ])
      .select();

    if (insertError) {
      console.log('   ❌ INSERT failed:', insertError.message);
      console.log('   Code:', insertError.code);
      if (insertError.code === 'PGRST204') {
        console.log('   → RLS policy is blocking inserts');
      }
    } else {
      console.log('   ✅ INSERT successful');
      // Clean up
      await supabase.from('voice_memos').delete().eq('id', testId);
    }

    // Check 6: Storage bucket
    console.log('\n📍 7. Checking storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.log('   ❌ Error listing buckets:', bucketsError.message);
    } else {
      const voiceBucket = buckets?.find(b => b.name === 'voice-memos');
      if (voiceBucket) {
        console.log('   ✅ voice-memos bucket exists');
        // List files in bucket
        const { data: files, error: filesError } = await supabase.storage
          .from('voice-memos')
          .list();
        if (filesError) {
          console.log('      ⚠️  Cannot list files:', filesError.message);
        } else {
          console.log('      Files in bucket:', files?.length || 0);
        }
      } else {
        console.log('   ❌ voice-memos bucket does NOT exist');
        console.log('      The app will fail when trying to upload audio');
      }
    }

    // Check 7: Users in auth
    console.log('\n📍 8. Checking registered users...');
    console.log('   ℹ️  (Run this in Supabase dashboard to see all users)');
    console.log('   Go to: Authentication → Users');

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY OF ISSUES FOUND:');
    console.log('='.repeat(60));

    const issues = [];

    if (!user) {
      issues.push('⚠️  No authenticated user - check if you\'re logged in');
    }

    if (count === 0) {
      issues.push('❌ No memos saved yet - app is not calling saveMemo()');
    }

    if (insertError?.code === 'PGRST204') {
      issues.push('❌ RLS policies are blocking inserts - need to fix policies');
    }

    if (!buckets?.find(b => b.name === 'voice-memos')) {
      issues.push('❌ Storage bucket missing - need to create voice-memos bucket');
    }

    if (issues.length === 0) {
      console.log('✅ No major issues found! Try:');
      console.log('   1. Reload the app');
      console.log('   2. Record a new memo');
      console.log('   3. Run this script again to see if memo appears');
    } else {
      issues.forEach(issue => console.log(issue));
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

debug();
