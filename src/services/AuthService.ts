/**
 * AuthService
 * Handles authentication using Supabase Auth
 */

import { supabase } from '../config/supabase';
import { User } from '../types';
import StorageService from './StorageService';

class AuthService {
  /**
   * Sign up a new user with email and password
   */
  async signup(credentials: { email: string; password: string; name: string }): Promise<{ user: User; token: string; isAuthenticated: boolean }> {
    try {
      // ⚠️ DEVELOPMENT MODE: Using mock authentication
      // Network restrictions prevent reaching Supabase
      console.log('🟡 DEVELOPMENT MODE: Using mock signup (network restricted)');
      
      const mockUser: User = {
        id: 'dev-user-' + Date.now(),
        email: credentials.email,
        name: credentials.name,
        createdAt: new Date().toISOString(),
      };
      
      const mockToken = 'mock-token-' + Date.now();
      
      // Save to local storage
      await StorageService.setUser(mockUser);
      await StorageService.setAuthToken(mockToken);
      
      console.log('🟡 Mock user created:', mockUser);
      
      return {
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
      };
      
      // PRODUCTION: Real Supabase Auth implementation (currently commented out)
      // Uncomment when network access is available
      /*
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.name,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        throw new Error(error.message || 'Sign up failed');
      }

      if (data.user && data.session) {
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: credentials.name,
          createdAt: data.user.created_at || new Date().toISOString(),
        };

        // Save to local storage for offline access
        await StorageService.setUser(user);
        await StorageService.setAuthToken(data.session.access_token);

        return {
          user,
          token: data.session.access_token,
          isAuthenticated: true,
        };
      }

      throw new Error('Sign up failed');
      */
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
      // ⚠️ DEVELOPMENT MODE: Using mock authentication
      // Network restrictions prevent reaching Supabase
      console.log('🟡 DEVELOPMENT MODE: Using mock login (network restricted)');
      
      // Check if user already exists in local storage
      const existingUser = await StorageService.getUser();
      
      let mockUser: User;
      if (existingUser && existingUser.email === credentials.email) {
        // Use existing user
        mockUser = existingUser;
        console.log('🟡 Existing user found:', mockUser);
      } else {
        // Create new user from email
        const userName = credentials.email.split('@')[0];
        mockUser = {
          id: 'dev-user-' + Date.now(),
          email: credentials.email,
          name: userName.charAt(0).toUpperCase() + userName.slice(1), // Capitalize first letter
          createdAt: new Date().toISOString(),
        };
        console.log('🟡 New mock user created:', mockUser);
      }
      
      const mockToken = 'mock-token-' + Date.now();
      
      // Save to local storage
      await StorageService.setUser(mockUser);
      await StorageService.setAuthToken(mockToken);
      
      return {
        user: mockUser,
        token: mockToken,
        isAuthenticated: true,
      };
      
      // PRODUCTION: Real Supabase Auth implementation (currently commented out)
      // Uncomment when network access is available
      /*
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        console.error('Sign in error:', error);
        throw new Error(error.message || 'Login failed');
      }

      if (data.user && data.session) {
        const user: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.full_name || 'User',
          createdAt: data.user.created_at || new Date().toISOString(),
        };

        // Save to local storage for offline access
        await StorageService.setUser(user);
        await StorageService.setAuthToken(data.session.access_token);

        return {
          user,
          token: data.session.access_token,
          isAuthenticated: true,
        };
      }

      throw new Error('Login failed');
      */
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
      console.log('🟡 DEVELOPMENT MODE: Mock logout');
      
      // Clear local storage
      await StorageService.clearUser();
      await StorageService.clearAuthToken();
      
      console.log('🟡 User logged out, local data cleared');
      
      // PRODUCTION: Real Supabase logout (currently commented out)
      /*
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw new Error(error.message || 'Sign out failed');
      }
      
      await StorageService.clearUser();
      await StorageService.clearAuthToken();
      */
    } catch (error: any) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // ⚠️ DEVELOPMENT MODE: Get from local storage
      console.log('🟡 DEVELOPMENT MODE: Getting user from local storage');
      const user = await StorageService.getUser();
      
      if (user) {
        console.log('🟡 User found:', user);
      } else {
        console.log('🟡 No user in storage');
      }
      
      return user;
      
      // PRODUCTION: Real Supabase user fetch (currently commented out)
      /*
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        // Fallback to local storage
        return await StorageService.getUser();
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.full_name || 'User',
        createdAt: data.user.created_at || new Date().toISOString(),
      };
      
      // Update local storage
      await StorageService.setUser(user);
      
      return user;
      */
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
        redirectTo: `${process.env.EXPO_PUBLIC_APP_URL}/reset-password`,
      });

      if (error) {
        console.error('Reset password error:', error);
        throw new Error(error.message || 'Password reset failed');
      }
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
      // Check local storage for auth token
      const token = await StorageService.getAuthToken();
      const user = await StorageService.getUser();
      return !!(token && user);
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }
}

export default new AuthService();