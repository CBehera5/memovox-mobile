// app/_layout.tsx

import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AIService from '../src/services/AIService';
import NotificationService from '../src/services/NotificationService';

export default function RootLayout() {
  useEffect(() => {
    const initialize = async () => {
      try {
        await AIService.initialize();
        // Only initialize notifications on native platforms
        if (Platform.OS !== 'web') {
          try {
            await NotificationService.initialize();
          } catch (error) {
            console.warn('Notification initialization failed (expected on web):', error);
          }
        }
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initialize();
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
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