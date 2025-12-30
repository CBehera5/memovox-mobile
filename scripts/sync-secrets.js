const fs = require('fs');
const { execSync } = require('child_process');
require('dotenv').config();

const vars = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_GROQ_API_KEY',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS',
    'EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB'
];

console.log('Pushing secrets to EAS...');

vars.forEach(key => {
    const value = process.env[key];
    if (value) {
        console.log(`Setting ${key}...`);
        try {
            // Check if secret exists first might be complex, just force create/overwrite
            // eas secret:create --scope project --name NAME --value VALUE --force
            execSync(`npx eas-cli secret:create --scope project --name ${key} --value "${value}" --type string --force`, { stdio: 'inherit' });
            console.log(`✅ Set ${key}`);
        } catch (e) {
            console.error(`❌ Failed to set ${key}`);
        }
    } else {
        console.warn(`⚠️ Skipping ${key} (not found in .env)`);
    }
});
