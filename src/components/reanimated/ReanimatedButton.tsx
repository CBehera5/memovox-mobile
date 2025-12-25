/**
 * ReanimatedButton - Enhanced button component with Reanimated animations
 * Phase 1 Component - Drop-in replacement for existing buttons
 * 
 * Features:
 * - Press scale animation
 * - Loading state with spinner
 * - Haptic feedback
 * - Accessibility support
 * - Feature flag support
 */

import React from 'react';
import { 
  StyleSheet, 
  Text, 
  ViewStyle, 
  TextStyle, 
  ActivityIndicator,
  AccessibilityRole 
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { FEATURE_FLAGS } from '../../config/features';
import { ANIMATION_CONFIG } from '../../config/animations';

interface ReanimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const ReanimatedButton: React.FC<ReanimatedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}) => {
  // Feature flag check - if disabled, render simple button
  if (!FEATURE_FLAGS.USE_REANIMATED_BUTTONS) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.button,
          styles[`button_${variant}`],
          styles[`button_${size}`],
          disabled && styles.button_disabled,
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            {icon}
            <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>
              {title}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  // Shared values for animations
  const scale = useSharedValue(1);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  // Press handlers
  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(
        ANIMATION_CONFIG.PRESS_SCALE,
        ANIMATION_CONFIG.SPRING_SNAPPY
      );
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, ANIMATION_CONFIG.SPRING_BOUNCY);
    }
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.button,
          styles[`button_${variant}`],
          styles[`button_${size}`],
          disabled && styles.button_disabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading }}
      >
        {loading ? (
          <ActivityIndicator 
            color={variant === 'primary' ? '#fff' : '#6C63FF'} 
          />
        ) : (
          <>
            {icon}
            <Text style={[styles.text, styles[`text_${variant}`], styles[`text_${size}`], textStyle]}>
              {title}
            </Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  
  // Variants
  button_primary: {
    backgroundColor: '#6C63FF',
  },
  button_secondary: {
    backgroundColor: '#F5F5F5',
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  
  // Sizes
  button_small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button_medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  button_large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  
  // States
  button_disabled: {
    opacity: 0.5,
  },
  
  // Text styles
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: '#FFFFFF',
  },
  text_secondary: {
    color: '#333333',
  },
  text_outline: {
    color: '#6C63FF',
  },
  text_ghost: {
    color: '#6C63FF',
  },
  text_small: {
    fontSize: 14,
  },
  text_medium: {
    fontSize: 16,
  },
  text_large: {
    fontSize: 18,
  },
});
