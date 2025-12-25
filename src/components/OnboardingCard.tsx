// src/components/OnboardingCard.tsx

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');

export interface OnboardingCardData {
  id: number;
  title: string;
  subtitle: string;
  features?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  mainIcon?: string;
}

interface OnboardingCardProps {
  card: OnboardingCardData;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({ card }) => {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6', '#ec4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Main Icon (for cards 1 and 3) */}
        {card.mainIcon && (
          <View style={styles.mainIconContainer}>
            <Text style={styles.mainIcon}>{card.mainIcon}</Text>
          </View>
        )}

        {/* Title */}
        <Text style={styles.title}>{card.title}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{card.subtitle}</Text>

        {/* Features Grid (for card 2) */}
        {card.features && (
          <View style={styles.featuresGrid}>
            {card.features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  mainIconContainer: {
    marginBottom: 30,
  },
  mainIcon: {
    fontSize: 100,
    textAlign: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: 26,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  featureCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 12,
    color: COLORS.white,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 16,
  },
});
