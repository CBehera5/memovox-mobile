// src/config/features.ts
/**
 * Feature flags for MemoVox
 * Toggle features on/off without code changes
 */

export const FEATURE_FLAGS = {
  // Reanimated animations - TEMPORARILY DISABLED due to worklets compatibility issue
  USE_REANIMATED_LISTS: false,           // List item animations (Notes, Home)
  USE_REANIMATED_BUTTONS: false,         // Button press animations
  USE_REANIMATED_CARDS: false,           // Card animations
  USE_REANIMATED_MODALS: false,          // Modal transitions
  USE_REANIMATED_NAVIGATION: false,      // Screen transitions
  
  // Gesture features
  USE_GESTURE_SWIPE_ACTIONS: false,      // Swipe to delete/share
  USE_GESTURE_RECORDING: false,          // Hold to record (keep false - risky!)
  USE_GESTURE_DRAG_REORDER: false,       // Drag to reorder tasks
  
  // Advanced animations
  USE_SHARED_ELEMENT_TRANSITIONS: false, // Shared element between screens
  USE_PARALLAX_SCROLLING: false,         // Parallax header effects
  USE_LAYOUT_ANIMATIONS: false,          // Automatic layout transitions
  
  // Performance
  ENABLE_ANIMATION_MONITORING: __DEV__,  // Log animation performance
  REDUCE_ANIMATIONS_LOW_END: false,      // Reduce animations on slow devices
  
  // Experimental
  EXPERIMENTAL_FEATURES: false,          // Enable experimental animations
} as const;

/**
 * Get feature flag value with fallback
 */
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature] ?? false;
}

/**
 * Enable all Reanimated features (for testing)
 */
export function enableAllReanimatedFeatures() {
  if (__DEV__) {
    return {
      ...FEATURE_FLAGS,
      USE_REANIMATED_LISTS: true,
      USE_REANIMATED_BUTTONS: true,
      USE_REANIMATED_CARDS: true,
      USE_REANIMATED_MODALS: true,
    };
  }
  return FEATURE_FLAGS;
}

/**
 * Disable all animations (accessibility)
 */
export function disableAllAnimations() {
  return Object.fromEntries(
    Object.keys(FEATURE_FLAGS).map(key => [key, false])
  );
}

export default FEATURE_FLAGS;
