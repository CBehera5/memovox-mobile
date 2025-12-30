// app/_layout.tsx

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import AIService from '../src/services/AIService';
import NotificationService from '../src/services/NotificationService';
import AuthService from '../src/services/AuthService';

export default function RootLayout() {
  const router = useRouter();

  // Load Professional Fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        await AIService.initialize();
        // Only initialize notifications on native platforms
        if (Platform.OS !== 'web') {
          try {
            await NotificationService.initialize();
            
            // Set up notification action listener
            const subscription = Notifications.addNotificationResponseReceivedListener(response => {
              const { actionIdentifier, notification } = response;
              
              if (actionIdentifier && actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
                // Handle custom actions (complete, snooze)
                NotificationService.handleNotificationAction(actionIdentifier, notification);
              } else {
                // Default action (tap notification) - navigate to task
                const data = notification.request.content.data;
                if (data.actionId) {
                  router.push('/(tabs)/home');
                }
              }
            });

            // Cleanup on unmount
            return () => subscription.remove();
          } catch (error) {
            console.warn('Notification initialization failed (expected on web):', error);
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initialize();

    // Handle OAuth deep links
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('🔵 Deep link received:', url);
      
      // Check if this is an OAuth callback
      if (url.includes('auth/callback') || url.includes('#access_token')) {
        try {
          const result = await AuthService.handleOAuthCallback(url);
          if (result.isAuthenticated) {
            console.log('✅ OAuth authentication successful via deep link');
            router.replace('/(tabs)/home');
          }
        } catch (error) {
          console.error('Error handling OAuth deep link:', error);
          router.replace('/(auth)/login');
        }
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return <ActivityIndicator size="large" color="#6366f1" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />;
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f8fafc' }, // Set global background to Slate 50
        }}
      >
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}