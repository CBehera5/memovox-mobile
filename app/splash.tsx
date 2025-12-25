// app/splash.tsx
/**
 * Direct Navigation Screen - MemoVox
 * 
 * Immediately navigates to the appropriate screen:
 * - First-time users: Onboarding
 * - Returning users (authenticated): Home
 * - Returning users (not authenticated): Login
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AuthService from '../src/services/AuthService';
import { OnboardingStorage } from '../src/utils/OnboardingStorage';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const navigate = async () => {
      try {
        const isAuthenticated = await AuthService.isAuthenticated();
        
        if (isAuthenticated) {
          // Check if user has seen onboarding
          const hasSeenOnboarding = await OnboardingStorage.hasCompletedOnboarding();
          
          if (hasSeenOnboarding) {
            router.replace('/(tabs)/home');
          } else {
            router.replace('/(onboarding)/welcome');
          }
        } else {
          // First-time or logged-out users
          const hasSeenOnboarding = await OnboardingStorage.hasCompletedOnboarding();
          
          if (hasSeenOnboarding) {
            router.replace('/(auth)/login');
          } else {
            // First-time user - go to onboarding
            router.replace('/(onboarding)/welcome');
          }
        }
      } catch (error) {
        console.error('Navigation error:', error);
        router.replace('/(onboarding)/welcome');
      }
    };

    navigate();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#667EEA" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});