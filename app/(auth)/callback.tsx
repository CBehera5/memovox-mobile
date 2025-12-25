// app/(auth)/callback.tsx
/**
 * OAuth Callback Handler
 * Handles the redirect from Google OAuth sign-in
 */

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AuthService from '../../src/services/AuthService';
import { COLORS } from '../../src/constants';

export default function CallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get the full URL from params
      const url = params.url as string;
      
      if (!url) {
        console.error('No URL in callback params');
        router.replace('/(auth)/login');
        return;
      }

      console.log('🔵 Processing OAuth callback');
      
      // Handle the OAuth callback
      const result = await AuthService.handleOAuthCallback(url);
      
      if (result.isAuthenticated) {
        console.log('✅ OAuth authentication successful');
        // Navigate to home
        router.replace('/(tabs)/home');
      } else {
        console.error('OAuth authentication failed');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray[600],
  },
});
