// app/index.tsx
import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    console.log('Index mounted, attempting navigation to splash');
    
    const frame = requestAnimationFrame(() => {
      try {
        console.log('Navigating to splash...');
        router.replace('/splash');
      } catch (error) {
        console.error('Navigation error:', error);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading...</Text>
    </View>
  );
}