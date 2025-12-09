import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';

interface FlippableCardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  style?: ViewStyle;
  onFlip?: (isFlipped: boolean) => void;
  duration?: number;
}

export default function FlippableCard({
  frontContent,
  backContent,
  style,
  onFlip,
  duration = 600,
}: FlippableCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [flipAnim] = useState(new Animated.Value(0));

  const handleFlip = () => {
    const newFlipped = !isFlipped;
    setIsFlipped(newFlipped);
    
    Animated.timing(flipAnim, {
      toValue: newFlipped ? 1 : 0,
      duration,
      useNativeDriver: true,
    }).start();

    if (onFlip) {
      onFlip(newFlipped);
    }
  };

  // Interpolate rotation for flip effect
  const frontRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backRotation = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  // Interpolate opacity for smooth fade
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  // Perspective effect
  const perspective = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.95],
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleFlip}
      style={[styles.container, style]}
    >
      {/* Front side */}
      <Animated.View
        style={[
          styles.cardSide,
          {
            transform: [
              { rotateY: frontRotation },
              { scaleX: perspective },
            ],
            opacity: frontOpacity,
          },
        ]}
        pointerEvents={isFlipped ? 'none' : 'auto'}
      >
        {frontContent}
      </Animated.View>

      {/* Back side */}
      <Animated.View
        style={[
          styles.cardSide,
          styles.backSide,
          {
            transform: [
              { rotateY: backRotation },
              { scaleX: perspective },
            ],
            opacity: backOpacity,
          },
        ]}
        pointerEvents={isFlipped ? 'auto' : 'none'}
      >
        {backContent}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    // Perspective handled via transform
  },
  cardSide: {
    backfaceVisibility: 'hidden',
  },
  backSide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
