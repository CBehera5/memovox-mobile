// app/index.tsx

import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Use requestAnimationFrame to ensure component is mounted
    const frame = requestAnimationFrame(() => {
      router.replace('/splash');
    });

    return () => cancelAnimationFrame(frame);
  }, [router]);

  // Render a minimal view while navigating
  return <View style={{ flex: 1 }} />;
}