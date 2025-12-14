// src/config/env.ts
// Centralized environment configuration

// Try to import from @env, fallback to hardcoded values for builds
let GROQ_API_KEY = '';

try {
  // This will work with react-native-dotenv
  const envVars = require('@env');
  GROQ_API_KEY = envVars.EXPO_PUBLIC_GROQ_API_KEY || '';
} catch (error) {
  console.warn('Could not load @env, using fallback configuration');
}

// Fallback to direct import if @env fails (for builds)
if (!GROQ_API_KEY) {
  try {
    const { EXPO_PUBLIC_GROQ_API_KEY } = require('@env');
    GROQ_API_KEY = EXPO_PUBLIC_GROQ_API_KEY;
  } catch (e) {
    console.warn('Environment variables not loaded');
  }
}

// Final fallback - use the key directly (will be in the built APK but that's OK for now)
if (!GROQ_API_KEY) {
  GROQ_API_KEY = '***REMOVED***';
  console.log('Using fallback API key');
}

export const Config = {
  GROQ_API_KEY,
};

// Log configuration status (without exposing key)
console.log('Config loaded:', {
  hasGroqKey: !!Config.GROQ_API_KEY,
  keyLength: Config.GROQ_API_KEY?.length || 0,
});
