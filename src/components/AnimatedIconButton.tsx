// src/components/AnimatedIconButton.tsx
import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, Animated, StyleSheet, ViewStyle } from 'react-native';

interface AnimatedIconButtonProps {
  icon: string;
  onPress: () => void;
  style?: ViewStyle;
  delay?: number;
}

export default function AnimatedIconButton({ 
  icon, 
  onPress, 
  style,
  delay = 0 
}: AnimatedIconButtonProps) {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fast bounce animation
    const bounce = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 2,
        tension: 180,
        useNativeDriver: true,
      }),
    ]);

    // Loop the animation
    Animated.loop(
      Animated.sequence([
        bounce,
        Animated.delay(2000),
        Animated.spring(bounceAnim, {
          toValue: 0,
          friction: 2,
          tension: 180,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ])
    ).start();
  }, [delay]);

  const scale = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
  });

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -10, 0],
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.button,
          style,
          {
            transform: [{ scale }, { translateY }],
          },
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
});
