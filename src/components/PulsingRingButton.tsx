import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

interface PulsingRingButtonProps {
  onPress: () => void;
  onPressOut?: () => void;
  isRecording?: boolean;
  size?: number;
  innerColor?: string;
  outerColor?: string;
  pulseColor?: string;
}

export default function PulsingRingButton({
  onPress,
  onPressOut,
  isRecording = false,
  size = 60,
  innerColor = '#FF5252',
  outerColor = 'rgba(255, 82, 82, 0.3)',
  pulseColor = 'rgba(255, 82, 82, 0.5)',
}: PulsingRingButtonProps) {
  const [scaleAnim] = useState(new Animated.Value(1));
  const [ring1Anim] = useState(new Animated.Value(0));
  const [ring2Anim] = useState(new Animated.Value(0));
  const [ring3Anim] = useState(new Animated.Value(0));
  const [depthAnim] = useState(new Animated.Value(0));
  const recordingAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Pulsing rings animation when recording
  useEffect(() => {
    if (!isRecording) {
      if (recordingAnimRef.current) {
        recordingAnimRef.current.stop();
      }
      return;
    }

    recordingAnimRef.current = Animated.loop(
      Animated.parallel([
        // Ring 1 - expands quickly then fades
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring1Anim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ring1Anim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Ring 2 - 333ms delay
        Animated.sequence([
          Animated.delay(333),
          Animated.parallel([
            Animated.timing(ring2Anim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ring2Anim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Ring 3 - 666ms delay
        Animated.sequence([
          Animated.delay(666),
          Animated.parallel([
            Animated.timing(ring3Anim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ring3Anim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
      ]),
      {
        iterations: -1,
      }
    );

    recordingAnimRef.current.start();

    return () => {
      if (recordingAnimRef.current) {
        recordingAnimRef.current.stop();
      }
    };
  }, [isRecording, ring1Anim, ring2Anim, ring3Anim]);

  const handlePressIn = () => {
    // Add pressure effect
    Animated.timing(depthAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();

    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    // Release pressure
    Animated.parallel([
      Animated.timing(depthAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (onPressOut) {
      onPressOut();
    }
  };

  // Ring scale and opacity interpolations
  const ring1Scale = ring1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const ring2Scale = ring2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const ring3Scale = ring3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.5],
  });

  const ring1Opacity = ring1Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.6, 0],
  });

  const ring2Opacity = ring2Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.6, 0],
  });

  const ring3Opacity = ring3Anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.6, 0],
  });

  // Depth shadow effect
  const shadowOpacity = depthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const shadowRadius = depthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });

  return (
    <View style={styles.container}>
      {/* Outer rings container */}
      <View
        style={[
          styles.ringsContainer,
          {
            width: size * 2.5,
            height: size * 2.5,
          },
        ]}
      >
        {/* Ring 1 */}
        {isRecording && (
          <Animated.View
            style={[
              styles.ring,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: pulseColor,
                opacity: ring1Opacity,
                transform: [{ scale: ring1Scale }],
              },
            ]}
          />
        )}

        {/* Ring 2 */}
        {isRecording && (
          <Animated.View
            style={[
              styles.ring,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: pulseColor,
                opacity: ring2Opacity,
                transform: [{ scale: ring2Scale }],
              },
            ]}
          />
        )}

        {/* Ring 3 */}
        {isRecording && (
          <Animated.View
            style={[
              styles.ring,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: pulseColor,
                opacity: ring3Opacity,
                transform: [{ scale: ring3Scale }],
              },
            ]}
          />
        )}
      </View>

      {/* Main button with depth and scale */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [{ scale: scaleAnim }],
            shadowOpacity,
            shadowRadius,
          },
        ]}
      >
        {/* Background gradient effect with depth */}
        <View
          style={[
            styles.buttonBackground,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: outerColor,
            },
          ]}
        />

        {/* Main button */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: innerColor,
            },
          ]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          {/* Microphone icon or recording indicator */}
          <View style={styles.iconContainer}>
            {isRecording && (
              <View
                style={[
                  styles.recordingDot,
                  {
                    backgroundColor: '#fff',
                  },
                ]}
              />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringsContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  buttonWrapper: {
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  buttonBackground: {
    position: 'absolute',
    opacity: 0.3,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
