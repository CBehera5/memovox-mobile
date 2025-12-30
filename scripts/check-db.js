const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDb() {
    console.log('🔍 Checking "profiles" table...');

    // Try to select 1 row. We don't care if it's empty, we care if it ERRORS.
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error accessing profiles table:');
        console.error(JSON.stringify(error, null, 2));

        if (error.code === '42P01') {
            console.error('👉 This means the table "profiles" does not exist.');
        } else if (error.code === '42501') {
            console.error('👉 This implies an RLS (Permission) policy is blocking access.');
        }
    } else {
        console.log('✅ "profiles" table is accessible.');
        console.log(`Found ${data.length} rows.`);
    }

    console.log('\n🔍 Checking for triggers on auth.users...');
    // We can't query information_schema easily with supabase-js directly unless we have a function or direct SQL access.
    // BUT we can try to RPC if enabled, or just warn the user.
    // Actually, asking the user to run SQL is safer. 
    // However, let's try to query 'postgres' level if we are effectively admin (service_role only, but we have ANON key).
    // Anon key definitely cannot query information_schema.triggers usually.
    // Wait, the user might have provided a SERVICE_ROLE key in .env? No, it's ANON.

    console.log('ℹ️  Cannot programmatically list triggers with Anon Key.');
    console.log('👉 Please go to your Supabase Dashboard -> SQL Editor and run:');
    console.log("   select * from information_schema.triggers where event_object_schema = 'auth' and event_object_table = 'users';");
}

checkDb();
