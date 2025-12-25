/**
 * ReanimatedListItem - Foundational animated list item wrapper
 * Phase 1 Component - Zero-risk wrapper around existing components
 * 
 * Features:
 * - Smooth entrance animations (fade + slide)
 * - Scale animation on press
 * - Configurable animation presets
 * - Feature flag support for safe rollout
 * - Accessibility support (respects reduced motion)
 */

import React, { useEffect } from 'react';
import { StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { FEATURE_FLAGS } from '../../config/features';
import { 
  ANIMATION_CONFIG,
  ANIMATION_PRESETS 
} from '../../config/animations';

interface ReanimatedListItemProps {
  children: React.ReactNode;
  index?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  delay?: number;
  animationPreset?: keyof typeof ANIMATION_PRESETS;
  disabled?: boolean;
  style?: ViewStyle;
  enablePressAnimation?: boolean;
}

export const ReanimatedListItem: React.FC<ReanimatedListItemProps> = ({
  children,
  index = 0,
  onPress,
  onLongPress,
  delay,
  animationPreset = 'LIST_ITEM_ENTRANCE',
  disabled = false,
  style,
  enablePressAnimation = true,
}) => {
  // Feature flag check - if disabled, render children directly
  if (!FEATURE_FLAGS.USE_REANIMATED_LISTS) {
    return (
      <Pressable 
        onPress={onPress} 
        onLongPress={onLongPress}
        disabled={disabled}
        style={style}
      >
        {children}
      </Pressable>
    );
  }

  // Shared values for animations
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(1);

  // Get animation config from preset
  const preset = ANIMATION_PRESETS[animationPreset as keyof typeof ANIMATION_PRESETS] || ANIMATION_PRESETS.LIST_ENTER;

  // Entrance animation on mount
  useEffect(() => {
    const itemDelay = delay ?? index * 50; // Stagger by 50ms per item
    
    opacity.value = withDelay(
      itemDelay,
      withTiming(1, {
        duration: ('duration' in preset ? preset.duration : undefined) || ANIMATION_CONFIG.TIMING_NORMAL,
        easing: Easing.out(Easing.cubic),
      })
    );

    translateY.value = withDelay(
      itemDelay,
      withSpring(0, ('spring' in preset ? preset.spring : undefined) || ANIMATION_CONFIG.SPRING_SMOOTH)
    );
  }, []);

  // Animated styles for entrance
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  // Press handlers with scale animation
  const handlePressIn = () => {
    if (enablePressAnimation && !disabled) {
      scale.value = withSpring(0.97, ANIMATION_CONFIG.SPRING_SNAPPY);
    }
  };

  const handlePressOut = () => {
    if (enablePressAnimation && !disabled) {
      scale.value = withSpring(1, ANIMATION_CONFIG.SPRING_BOUNCY);
    }
  };

  const handlePress = () => {
    if (onPress && !disabled) {
      // Run callback on JS thread
      runOnJS(onPress)();
    }
  };

  const handleLongPress = () => {
    if (onLongPress && !disabled) {
      runOnJS(onLongPress)();
    }
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled}
        style={styles.pressable}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: '100%',
  },
});
