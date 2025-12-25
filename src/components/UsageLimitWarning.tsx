import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants';

/**
 * Usage Limit Warning Component
 * Shows a warning when user is approaching their usage limit
 * Displays percentage used and prompts to upgrade
 */

interface Props {
  currentUsage: number;
  limit: number;
  featureName: string; // e.g., "voice memos", "AI requests"
}

export default function UsageLimitWarning({ currentUsage, limit, featureName }: Props) {
  const router = useRouter();

  // Don't show for unlimited plans
  if (limit === -1) return null;

  const percentage = (currentUsage / limit) * 100;

  // Only show when usage is > 80%
  if (percentage < 80) return null;

  const isAtLimit = currentUsage >= limit;
  const isNearLimit = percentage >= 90;

  const getBackgroundColor = () => {
    if (isAtLimit) return '#ffe5e5'; // Light red
    if (isNearLimit) return '#fff3e0'; // Light orange
    return '#fff9e6'; // Light yellow
  };

  const getBorderColor = () => {
    if (isAtLimit) return '#ffcdd2'; // Red
    if (isNearLimit) return '#ffe0b2'; // Orange
    return '#fff9c4'; // Yellow
  };

  const getTextColor = () => {
    if (isAtLimit) return '#c62828'; // Dark red
    if (isNearLimit) return '#e65100'; // Dark orange
    return '#f57c00'; // Dark yellow
  };

  const getTitle = () => {
    if (isAtLimit) return '🚫 Limit Reached';
    if (isNearLimit) return '⚠️ Almost at Limit';
    return '⚠️ Approaching Limit';
  };

  const getMessage = () => {
    if (isAtLimit) {
      return `You've reached your limit of ${limit} ${featureName} this month`;
    }
    return `You've used ${currentUsage} of ${limit} ${featureName} this month`;
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: getBackgroundColor(),
      borderColor: getBorderColor()
    }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: getTextColor() }]}>
          {getTitle()}
        </Text>
        <Text style={[styles.message, { color: getTextColor() }]}>
          {getMessage()}
        </Text>
        
        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${Math.min(100, percentage)}%`,
                backgroundColor: getTextColor()
              }
            ]} 
          />
        </View>
        <Text style={[styles.percentageText, { color: getTextColor() }]}>
          {Math.round(percentage)}% used
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.upgradeButton, { backgroundColor: getTextColor() }]}
        onPress={() => router.push('/(tabs)/profile?showUpgrade=true')}
        activeOpacity={0.8}
      >
        <Text style={styles.upgradeText}>
          {isAtLimit ? 'Upgrade Now' : 'Get Unlimited'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  content: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  upgradeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  upgradeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
