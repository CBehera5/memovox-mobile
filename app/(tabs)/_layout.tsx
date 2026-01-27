// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import { COLORS } from '../../src/constants';
import { View, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home, Mic, MessageSquare, ListTodo, Users } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <SafeAreaProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.gray[400],
          tabBarShowLabel: true,
          tabBarStyle: {
            backgroundColor: COLORS.white,
            borderTopWidth: 1,
            borderTopColor: COLORS.gray[200],
            elevation: 8,
            height: Platform.OS === 'android' ? 70 : 60,
            paddingBottom: Platform.OS === 'android' ? 12 : 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 4,
          },
        }}
      >
      {/* 1. Home */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      
      {/* 2. Tasks (New) */}
      <Tabs.Screen
        name="tasks"
        options={{
            title: 'Tasks',
            tabBarIcon: ({ color }) => <ListTodo size={24} color={color} />,
        }}
      />

      {/* 3. Record (Floating) */}
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarLabel: () => null, // Hide label for floating button
          tabBarIcon: ({ focused }) => (
            <View style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: COLORS.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24, // Lift it up
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
            }}>
                <Mic size={32} color={COLORS.white} />
            </View>
          ),
        }}
      />

      {/* 4. Plan with AI (Chat) */}
      <Tabs.Screen
        name="chat"
        options={{
          title: "Plan with AI",
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
        }}
      />

      {/* 5. Social (Groups) */}
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />

      {/* Hidden Screens */}
      <Tabs.Screen
        name="notes"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="privacy"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="about"
        options={{ href: null }}
      />
    </Tabs>
    </SafeAreaProvider>
  );
}
