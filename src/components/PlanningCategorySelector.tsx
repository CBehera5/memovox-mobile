
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';

interface PlanningCategorySelectorProps {
  onSelectCategory: (category: string) => void;
  selectedCategory: string | null;
}

const CATEGORIES = [
  { id: 'Health', name: 'Health', icon: 'heart', colors: ['#FF416C', '#FF4B2B'], description: 'Track wellness' }, // Vibrant Red
  { id: 'Work', name: 'Work', icon: 'briefcase', colors: ['#4facfe', '#00f2fe'], description: 'Projects' }, // Vibrant Blue
  { id: 'Ideas', name: 'Ideas', icon: 'bulb', colors: ['#fa709a', '#fee140'], description: 'Brainstorm' }, // Pink/Yellow
  { id: 'Daily', name: 'Daily', icon: 'calendar', colors: ['#43e97b', '#38f9d7'], description: 'Day plan' }, // Green/Teal
];

const PlanningCategorySelector: React.FC<PlanningCategorySelectorProps> = ({ onSelectCategory, selectedCategory }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>What would you like to plan?</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity 
            key={cat.id} 
            onPress={() => onSelectCategory(cat.id)}
            style={[
                styles.cardContainer,
                selectedCategory === cat.id && styles.selectedCard
            ]}
          >
            <LinearGradient
              colors={cat.colors as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              <View style={styles.iconContainer}>
                 <Ionicons name={cat.icon as any} size={24} color="#FFF" />
              </View>
              <Text style={styles.cardTitle}>{cat.name}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 12,
  },
  cardContainer: {
    width: 80,
    height: 80, // Equal width/height for circle
    borderRadius: 40, // Half of width
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, // Slightly stronger shadow
    shadowRadius: 5,
    elevation: 5,
    transform: [{ scale: 1 }],
  },
  selectedCard: {
     transform: [{ scale: 1.05 }],
     borderColor: COLORS.primary,
     borderWidth: 3,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  iconContainer: {
    marginBottom: 4,
    // Removed background circle to make it cleaner on vibrant gradient
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardDesc: {
    display: 'none',
  },
});

export default PlanningCategorySelector;
