import React, { useState, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface AnimatedActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  backgroundColor?: string;
  testID?: string;
  enable3D?: boolean;
}

export default function AnimatedActionButton({
  icon,
  label,
  onPress,
  backgroundColor = '#007AFF',
  testID,
  enable3D = true,
}: AnimatedActionButtonProps) {
  const [scaleAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));
  const [glowAnim] = useState(new Animated.Value(0));
  const [floatAnim] = useState(new Animated.Value(0));
  const [shadowAnim] = useState(new Animated.Value(0));
  const [showTooltip, setShowTooltip] = useState(false);
  const floatAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Continuous float animation (subtle)
  useEffect(() => {
    if (!enable3D) return;
    
    floatAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    
    floatAnimRef.current.start();

    return () => {
      if (floatAnimRef.current) {
        floatAnimRef.current.stop();
      }
    };
  }, [enable3D, floatAnim]);

  const handlePress = () => {
    if (enable3D) {
      // 3D Flip animation
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Scale with more intensity
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow effect
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Shadow depth effect
      Animated.sequence([
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(shadowAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fallback to simple scale animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Don't show tooltip - removed as per user request
    // setShowTooltip(true);
    // setTimeout(() => setShowTooltip(false), 1500);

    // Execute the action
    onPress();
  };

  // Rotate interpolation for 3D flip effect
  const rotateX = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      enable3D ? { rotateX } : { rotateX: '0deg' },
      enable3D ? { translateY: floatAnim } : { translateY: 0 },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          animatedStyle,
          {
            shadowOpacity: shadowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.6],
            }),
            shadowRadius: shadowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 12],
            }),
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, { backgroundColor }]}
          onPress={handlePress}
          activeOpacity={0.8}
          testID={testID}
        >
          {/* Glow effect background */}
          {enable3D && (
            <Animated.View
              style={[
                styles.glowBackground,
                {
                  backgroundColor,
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.4],
                  }),
                  transform: [
                    {
                      scale: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.5],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
          <Text style={styles.icon}>{icon}</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Tooltip */}
      {showTooltip && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{label}</Text>
          <View style={styles.tooltipArrow} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  glowBackground: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  icon: {
    fontSize: 20,
    lineHeight: 20,
    zIndex: 1,
  },
  tooltip: {
    position: 'absolute',
    top: -40,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 'auto',
  },
  tooltipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -5,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(0, 0, 0, 0.9)',
  },
});
