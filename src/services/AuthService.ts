/**
 * AuthService
 * Handles authentication using Supabase Auth
 */

import { supabase } from '../config/supabase';
import { User } from '../types';

class AuthService {
  /**
   * Sign up a new user with email and password
   */
  async signup(credentials: { email: string; password: string; name: string }): Promise<{ user: User; token: string; isAuthenticated: boolean }> {
    try {
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

        return {
          user,
          token: data.session.access_token,
          isAuthenticated: true,
        };
      }

      throw new Error('Sign up failed');
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

        return {
          user,
          token: data.session.access_token,
          isAuthenticated: true,
        };
      }

      throw new Error('Login failed');
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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        throw new Error(error.message || 'Sign out failed');
      }
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
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.full_name || 'User',
        createdAt: data.user.created_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
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
      const user = await this.getCurrentUser();
      return !!user;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }
}

export default new AuthService();