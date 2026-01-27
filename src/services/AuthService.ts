/**
 * AuthService
 * Handles authentication using Supabase Auth
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../config/supabase';
import { User } from '../types';
import StorageService from './StorageService';

class AuthService {
  /**
   * Sign up a new user with email and password
   */
  async signup(credentials: { email: string; password: string; name: string }): Promise<{ user: User; token: string; isAuthenticated: boolean }> {
    try {
      console.log('� PRODUCTION MODE: Real Supabase signup');
      
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.name,
          },
          emailRedirectTo: 'memovox://auth/callback',
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        throw new Error(error.message || 'Sign up failed');
      }

      if (!data.user) {
        throw new Error('Sign up failed - no user data returned');
      }

      // Create user profile in profiles table
      if (data.user && data.session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              full_name: credentials.name,
              auth_provider: 'email',
            },
          ]);

        if (profileError) {
          console.warn('Profile creation warning:', profileError);
          // Don't fail signup if profile creation fails, it might already exist
        }
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: credentials.name,
        createdAt: data.user.created_at || new Date().toISOString(),
        phoneNumber: data.user.phone,
        phoneVerified: !!data.user.phone_confirmed_at,
      };

      // Save to local storage for offline access
      await StorageService.setUser(user);
      
      if (data.session) {
        await StorageService.setAuthToken(data.session.access_token);
      }

      console.log('✅ User signed up successfully:', user.email);

      return {
        user,
        token: data.session?.access_token || '',
        isAuthenticated: !!data.session,
      };
    } catch (error: any) {
      console.error('Error signing up:', error);
      throw new Error(error.message || 'Sign up failed');
    }
  }

  /**
   * Sign in user with email and password
   */
  async login(credentials: { email: string; password: string }): Promise<{ user: User; token: string; isAuthenticated: boolean }> {
    try {
      console.log('� PRODUCTION MODE: Real Supabase login');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        console.error('Sign in error:', error);
        throw new Error(error.message || 'Login failed');
      }

      if (!data.user || !data.session) {
        throw new Error('Login failed - no session data');
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.full_name || 'User',
        createdAt: data.user.created_at || new Date().toISOString(),
        phoneNumber: data.user.phone,
        phoneVerified: !!data.user.phone_confirmed_at,
      };

      // Save to local storage for offline access
      await StorageService.setUser(user);
      await StorageService.setAuthToken(data.session.access_token);

      console.log('✅ User logged in successfully:', user.email);

      return {
        user,
        token: data.session.access_token,
        isAuthenticated: true,
      };
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw new Error(error.message || 'Login failed');
    }
  }

  /**
   * Sign out the current user
   */
  async logout(): Promise<void> {
    try {
      console.log('🔵 PRODUCTION MODE: Starting logout process');
      
      // Step 1: Sign out from Supabase (clears server session)
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign out error:', error);
        // Continue with local cleanup even if server signout fails
      } else {
        console.log('✅ Supabase session cleared');
      }
      
      // Step 2: Clear all local storage data
      await StorageService.clearUser();
      await StorageService.clearAuthToken();
      await StorageService.removeItem('google_provider_token');
      console.log('✅ Local storage cleared');
      
      // Step 3: Clear AsyncStorage Supabase keys (belt and suspenders)
      try {
        const keys = await AsyncStorage.getAllKeys();
        const supabaseKeys = keys.filter((key: string) => 
          key.startsWith('sb-') || 
          key.includes('supabase') ||
          key === 'memovox_auth_token' ||
          key === 'memovox_user'
        );
        
        if (supabaseKeys.length > 0) {
          await AsyncStorage.multiRemove(supabaseKeys);
          console.log(`✅ Cleared ${supabaseKeys.length} Supabase keys from AsyncStorage`);
        }
      } catch (storageError) {
        console.warn('Error clearing AsyncStorage Supabase keys:', storageError);
        // Non-critical, continue
      }
      
      console.log('✅ User logged out successfully');
    } catch (error: any) {
      console.error('Error signing out:', error);
      
      // Even if there's an error, force clear local storage
      try {
        await StorageService.clearUser();
        await StorageService.clearAuthToken();
        console.log('✅ Forced local storage clear');
      } catch (clearError) {
        console.error('Error clearing local storage:', clearError);
      }
      
      // Don't throw error - we want logout to always succeed from user perspective
      console.warn('Logout completed with errors, but local data cleared');
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      console.log('� PRODUCTION MODE: Getting user from Supabase');
      
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        console.log('No active session, checking local storage');
        // Fallback to local storage
        return await StorageService.getUser();
      }

      // Fetch profile to get stored phone number
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', data.user.id)
        .single();

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.full_name || 'User',
        createdAt: data.user.created_at || new Date().toISOString(),
        phoneNumber: profile?.phone_number || data.user.phone, // Prioritize profile phone
        phoneVerified: !!data.user.phone_confirmed_at || !!profile?.phone_number, // Assume verified if manually added to profile
      };
      
      // Update local storage
      await StorageService.setUser(user);
      
      console.log('✅ Current user:', user.email, 'Phone:', user.phoneNumber);
      return user;
    } catch (error) {
      console.error('Error getting current user:', error);
      return await StorageService.getUser(); // Fallback to local
    }
  }

  /**
   * Get the current session
   */
  async getSession() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Get session error:', error);
        return null;
      }
      return data.session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Reset password by email
   */
  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'memovox://auth/reset-password',
      });

      if (error) {
        console.error('Reset password error:', error);
        throw new Error(error.message || 'Password reset failed');
      }
      
      console.log('✅ Password reset email sent to:', email);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Update password error:', error);
        throw new Error(error.message || 'Password update failed');
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      throw error;
    }
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'User',
          createdAt: session.user.created_at || new Date().toISOString(),
        };
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // First, check Supabase session (most reliable)
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (!error && session) {
        console.log('✅ Active Supabase session found');
        // Update local storage with current session
        if (session.user) {
          const user: User = {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.full_name || 'User',
            createdAt: session.user.created_at || new Date().toISOString(),
          };
          await StorageService.setUser(user);
          await StorageService.setAuthToken(session.access_token);
        }
        return true;
      }
      
      // Fallback: Check local storage for offline access
      const token = await StorageService.getAuthToken();
      const user = await StorageService.getUser();
      const hasLocalAuth = !!(token && user);
      
      if (hasLocalAuth) {
        console.log('✅ Local authentication found (offline mode)');
      } else {
        console.log('❌ No authentication found');
      }
      
      return hasLocalAuth;
    } catch (error) {
      console.error('Error checking authentication:', error);
      // Even on error, check local storage
      const token = await StorageService.getAuthToken();
      const user = await StorageService.getUser();
      return !!(token && user);
    }
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<{ user: User; token: string; isAuthenticated: boolean }> {
    try {
      console.log('🔵 Starting Google Sign-In with manual browser launch');
      
      const redirectUri = 'memovox://auth/callback';
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          scopes: 'openid profile email https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google sign-in error:', error);
        throw new Error(error.message || 'Google sign-in failed');
      }

      if (!data.url) {
        console.error('No auth URL returned from Supabase');
        throw new Error('No auth URL returned. Please check Supabase configuration.');
      }

      console.log('✅ Google OAuth URL received, opening WebBrowser...');
      
      // Open the browser session
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri 
      );

      console.log('WebBrowser result:', result);

      if (result.type === 'success' && result.url) {
        // Handle the deep link if returned directly (iOS mostly, but robustness for Android)
        return this.handleOAuthCallback(result.url);
      }
      
      // On Android, the result might be 'dismiss' even if successful if the deep link opens the app "over" the browser
      // So we return a placeholder state here, as the deep link handler in _layout.tsx will catch the actual callback
      return {
        user: {} as User,
        token: '',
        isAuthenticated: false,
      };
    } catch (error: any) {
      console.error('Error with Google sign-in:', error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(url: string): Promise<{ user: User; token: string; isAuthenticated: boolean }> {
    try {
      console.log('🔵 Handling OAuth callback with URL:', url);
      
      // Helper to extract params
      const getParam = (name: string) => {
        const regex = new RegExp(`[?&#]${name}=([^&#]*)`);
        const results = regex.exec(url);
        return results ? decodeURIComponent(results[1].replace(/\+/g, ' ')) : null;
      };

      const code = getParam('code');
      const accessToken = getParam('access_token');
      const refreshToken = getParam('refresh_token');

      let sessionData = null;
      let userData = null;

      if (code) {
         console.log('🔹 Found Auth Code, exchanging for session...');
         const { data, error } = await supabase.auth.exchangeCodeForSession(url);
         if (error) throw error;
         sessionData = data.session;
         userData = data.user;
      } else if (accessToken) {
         console.log('🔹 Found Access Token (Implicit), setting session...');
         const { data, error } = await supabase.auth.setSession({
           access_token: accessToken,
           refresh_token: refreshToken || '',
         });
         if (error) throw error;
         sessionData = data.session;
         userData = data.user;
      } else {
        throw new Error('No code or access token found in URL');
      }
      
      if (!sessionData || !userData) {
        throw new Error('No session data established');
      }
      
      const data = { session: sessionData, user: userData };

      // Create or update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'User',
            avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
            auth_provider: 'google',
          },
        ]);

      if (profileError) {
        console.warn('Profile upsert warning:', profileError);
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || 'User',
        createdAt: data.user.created_at || new Date().toISOString(),
        phoneNumber: data.user.phone,
        phoneVerified: !!data.user.phone_confirmed_at,
      };

      // Save to local storage
      await StorageService.setUser(user);
      await StorageService.setAuthToken(data.session.access_token);

      // EXTRACT AND SAVE PROVIDER TOKEN
      if (data.session.provider_token) {
        console.log('✅ Provider token found in session, saving locally...');
        await StorageService.setItem('google_provider_token', data.session.provider_token);
      } else {
        console.warn('⚠️ No provider token found in OAuth callback session');
      }

      console.log('✅ OAuth callback successful:', user.email);

      return {
        user,
        token: data.session.access_token,
        isAuthenticated: true,
      };
    } catch (error: any) {
      console.error('Error handling OAuth callback:', error);
      throw error;
    }
  }

  /**
   * Delete user account (GDPR Right to Erasure)
   */
  async deleteAccount(): Promise<void> {
    try {
      console.log('🗑️ Deleting user account...');
      
      // Get current user
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('No user logged in');
      }

      // Delete from Supabase Auth
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) {
        console.error('Delete account error:', error);
        // Continue with local cleanup even if server deletion fails
      }

      // Clear all local data
      await StorageService.clearAllData();
      
      console.log('✅ Account deleted successfully');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }
}

export default new AuthService();