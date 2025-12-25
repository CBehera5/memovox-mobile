// src/utils/OnboardingStorage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'memovox_onboarding_complete';

export class OnboardingStorage {
  /**
   * Check if user has completed onboarding
   */
  static async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  /**
   * Mark onboarding as complete
   */
  static async markOnboardingComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  }

  /**
   * Reset onboarding (for testing or user preference)
   */
  static async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ONBOARDING_KEY);
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  }

  /**
   * Skip onboarding (mark as complete without viewing all)
   */
  static async skipOnboarding(): Promise<void> {
    await this.markOnboardingComplete();
  }
}
