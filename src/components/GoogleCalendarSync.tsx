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
      // We wrap this in a sub-try/catch to suppress benign browser errors
      try {
        await AuthService.signInWithGoogle();
      } catch (error: any) {
        // Suppress "URL not found" or dismiss errors which often happen on Android 
        // despite successful deep linking
        const isBenign = 
          error.message?.includes('URL not found') || 
          error.message?.includes('User canceled') || 
          error.message?.includes('dismiss') ||
          error.message?.includes('null');
          
        if (!isBenign) {
          throw error;
        }
        console.log('Ignored benign auth error, proceeding to verification:', error.message);
      }

      // Start polling for connection status
      // We verify for up to 8 seconds to allow the deep link to process
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const signedIn = await GoogleCalendarService.isSignedIn();
          if (signedIn) {
            clearInterval(interval);
            setIsSignedIn(true);
            await loadEventCount();
            setIsLoading(false);
            Alert.alert('Success', 'Google Calendar connected!');
          } else if (attempts >= 10) { // 10 seconds timeout
            clearInterval(interval);
            setIsLoading(false);
            // Don't show error on timeout, as user might have just cancelled.
            // If they really failed, they can try again.
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 1000);

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
