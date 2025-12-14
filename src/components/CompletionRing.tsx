// src/components/CompletionRing.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface CompletionRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}

export default function CompletionRing({ 
  percentage, 
  size = 120, 
  strokeWidth = 12 
}: CompletionRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (percentage / 100) * circumference;

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 80) return '#4CAF50'; // Green
    if (percentage >= 50) return '#FFA726'; // Orange
    return '#EF5350'; // Red
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background circle */}
      <View style={styles.svgContainer}>
        <View 
          style={[
            styles.backgroundCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: COLORS.gray[200],
            }
          ]}
        />
        
        {/* Progress circle - approximated with border */}
        <View 
          style={[
            styles.progressCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: getColor(),
              borderTopColor: 'transparent',
              borderRightColor: percentage >= 25 ? getColor() : 'transparent',
              borderBottomColor: percentage >= 50 ? getColor() : 'transparent',
              borderLeftColor: percentage >= 75 ? getColor() : 'transparent',
              transform: [{ rotate: '-90deg' }],
            }
          ]}
        />
      </View>
      
      {/* Percentage text */}
      <View style={styles.textContainer}>
        <Text style={[styles.percentageText, { color: getColor() }]}>
          {Math.round(percentage)}%
        </Text>
        <Text style={styles.labelText}>Complete</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    position: 'absolute',
  },
  backgroundCircle: {
    position: 'absolute',
  },
  progressCircle: {
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentageText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  labelText: {
    fontSize: 12,
    color: COLORS.gray[600],
    marginTop: 2,
  },
});
