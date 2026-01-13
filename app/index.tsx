// app/index.tsx
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import AuthService from '../src/services/AuthService';
import StorageService from '../src/services/StorageService';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Checking authentication status...');
        // Give a tiny buffer for Storage warmup if needed, but usually redundant if awaiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const authenticated = await AuthService.isAuthenticated();
        console.log('🔐 Auth Status:', authenticated);
        
        if (authenticated) {
          router.replace('/(tabs)/home');
        } else {
          // Check if language is selected
          const language = await StorageService.getLanguagePreference();
          if (!language) {
            router.replace('/(onboarding)/language');
          } else {
            router.replace('/(onboarding)/welcome');
          }
        }
      } catch (error) {
        console.error('⚠️ Auth check failed:', error);
        router.replace('/(onboarding)/welcome');
      }
    };

    checkAuth();

    return () => {}; // Cleanup
  }, []);

  return <View style={{ flex: 1 }} />;
}