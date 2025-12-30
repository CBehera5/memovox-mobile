// src/config/env.ts
// Centralized environment configuration

import Constants from 'expo-constants';

// Use Expo Constants to access environment variables
// These are loaded from .env.local by Expo during build/bundle
const expoConfig = Constants.expoConfig?.extra || {};

// Load from environment only - NO hardcoded fallbacks for production security
// Helper to get Valid Key or Fallback
const getValidGroqKey = () => {
    const expoKey = expoConfig.EXPO_PUBLIC_GROQ_API_KEY;
    const processKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    
    // Real keys are long. Placeholders are usually short.
    // We prefer the Hardcoded Fallback if the detected key looks like a placeholder.
    let candidate = (expoKey || processKey || '').trim();
    
    if (!candidate || candidate.length < 30 || candidate.includes('YOUR_')) {
      console.warn('⚠️ Detected Invalid/Placeholder Groq Key. Please configure EXPO_PUBLIC_GROQ_API_KEY.');
      return '';
    }
    
    return candidate;
  };
  
const GROQ_API_KEY = getValidGroqKey();

const GOOGLE_CLIENT_ID_ANDROID = 
  expoConfig.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || 
  '';

const GOOGLE_CLIENT_ID_IOS = 
  expoConfig.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || 
  '';

const GOOGLE_CLIENT_ID_WEB = 
  expoConfig.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || 
  '';

// Log for debugging
console.log('🔧 Environment Configuration:');
console.log('  - GROQ_API_KEY:', GROQ_API_KEY ? `Present (${GROQ_API_KEY.substring(0, 15)}...)` : '❌ MISSING');
console.log('  - GOOGLE_CLIENT_ID_ANDROID:', GOOGLE_CLIENT_ID_ANDROID ? 'Present' : 'Missing');

// Validate required API keys
if (!GROQ_API_KEY) {
  console.error('⚠️ GROQ_API_KEY not found! Using fallback value.');
}

export const Config = {
  GROQ_API_KEY,
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_WEB,
};

export { 
  GROQ_API_KEY,
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_IOS,
  GOOGLE_CLIENT_ID_WEB,
};

// Log configuration status (without exposing keys)
console.log('Config loaded:', {
  hasGroqKey: !!Config.GROQ_API_KEY,
  keyLength: Config.GROQ_API_KEY?.length || 0,
  hasGoogleAndroid: !!Config.GOOGLE_CLIENT_ID_ANDROID,
  hasGoogleIOS: !!Config.GOOGLE_CLIENT_ID_IOS,
  hasGoogleWeb: !!Config.GOOGLE_CLIENT_ID_WEB,
});
