// src/components/GoogleCalendarSync.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import GoogleCalendarService from '../services/GoogleCalendarService';
import AuthService from '../services/AuthService';
import { COLORS } from '../constants';

interface GoogleCalendarSyncProps {
  onSync?: (events: any[]) => void;
}

export default function GoogleCalendarSync({ onSync }: GoogleCalendarSyncProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    checkSignInStatus();
  }, []);

  const checkSignInStatus = async () => {
    try {
      const signedIn = await GoogleCalendarService.isSignedIn();
      setIsSignedIn(signedIn);
      
      if (signedIn) {
        await loadEventCount();
      }
    } catch (error) {
      console.error('Error checking sign-in status:', error);
    }
  };

  const loadEventCount = async () => {
    try {
      const events = await GoogleCalendarService.getUpcomingEvents();
      setEventCount(events.length);
    } catch (error) {
      console.error('Error loading event count:', error);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      // Use consolidated auth flow
      await AuthService.signInWithGoogle();
      // Note: The actual sign-in happens via redirect, so we don't set isSignedIn(true) here immediately.
      // The app will reload or handle the deep link callback.
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sign in');
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to disconnect Google Calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await GoogleCalendarService.signOut();
            setIsSignedIn(false);
            setEventCount(0);
          },
        },
      ]
    );
  };

  const syncEvents = async () => {
    setIsLoading(true);
    try {
      const events = await GoogleCalendarService.getUpcomingEvents();
      setEventCount(events.length);
      
      if (onSync) {
        onSync(events);
      }
      
      Alert.alert('Synced', `Loaded ${events.length} events from Google Calendar`);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to sync calendar events');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!isSignedIn ? (
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.icon}>📅</Text>
              <Text style={styles.buttonText}>Connect Google Calendar</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.connectedContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.statusIcon}>✅</Text>
            <View style={styles.statusInfo}>
              <Text style={styles.statusText}>Google Calendar Connected</Text>
              <Text style={styles.eventCount}>{eventCount} upcoming events</Text>
            </View>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.syncButton]} 
              onPress={syncEvents}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.buttonText}>🔄 Sync</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.signOutButton]} 
              onPress={handleSignOut}
            >
              <Text style={styles.signOutText}>Disconnect</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    minHeight: 48,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  connectedContainer: {
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  eventCount: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  syncButton: {
    flex: 2,
  },
  signOutButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  signOutText: {
    color: COLORS.gray[600],
    fontSize: 14,
    fontWeight: '600',
  },
});
