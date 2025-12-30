const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('Checking environment variables...');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

console.log('EXPO_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Missing');
if (SUPABASE_URL) {
    if (SUPABASE_URL.includes('your-project-url') || SUPABASE_URL.includes('replace-me')) {
        console.error('❌ EXPO_PUBLIC_SUPABASE_URL looks like a placeholder!');
    } else if (!SUPABASE_URL.startsWith('https://')) {
        console.warn('⚠️ EXPO_PUBLIC_SUPABASE_URL does not start with https://');
    } else {
        console.log('✅ EXPO_PUBLIC_SUPABASE_URL format looks OK');
    }
}

console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Set' : 'Missing');
if (SUPABASE_ANON_KEY) {
    if (SUPABASE_ANON_KEY.includes('EyJ') || SUPABASE_ANON_KEY.includes('eyJ')) {
        console.log('✅ EXPO_PUBLIC_SUPABASE_ANON_KEY format looks like a JWT');
    } else if (SUPABASE_ANON_KEY.includes('YOUR_') || SUPABASE_ANON_KEY.includes('your-anon-key')) {
        console.error('❌ EXPO_PUBLIC_SUPABASE_ANON_KEY looks like a placeholder!');
    } else {
        console.warn('⚠️ EXPO_PUBLIC_SUPABASE_ANON_KEY does not look like a standard JWT');
    }
}

console.log('EXPO_PUBLIC_GROQ_API_KEY:', GROQ_KEY ? 'Set' : 'Missing');

// LIVE CONNECTION TEST
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    console.log('\n🔄 Testing Supabase Connection via REST...');
    const url = `${SUPABASE_URL}/auth/v1/settings`;

    fetch(url, {
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
    })
        .then(res => {
            console.log(`Supabase Response Status: ${res.status}`);
            if (res.ok) {
                console.log('✅ Supabase Connection Successful!');
            } else {
                console.error('❌ Supabase Connection Failed!');
                return res.text().then(text => console.error('Response:', text));
            }
        })
        .catch(err => {
            console.error('❌ Network Error connecting to Supabase:', err.message);
        });
}
