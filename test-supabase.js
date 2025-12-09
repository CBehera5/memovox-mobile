#!/usr/bin/env node

/**
 * Test script to verify Supabase connection and table status
 * Run with: node test-supabase.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pddilavtexsnbifdtmrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZGlsYXZ0ZXhzbmJpZmR0bXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDUzODcsImV4cCI6MjA3OTk4MTM4N30.cdj_iuCAm9ErebujAQIn-_fNOnv4OekP6MXrg8h7Apg';

async function test() {
  console.log('🔍 Testing Supabase Connection...\n');

  try {
    // Initialize client
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase client initialized');

    // Test 1: Check if table exists
    console.log('\n📊 Checking if voice_memos table exists...');
    const { data: tableData, error: tableError } = await supabase
      .from('voice_memos')
      .select('*')
      .limit(1);

    if (tableError && tableError.code === 'PGRST116') {
      console.log('❌ Table does not exist! Error:', tableError.message);
    } else if (tableError) {
      console.log('⚠️  Error querying table:', tableError.message);
    } else {
      console.log('✅ Table exists and is accessible');
    }

    // Test 2: Check row count
    console.log('\n📈 Checking memo count...');
    const { count, error: countError } = await supabase
      .from('voice_memos')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('⚠️  Error counting rows:', countError.message);
    } else {
      console.log(`✅ Found ${count || 0} memos in database`);
    }

    // Test 3: Check storage bucket
    console.log('\n🪣 Checking storage bucket...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.log('⚠️  Error listing buckets:', bucketsError.message);
    } else {
      const voiceMemoBucket = buckets?.find((b) => b.name === 'voice-memos');
      if (voiceMemoBucket) {
        console.log('✅ voice-memos bucket exists');
      } else {
        console.log('❌ voice-memos bucket does not exist');
      }
    }

    // Test 4: Test insert (will show RLS issues)
    console.log('\n🔐 Testing insert permission (RLS check)...');
    const testMemo = {
      id: 'test-' + Date.now(),
      user_id: 'test-user-' + Date.now(),
      audio_url: 'https://example.com/test.m4a',
      transcription: 'Test transcription',
      category: 'Personal',
      type: 'note',
      title: 'Test Memo',
      duration: 10,
    };

    const { error: insertError } = await supabase
      .from('voice_memos')
      .insert([testMemo]);

    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
      if (insertError.code === 'PGRST204') {
        console.log('   This usually means RLS policies are blocking the insert');
      }
    } else {
      console.log('✅ Insert succeeded - RLS policies are working');
      // Clean up test data
      await supabase
        .from('voice_memos')
        .delete()
        .eq('id', testMemo.id);
    }

    console.log('\n✨ Diagnostic complete!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

test();
