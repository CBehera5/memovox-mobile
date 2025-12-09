// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import { COLORS } from '../../src/constants';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray[400],
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.gray[200],
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="🏠" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="🎙️" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Talk to me',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="💬" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="📝" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size}) => (
            <TabIcon name="👤" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

interface TabIconProps {
  name: string;
  color: string;
}

function TabIcon({ name, color }: TabIconProps) {
  return <span style={{ fontSize: 24, opacity: color === COLORS.primary ? 1 : 0.5 }}>{name}</span>;
}