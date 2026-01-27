
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface HealthPlanningTemplateProps {
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

const HealthPlanningTemplate: React.FC<HealthPlanningTemplateProps> = ({ onSave, onCancel }) => {
  const [todos, setTodos] = useState(['', '', '']);
  const [morningRoutine, setMorningRoutine] = useState([
    { id: '1', label: 'Meditation', checked: false },
    { id: '2', label: 'Breakfast', checked: false },
    { id: '3', label: 'Vitamins', checked: false },
  ]);
  const [waterCount, setWaterCount] = useState(0);
  const [gratitude, setGratitude] = useState(['', '']);
  const [mood, setMood] = useState<string | null>(null);
  const [productivity, setProductivity] = useState(0);
  const [sleepHours, setSleepHours] = useState<string | null>(null);

  const MOODS = [
    { id: 'great', color: '#FF6B6B', label: 'Great' },
    { id: 'good', color: '#FFD93D', label: 'Good' },
    { id: 'neutral', color: '#6BCB77', label: 'Okay' },
    { id: 'bad', color: '#4D96FF', label: 'Low' },
  ];

  const handleTodoChange = (text: string, index: number) => {
    const newTodos = [...todos];
    newTodos[index] = text;
    setTodos(newTodos);
  };

  const toggleRoutine = (id: string) => {
    setMorningRoutine(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E0C3FC', '#8EC5FC']} // Pastel purple to blue
        style={styles.gradientBg}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>MY MENTAL HEALTH</Text>
              <Text style={styles.subtitle}>✨ tracking sheet ✨</Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* To-Do List Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
               <Text style={styles.cardTitle}>TO-DO list:</Text>
               <Ionicons name="leaf" size={24} color="#6BCB77" />
            </View>
            {todos.map((todo, index) => (
              <View key={index} style={styles.todoRow}>
                <TouchableOpacity style={styles.checkbox}>
                   {todo.length > 0 && <Ionicons name="square-outline" size={20} color={COLORS.gray[400]} />}
                </TouchableOpacity>
                <TextInput
                  style={styles.inputLine}
                  value={todo}
                  onChangeText={(text) => handleTodoChange(text, index)}
                  placeholder=".................................................................."
                  placeholderTextColor="rgba(0,0,0,0.1)"
                />
              </View>
            ))}
          </View>

          <View style={styles.row}>
            {/* Morning Routine (Visual Grid) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Morning Routine:</Text>
              <View style={styles.gridContainer}>
                {morningRoutine.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[styles.visualCard, item.checked && styles.visualCardSelected]}
                    onPress={() => toggleRoutine(item.id)}
                  >
                    <View style={[styles.iconCircle, item.checked && styles.iconCircleSelected]}>
                       <Ionicons 
                         name={item.label === 'Meditation' ? 'flower' : item.label === 'Breakfast' ? 'cafe' : 'fitness'} 
                         size={28} 
                         color={item.checked ? '#FFF' : '#667EEA'} 
                       />
                    </View>
                    <Text style={[styles.visualLabel, item.checked && styles.visualLabelSelected]}>{item.label}</Text>
                    {item.checked && (
                        <View style={styles.checkedBadge}>
                            <Ionicons name="checkmark" size={12} color="#FFF" />
                        </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Water Balance */}
            <View style={[styles.card, styles.halfCard]}>
              <Text style={styles.cardTitle}>Water Balance:</Text>
              <View style={styles.waterGrid}>
                {[...Array(9)].map((_, i) => (
                  <TouchableOpacity 
                    key={i} 
                    onPress={() => setWaterCount(i + 1)}
                    style={styles.waterCup}
                  >
                    <Ionicons 
                      name={i < waterCount ? "water" : "water-outline"} 
                      size={24} 
                      color="#4D96FF" 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Gratitude */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Things I am Grateful Today:</Text>
            <View style={styles.gratitudeRow}>
              <Text style={styles.sparkle}>✨</Text>
              <TextInput 
                style={styles.inputLine} 
                placeholder=".................................................................."
                placeholderTextColor="rgba(0,0,0,0.1)"
              />
            </View>
            <View style={styles.gratitudeRow}>
              <Text style={styles.sparkle}>✨</Text>
              <TextInput 
                style={styles.inputLine} 
                placeholder=".................................................................."
                placeholderTextColor="rgba(0,0,0,0.1)"
              />
            </View>
          </View>

          <View style={styles.row}>
             {/* Sleep */}
             <View style={[styles.card, styles.thirdCard]}>
               <Text style={styles.cardTitle}>Hours of Sleep:</Text>
               {['0-3', '4-6', '7-9', '10-12'].map(range => (
                 <TouchableOpacity 
                    key={range} 
                    onPress={() => setSleepHours(range)}
                    style={[styles.sleepOption, sleepHours === range && styles.sleepSelected]}
                 >
                   <Text style={[styles.sleepText, sleepHours === range && styles.sleepTextSelected]}>{range}</Text>
                 </TouchableOpacity>
               ))}
             </View>

             <View style={styles.twoThirdsCol}>
                {/* Productivity */}
                <View style={styles.card}>
                   <Text style={styles.cardTitle}>Productivity:</Text>
                   <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <TouchableOpacity key={star} onPress={() => setProductivity(star)}>
                           <Ionicons 
                             name={star <= productivity ? "star" : "star-outline"} 
                             size={28} 
                             color="#FFD93D" 
                           />
                        </TouchableOpacity>
                      ))}
                   </View>
                </View>

                {/* Mood */}
                <View style={styles.card}>
                   <Text style={styles.cardTitle}>My mood:</Text>
                   <View style={styles.moodRow}>
                      {MOODS.map(m => (
                        <TouchableOpacity 
                          key={m.id} 
                          onPress={() => setMood(m.id)}
                          style={[
                            styles.moodCircle, 
                            { backgroundColor: m.color },
                            mood === m.id && styles.moodSelected
                          ]}
                        />
                      ))}
                   </View>
                </View>
             </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={() => {
                const data = { todos, morningRoutine, waterCount, mood, productivity };
                onSave && onSave(data);
            }}
          >
            <Text style={styles.saveButtonText}>Save to Journal</Text>
          </TouchableOpacity>

        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBg: {
    flex: 1,
    paddingTop: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2D3436',
    letterSpacing: 1,
    fontFamily: 'System', // Use a custom font if available
  },
  subtitle: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: '600',
    marginTop: -5,
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  halfCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  thirdCard: {
    width: '35%',
    marginRight: 8,
  },
  twoThirdsCol: {
    flex: 1,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  inputLine: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    fontSize: 16,
    paddingVertical: 4,
    color: '#333',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  boxCheck: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DDD',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxChecked: {
    backgroundColor: '#8EC5FC',
    borderColor: '#8EC5FC',
  },
  checkLabel: {
    fontSize: 15,
    color: '#444',
  },
  waterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  waterCup: {
    padding: 2,
  },
  gratitudeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sparkle: {
    fontSize: 18,
    marginRight: 8,
  },
  sleepOption: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  sleepText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  sleepSelected: {
    backgroundColor: '#E0C3FC',
    borderRadius: 12,
  },
  sleepTextSelected: {
    color: '#FFF',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  moodCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  moodSelected: {
    borderWidth: 3,
    borderColor: '#333',
    transform: [{ scale: 1.2 }],
  },
  saveButton: {
    backgroundColor: '#2D3436',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Visual Grid Styles
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  visualCard: {
    width: '30%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  visualCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#667EEA',
  },
  iconCircle: {
     width: 48,
     height: 48,
     borderRadius: 24,
     backgroundColor: '#E0E7FF',
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: 8,
  },
  iconCircleSelected: {
     backgroundColor: '#667EEA',
  },
  visualLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  visualLabelSelected: {
    color: '#667EEA',
  },
  checkedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#667EEA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
});

export default HealthPlanningTemplate;
