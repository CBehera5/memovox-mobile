import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import SubscriptionService from '../services/SubscriptionService';
import { COLORS } from '../constants';

/**
 * Trial Banner Component
 * Shows a banner with trial days remaining and upgrade prompt
 * Only displays when trial is active and <= 7 days remaining
 */
export default function TrialBanner() {
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isInTrial, setIsInTrial] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    loadTrialInfo();
  }, []);

  const loadTrialInfo = async () => {
    try {
      const inTrial = await SubscriptionService.isInTrial();
      const days = await SubscriptionService.getTrialDaysRemaining();
      
      setIsInTrial(inTrial);
      setDaysRemaining(days);
    } catch (error) {
      console.error('Error loading trial info:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show banner if:
  // - Not in trial
  // - More than 7 days remaining
  // - Still loading
  if (loading || !isInTrial || daysRemaining > 7) {
    return null;
  }

  const getBannerColor = () => {
    if (daysRemaining === 0) return '#ff4444'; // Red - Trial ended
    if (daysRemaining <= 1) return '#ff6b6b'; // Urgent red
    if (daysRemaining <= 3) return '#ffa500'; // Orange
    return '#ffb347'; // Light orange
  };

  const getMessage = () => {
    if (daysRemaining === 0) return 'Trial ends today! 🚨';
    if (daysRemaining === 1) return 'Last day of trial! ⏰';
    return `${daysRemaining} days left in trial`;
  };

  const getSubMessage = () => {
    if (daysRemaining === 0) return 'Subscribe now to keep using all features';
    if (daysRemaining <= 1) return 'Don\'t lose access to premium features!';
    return 'Upgrade to keep unlimited access';
  };

  const getCtaText = () => {
    if (daysRemaining === 0) return 'Subscribe Now';
    return 'Upgrade';
  };

  return (
    <View style={[styles.banner, { backgroundColor: getBannerColor() }]}>
      <View style={styles.content}>
        <Text style={styles.message}>{getMessage()}</Text>
        <Text style={styles.subtitle}>{getSubMessage()}</Text>
      </View>
      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={() => router.push('/(tabs)/profile?showUpgrade=true')}
        activeOpacity={0.8}
      >
        <Text style={styles.upgradeText}>{getCtaText()}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  message: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.95,
    fontWeight: '500',
  },
  upgradeButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  upgradeText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#333',
  },
});
