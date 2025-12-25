// app/(onboarding)/welcome.tsx

import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingCarousel } from '../../src/components/OnboardingCarousel';
import { OnboardingStorage } from '../../src/utils/OnboardingStorage';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleComplete = async () => {
    await OnboardingStorage.markOnboardingComplete();
    router.replace('/(auth)/signup');
  };

  const handleSkip = async () => {
    await OnboardingStorage.skipOnboarding();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <OnboardingCarousel onComplete={handleComplete} onSkip={handleSkip} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
