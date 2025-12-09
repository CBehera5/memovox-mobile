import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AuthService from '../src/services/AuthService';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const router = useRouter();
  const [dogPosition] = useState(new Animated.ValueXY({ x: 0, y: 0 }));
  const [dogDirection, setDogDirection] = useState<'left' | 'right'>('right');
  const [dogScale] = useState(new Animated.Value(1));
  const [tailRotation] = useState(new Animated.Value(0));
  const [bobbing] = useState(new Animated.Value(0));
  const [showButton, setShowButton] = useState(false);

  // Dog roaming animation
  useEffect(() => {
    const animateDog = () => {
      const randomX = Math.random() * (width - 100);
      const randomY = Math.random() * (height * 0.4);

      // Determine direction based on position
      if (randomX > width * 0.5) {
        setDogDirection('left');
      } else {
        setDogDirection('right');
      }

      Animated.sequence([
        // Move to random position
        Animated.timing(dogPosition, {
          toValue: { x: randomX, y: randomY },
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        // Pause
        Animated.delay(1000),
      ]).start(() => {
        animateDog(); // Loop animation
      });
    };

    animateDog();
  }, []);

  // Tail wagging animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(tailRotation, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(tailRotation, {
          toValue: -1,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(tailRotation, {
          toValue: 0,
          duration: 400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Bobbing animation (up and down)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bobbing, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(bobbing, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Show button after 1 second
  useEffect(() => {
    const timer = setTimeout(() => setShowButton(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const tailRotateZ = tailRotation.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-20deg', '0deg', '20deg'],
  });

  const bobValue = bobbing.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const handleGetStarted = () => {
    router.replace('/(auth)/login');
  };

  const handleDogTap = async () => {
    try {
      const isAuth = await AuthService.isAuthenticated();
      
      if (isAuth) {
        router.replace('/(tabs)/home');
      } else {
        handleGetStarted();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      handleGetStarted();
    }
  };

  return (
    <LinearGradient colors={['#667EEA', '#764BA2', '#F093FB']} style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>MemoVox</Text>
          <Text style={styles.subtitle}>Voice Memos Powered by AI</Text>
        </View>

        {/* Dog Animation Area */}
        <TouchableOpacity 
          style={styles.dogContainer}
          onPress={handleDogTap}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.dogWrapper,
              {
                transform: [
                  { translateX: dogPosition.x },
                  { translateY: dogPosition.y },
                  { scaleX: dogDirection === 'left' ? -1 : 1 },
                  { translateY: bobValue },
                ],
              },
            ]}
          >
            {/* Dog Body */}
            <View style={styles.dogBody}>
              {/* Head */}
              <View style={styles.dogHead}>
                {/* Ears */}
                <View style={[styles.ear, styles.earLeft]} />
                <View style={[styles.ear, styles.earRight]} />

                {/* Eyes */}
                <View style={styles.eyes}>
                  <View style={styles.eye} />
                  <View style={styles.eye} />
                </View>

                {/* Snout */}
                <View style={styles.snout}>
                  <View style={styles.nose} />
                </View>

                {/* Tongue */}
                <View style={styles.tongue} />
              </View>

              {/* Body */}
              <View style={styles.torso} />

              {/* Legs */}
              <View style={styles.legsContainer}>
                <View style={styles.leg} />
                <View style={styles.leg} />
                <View style={styles.leg} />
                <View style={styles.leg} />
              </View>

              {/* Tail */}
              <Animated.View
                style={[
                  styles.tail,
                  {
                    transform: [{ rotateZ: tailRotateZ }],
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* Paw prints effect */}
          <View style={styles.pawPrints}>
            {[...Array(3)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.pawPrint,
                  {
                    opacity: Animated.subtract(1, Animated.divide(dogPosition.x, width)),
                    left: dogPosition.x,
                    top: dogPosition.y,
                  },
                ]}
              >
                <Text style={styles.pawPrintText}>🐾</Text>
              </Animated.View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <FeatureItem icon="🎤" text="Record voice memos" />
          <FeatureItem icon="🤖" text="AI-powered analysis" />
          <FeatureItem icon="📱" text="Smart notifications" />
          <FeatureItem icon="☁️" text="Cloud storage" />
        </View>
      </View>

      {/* Get Started Button */}
      {showButton && (
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: new Animated.Value(1),
              transform: [
                {
                  translateY: new Animated.Value(0),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.button}
            onPress={handleDogTap}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
          <Text style={styles.bottomText}>Tap the dog to continue! 🐕</Text>
        </Animated.View>
      )}
    </LinearGradient>
  );
};

interface FeatureItemProps {
  icon: string;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  dogContainer: {
    width: width - 40,
    height: height * 0.35,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
    position: 'relative',
  },
  dogWrapper: {
    width: 120,
    height: 120,
  },
  dogBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  // Dog Head
  dogHead: {
    width: 50,
    height: 50,
    backgroundColor: '#D4A574',
    borderRadius: 25,
    position: 'absolute',
    top: 10,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B8935F',
  },
  ear: {
    width: 12,
    height: 25,
    backgroundColor: '#B8935F',
    borderRadius: 6,
    position: 'absolute',
    top: -10,
  },
  earLeft: {
    left: 10,
    transform: [{ rotate: '-20deg' }],
  },
  earRight: {
    right: 10,
    transform: [{ rotate: '20deg' }],
  },
  eyes: {
    flexDirection: 'row',
    gap: 12,
    position: 'absolute',
    top: 12,
  },
  eye: {
    width: 6,
    height: 8,
    backgroundColor: '#000',
    borderRadius: 3,
  },
  snout: {
    position: 'absolute',
    bottom: 8,
    width: 20,
    height: 15,
    backgroundColor: '#E6C8B4',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nose: {
    width: 6,
    height: 5,
    backgroundColor: '#000',
    borderRadius: 3,
  },
  tongue: {
    position: 'absolute',
    bottom: -5,
    width: 8,
    height: 6,
    backgroundColor: '#FF6B9D',
    borderRadius: 4,
  },
  // Dog Torso
  torso: {
    width: 60,
    height: 45,
    backgroundColor: '#D4A574',
    borderRadius: 20,
    position: 'absolute',
    top: 50,
    borderWidth: 2,
    borderColor: '#B8935F',
  },
  // Legs
  legsContainer: {
    position: 'absolute',
    top: 85,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 5,
  },
  leg: {
    width: 10,
    height: 25,
    backgroundColor: '#D4A574',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#B8935F',
  },
  // Tail
  tail: {
    position: 'absolute',
    right: -15,
    top: 65,
    width: 25,
    height: 12,
    backgroundColor: '#D4A574',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B8935F',
  },
  // Paw prints
  pawPrints: {
    position: 'absolute',
    bottom: 0,
  },
  pawPrint: {
    position: 'absolute',
    fontSize: 18,
    opacity: 0.3,
  },
  pawPrintText: {
    fontSize: 18,
  },
  // Features
  featuresContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  // Button
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 30,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667EEA',
  },
  bottomText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    fontStyle: 'italic',
  },
});

export default SplashScreen;
