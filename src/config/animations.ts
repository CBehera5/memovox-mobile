// src/config/animations.ts
/**
 * Centralized animation configuration for MemoVox
 * Supports both React Native Animated API and Reanimated
 */

export const ANIMATION_CONFIG = {
  // Spring configurations (Reanimated)
  SPRING_BOUNCY: {
    damping: 10,
    stiffness: 100,
    mass: 0.8,
  },
  SPRING_SMOOTH: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  SPRING_SNAPPY: {
    damping: 20,
    stiffness: 300,
    mass: 0.5,
  },
  SPRING_GENTLE: {
    damping: 25,
    stiffness: 120,
    mass: 1.2,
  },
  
  // Timing durations (milliseconds)
  TIMING_INSTANT: 100,
  TIMING_FAST: 150,
  TIMING_NORMAL: 300,
  TIMING_SLOW: 500,
  TIMING_VERY_SLOW: 800,
  
  // List animation delays
  LIST_ITEM_DELAY: 50, // ms between each item
  
  // Gesture thresholds
  SWIPE_THRESHOLD: 100, // px to trigger swipe action
  LONG_PRESS_DURATION: 500, // ms for long press
  
  // Scale values
  PRESS_SCALE: 0.95,
  HOVER_SCALE: 1.05,
  ACTIVE_SCALE: 0.98,
  
  // Rotation values
  SHAKE_ROTATION: 5, // degrees
  FLIP_ROTATION: 180, // degrees
  
  // Enable/disable animations globally
  ANIMATIONS_ENABLED: true,
  
  // Reduce motion (accessibility)
  REDUCE_MOTION: false,
};

/**
 * Get animation config based on accessibility settings
 */
export function getAnimationConfig() {
  if (ANIMATION_CONFIG.REDUCE_MOTION) {
    return {
      ...ANIMATION_CONFIG,
      TIMING_FAST: 0,
      TIMING_NORMAL: 0,
      TIMING_SLOW: 0,
      LIST_ITEM_DELAY: 0,
    };
  }
  return ANIMATION_CONFIG;
}

/**
 * Easing functions for Reanimated
 */
export const EASING = {
  EASE_OUT: 'easeOutCubic',
  EASE_IN: 'easeInCubic',
  EASE_IN_OUT: 'easeInOutCubic',
  EASE_OUT_BACK: 'easeOutBack',
  EASE_IN_OUT_BACK: 'easeInOutBack',
  LINEAR: 'linear',
} as const;

/**
 * Animation presets for common use cases
 */
export const ANIMATION_PRESETS = {
  // Button press
  BUTTON_PRESS: {
    scale: ANIMATION_CONFIG.PRESS_SCALE,
    duration: ANIMATION_CONFIG.TIMING_FAST,
    spring: ANIMATION_CONFIG.SPRING_SNAPPY,
  },
  
  // List item entrance
  LIST_ENTER: {
    duration: ANIMATION_CONFIG.TIMING_NORMAL,
    delay: ANIMATION_CONFIG.LIST_ITEM_DELAY,
    spring: ANIMATION_CONFIG.SPRING_SMOOTH,
  },
  
  // Modal presentation
  MODAL: {
    duration: ANIMATION_CONFIG.TIMING_NORMAL,
    spring: ANIMATION_CONFIG.SPRING_SMOOTH,
  },
  
  // Swipe actions
  SWIPE: {
    threshold: ANIMATION_CONFIG.SWIPE_THRESHOLD,
    spring: ANIMATION_CONFIG.SPRING_BOUNCY,
  },
  
  // Card flip
  FLIP: {
    duration: ANIMATION_CONFIG.TIMING_NORMAL,
    rotation: ANIMATION_CONFIG.FLIP_ROTATION,
  },
};

export default ANIMATION_CONFIG;
