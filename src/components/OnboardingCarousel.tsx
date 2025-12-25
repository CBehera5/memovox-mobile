// src/components/OnboardingCarousel.tsx

import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { OnboardingCard, OnboardingCardData } from './OnboardingCard';
import { COLORS } from '../constants';

const { width } = Dimensions.get('window');

interface OnboardingCarouselProps {
  onComplete: () => void;
  onSkip: () => void;
}

const ONBOARDING_DATA: OnboardingCardData[] = [
  {
    id: 1,
    title: 'Your Voice, Organized 🎤',
    subtitle: 'Speak naturally, we handle the rest.\nVoice memos that actually help you get things done.',
    mainIcon: '🎤',
  },
  {
    id: 2,
    title: 'Intelligence in Every Word 🧠',
    subtitle: 'AI-powered voice memo management',
    features: [
      {
        icon: '🎯',
        title: 'Smart Categories',
        description: 'Auto-sorts Personal, Work, Shopping',
      },
      {
        icon: '✅',
        title: 'Instant Tasks',
        description: 'Extracts action items automatically',
      },
      {
        icon: '👥',
        title: 'Group Planning',
        description: 'Coordinate with your team',
      },
      {
        icon: '🌍',
        title: '9 Languages',
        description: 'Speak your native language',
      },
    ],
  },
  {
    id: 3,
    title: 'Just Speak. We\'ll Organize. ✨',
    subtitle: 'No typing. No manual organizing.\nJust tap, speak, and let AI do the work.',
    mainIcon: '🚀',
  },
];

export const OnboardingCarousel: React.FC<OnboardingCarouselProps> = ({
  onComplete,
  onSkip,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(contentOffsetX / width);
    setCurrentPage(pageIndex);
  };

  const handleNext = () => {
    if (currentPage < ONBOARDING_DATA.length - 1) {
      const nextPage = currentPage + 1;
      scrollViewRef.current?.scrollTo({
        x: nextPage * width,
        animated: true,
      });
      setCurrentPage(nextPage);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {ONBOARDING_DATA.map((card) => (
          <OnboardingCard key={card.id} card={card} />
        ))}
      </ScrollView>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {ONBOARDING_DATA.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentPage === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        {/* Next/Get Started Button */}
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {currentPage === ONBOARDING_DATA.length - 1
              ? 'Start Recording 🚀'
              : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 40 : 30,
    paddingTop: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: COLORS.white,
    width: 24,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  nextButton: {
    backgroundColor: COLORS.white,
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
