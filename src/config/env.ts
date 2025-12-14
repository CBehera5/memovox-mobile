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

// Final fallback - load from process.env
if (!GROQ_API_KEY) {
  GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
  if (!GROQ_API_KEY) {
    console.error('⚠️ GROQ_API_KEY not found! Please set EXPO_PUBLIC_GROQ_API_KEY in .env file');
  }
}

export const Config = {
  GROQ_API_KEY,
};

export { GROQ_API_KEY };

// Log configuration status (without exposing key)
console.log('Config loaded:', {
  hasGroqKey: !!Config.GROQ_API_KEY,
  keyLength: Config.GROQ_API_KEY?.length || 0,
});
