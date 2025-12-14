/**
 * Supabase Configuration
 * Initialize Supabase client with your project credentials
 */

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get credentials from environment variables OR app.json extra config
const SUPABASE_URL = 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  Constants.expoConfig?.extra?.supabaseUrl || 
  '';

const SUPABASE_ANON_KEY = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  Constants.expoConfig?.extra?.supabaseAnonKey || 
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase URL and/or Anon Key are not set. Please configure environment variables.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
