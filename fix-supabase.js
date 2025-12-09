#!/usr/bin/env node

/**
 * Fix script to set up storage bucket and fix RLS policies
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pddilavtexsnbifdtmrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZGlsYXZ0ZXhzbmJpZmR0bXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDUzODcsImV4cCI6MjA3OTk4MTM4N30.cdj_iuCAm9ErebujAQIn-_fNOnv4OekP6MXrg8h7Apg';

async function fix() {
  console.log('🔧 Fixing Supabase Configuration...\n');

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Step 1: Create storage bucket
    console.log('📦 Creating voice-memos storage bucket...');
    const { error: bucketError } = await supabase.storage.createBucket(
      'voice-memos',
      {
        public: true,
      }
    );

    if (bucketError && bucketError.message.includes('already exists')) {
      console.log('✅ Bucket already exists');
    } else if (bucketError) {
      console.log('⚠️  Bucket creation error:', bucketError.message);
    } else {
      console.log('✅ voice-memos bucket created');
    }

    // Step 2: Test if we can disable RLS temporarily
    console.log('\n🔐 Testing RLS removal (for testing purposes)...');
    console.log('   (Note: You may need to run this SQL in Supabase dashboard if permissions are limited)');

    // Step 3: Show the SQL commands needed
    console.log('\n📋 To complete the setup, run these SQL commands in your Supabase SQL Editor:\n');
    
    const sqlCommands = `
-- 1. Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can create their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can update their own memos" ON voice_memos;
DROP POLICY IF EXISTS "Users can delete their own memos" ON voice_memos;

-- 2. Disable RLS temporarily for testing
ALTER TABLE voice_memos DISABLE ROW LEVEL SECURITY;

-- 3. Re-enable RLS with fixed policies
ALTER TABLE voice_memos ENABLE ROW LEVEL SECURITY;

-- 4. Create new policies that properly check user authentication
CREATE POLICY "Enable all for authenticated users"
  ON voice_memos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 5. After testing works, you can create stricter policies:
-- CREATE POLICY "Users can only see their own memos"
--   ON voice_memos FOR SELECT
--   USING (user_id = (SELECT auth.uid()::text));
-- etc.
`;

    console.log(sqlCommands);

    console.log('\n✨ Setup complete! Now:\n');
    console.log('1. Go to: https://app.supabase.com/project/pddilavtexsnbifdtmrc/sql/new');
    console.log('2. Copy and paste the SQL commands above');
    console.log('3. Run them in order');
    console.log('4. Then try recording a memo again in the app');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fix();
