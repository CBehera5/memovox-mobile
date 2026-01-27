
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface WorkPlanningTemplateProps {
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

const WorkPlanningTemplate: React.FC<WorkPlanningTemplateProps> = ({ onSave, onCancel }) => {
  const [todos, setTodos] = useState(['', '', '']);
  const [focusMode, setFocusMode] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<string | null>(null);
  const [soundscape, setSoundscape] = useState<string | null>(null);

  const FOCUS_MODES = [
    { id: 'deep', label: 'Deep Work', icon: 'flash', color: '#6366F1' },
    { id: 'meeting', label: 'Meetings', icon: 'people', color: '#EC4899' },
    { id: 'admin', label: 'Admin', icon: 'file-tray-full', color: '#10B981' },
    { id: 'creative', label: 'Creative', icon: 'color-palette', color: '#F59E0B' },
  ];

  const ENVIRONMENTS = [
    { id: 'office', label: 'Office', icon: 'business' },
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'cafe', label: 'Cafe', icon: 'cafe' },
  ];

  const handleTodoChange = (text: string, index: number) => {
    const newTodos = [...todos];
    newTodos[index] = text;
    setTodos(newTodos);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E0E7FF', '#C7D2FE']} // Indigo/Blue tint
        style={styles.gradientBg}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>WORK MODE</Text>
              <Text style={styles.subtitle}>rocket fuel for ideas 🚀</Text>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Focus Mode Selection (Visual Grid) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Focus Mode:</Text>
            <View style={styles.gridContainer}>
              {FOCUS_MODES.map((item) => (
                <TouchableOpacity 
                  key={item.id} 
                  style={[styles.visualCard, focusMode === item.id && styles.visualCardSelected]}
                  onPress={() => setFocusMode(item.id)}
                >
                  <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }, focusMode === item.id && { backgroundColor: item.color }]}>
                     <Ionicons 
                       name={item.icon as any} 
                       size={24} 
                       color={focusMode === item.id ? '#FFF' : item.color} 
                     />
                  </View>
                  <Text style={[styles.visualLabel, focusMode === item.id && { color: item.color }]}>{item.label}</Text>
                  {focusMode === item.id && (
                      <View style={[styles.checkedBadge, { backgroundColor: item.color }]}>
                          <Ionicons name="checkmark" size={12} color="#FFF" />
                      </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Priorities / To-Do */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
               <Text style={styles.cardTitle}>Top Priorities:</Text>
               <Ionicons name="flash" size={24} color="#F59E0B" />
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
                  placeholder="What needs to get done?"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                />
              </View>
            ))}
          </View>

          {/* Environment & Sound */}
          <View style={styles.row}>
             <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.cardTitle}>Environment:</Text>
                {ENVIRONMENTS.map((env) => (
                   <TouchableOpacity
                     key={env.id}
                     style={[styles.pillOption, environment === env.id && styles.pillSelected]}
                     onPress={() => setEnvironment(env.id)}
                   >
                      <Ionicons name={env.icon as any} size={16} color={environment === env.id ? '#FFF' : '#666'} style={{marginRight: 8}} />
                      <Text style={[styles.pillText, environment === env.id && styles.pillTextSelected]}>{env.label}</Text>
                   </TouchableOpacity>
                ))}
             </View>

             <View style={[styles.card, styles.halfCard]}>
                <Text style={styles.cardTitle}>Soundscape:</Text>
                {['Lo-Fi', 'Classical', 'Silence'].map((sound) => (
                   <TouchableOpacity
                     key={sound}
                     style={[styles.pillOption, soundscape === sound && styles.pillSelected]}
                     onPress={() => setSoundscape(sound)}
                   >
                     <Text style={[styles.pillText, soundscape === sound && styles.pillTextSelected]}>{sound}</Text>
                   </TouchableOpacity>
                ))}
             </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={() => {
                const data = { todos, focusMode, environment, soundscape };
                onSave && onSave(data);
            }}
          >
            <Text style={styles.saveButtonText}>Start Working</Text>
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
    color: '#1E1B4B',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: '#4338CA',
    fontWeight: '500',
    marginTop: -5,
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.1)',
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
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 8,
  },
  checkbox: {
    marginRight: 8,
  },
  inputLine: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4338CA',
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
  // Visual Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  visualCard: {
    width: '48%', // 2 per row
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  visualCardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  iconCircle: {
     width: 48,
     height: 48,
     borderRadius: 24,
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: 8,
  },
  visualLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
  },
  checkedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  // Pills
  pillOption: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      marginBottom: 8,
  },
  pillSelected: {
      backgroundColor: '#4338CA',
  },
  pillText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#4B5563',
  },
  pillTextSelected: {
      color: '#FFF',
  },
});

export default WorkPlanningTemplate;
