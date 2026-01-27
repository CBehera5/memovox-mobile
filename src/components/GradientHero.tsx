import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const GradientHero: React.FC = () => {
  return (
    <LinearGradient
      colors={['#4facfe', '#00f2fe']} // Vibrant Blue-Cyan gradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.textContainer}>
        <Text style={styles.title}>Your AI-Personal</Text>
        <Text style={styles.subtitle}>Assistant</Text>
        <View style={styles.tag}>
            <Text style={styles.tagText}>Ai-Powered</Text>
        </View>
      </View>
      
      <View style={styles.imageContainer}>
          {/* Placeholder for 3D illustration */}
          <Ionicons name="chatbubbles-outline" size={80} color="rgba(255,255,255,0.8)" />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    marginHorizontal: 16,
    height: 180,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
  },
  subtitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  tagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  imageContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default GradientHero;
