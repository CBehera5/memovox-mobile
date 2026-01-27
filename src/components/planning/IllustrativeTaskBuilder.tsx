/**
 * IllustrativeTaskBuilder
 * Visual task selection UI with icons/images like a tracking sheet
 * Shows after questionnaire is complete
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TaskItem {
  id: string;
  title: string;
  icon: string;
  checked: boolean;
  editable?: boolean;
}

interface IllustrativeTaskBuilderProps {
  visible: boolean;
  category: string;
  categoryColor: string;
  suggestedTasks: { title: string; icon: string }[];
  answers: Record<string, any>;
  onClose: () => void;
  onSave: (tasks: TaskItem[], trackerData: Record<string, any>) => void;
}

export default function IllustrativeTaskBuilder({
  visible,
  category,
  categoryColor,
  suggestedTasks,
  answers,
  onClose,
  onSave,
}: IllustrativeTaskBuilderProps) {
  // Initialize tasks from suggestions
  const [tasks, setTasks] = useState<TaskItem[]>(() => 
    suggestedTasks.map((t, i) => ({
      id: `task_${i}`,
      title: t.title,
      icon: t.icon,
      checked: true,
    }))
  );
  
  // Custom task input
  const [customTask, setCustomTask] = useState('');
  
  // Tracker states
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [sleepHours, setSleepHours] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [productivity, setProductivity] = useState(0);
  const [gratitude, setGratitude] = useState('');

  // Refesh tasks when modal opens
  React.useEffect(() => {
    if (visible) {
      setTasks(suggestedTasks.map((t, i) => ({
        id: `task_${i}`,
        title: t.title,
        icon: t.icon,
        checked: true,
      })));
      setWaterGlasses(0);
      setSleepHours(null);
      setMood(null);
      setProductivity(0);
      setGratitude('');
      setCustomTask('');
    }
  }, [visible, suggestedTasks]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, checked: !t.checked } : t
    ));
  };

  const addCustomTask = () => {
    if (customTask.trim()) {
      setTasks(prev => [...prev, {
        id: `custom_${Date.now()}`,
        title: customTask.trim(),
        icon: '✓',
        checked: true,
        editable: true,
      }]);
      setCustomTask('');
    }
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleSave = () => {
    const selectedTasks = tasks.filter(t => t.checked);
    const trackerData = {
      waterGlasses,
      sleepHours,
      mood,
      productivity,
      gratitude,
    };
    onSave(selectedTasks, trackerData);
  };

  const WATER_GLASSES_MAX = 8;
  const SLEEP_OPTIONS = ['0-3', '4-6', '7-9', '10-12'];
  const MOOD_OPTIONS = [
    { emoji: '😢', color: '#EF4444' },
    { emoji: '😕', color: '#F97316' },
    { emoji: '😐', color: '#FBBF24' },
    { emoji: '😊', color: '#22C55E' },
    { emoji: '🤩', color: '#06B6D4' },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient
        colors={['#E0E7FF', '#F5F3FF', '#FCE7F3']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My {category} Plan</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title Section */}
          <View style={styles.titleCard}>
            <Text style={styles.mainTitle}>MY {category.toUpperCase()}</Text>
            <Text style={styles.subtitle}>✨ tracking sheet ✨</Text>
          </View>

          {/* TO-DO List Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TO-DO list:</Text>
              <Text style={styles.illustration}>🌻</Text>
            </View>
            
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskRow}
                onPress={() => toggleTask(task.id)}
              >
                <View style={[
                  styles.checkbox,
                  task.checked && { backgroundColor: categoryColor, borderColor: categoryColor },
                ]}>
                  {task.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.taskIcon}>{task.icon}</Text>
                <Text style={[
                  styles.taskText,
                  task.checked && styles.taskTextChecked,
                ]}>
                  {task.title}
                </Text>
                {task.editable && (
                  <TouchableOpacity onPress={() => removeTask(task.id)}>
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
            
            {/* Add Custom Task */}
            <View style={styles.addTaskRow}>
              <View style={styles.checkbox} />
              <TextInput
                style={styles.addTaskInput}
                value={customTask}
                onChangeText={setCustomTask}
                placeholder="Add your own task..."
                placeholderTextColor="#9CA3AF"
                onSubmitEditing={addCustomTask}
                returnKeyType="done"
              />
              {customTask.length > 0 && (
                <TouchableOpacity onPress={addCustomTask}>
                  <Ionicons name="add-circle" size={24} color={categoryColor} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Morning Routine & Water Balance Row */}
          {category.toLowerCase() === 'health' && (
            <View style={styles.twoColumnRow}>
              {/* Morning Routine */}
              <View style={[styles.miniSection, { flex: 1 }]}>
                <Text style={styles.miniTitle}>Morning Routine:</Text>
                <View style={styles.miniCheckbox}>
                  <TouchableOpacity style={styles.checkItem}>
                    <View style={styles.smallCheckbox} />
                    <Text style={styles.checkItemText}>Meditation</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.checkItem}>
                    <View style={styles.smallCheckbox} />
                    <Text style={styles.checkItemText}>Breakfast</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.checkItem}>
                    <View style={styles.smallCheckbox} />
                    <Text style={styles.checkItemText}>Vitamins</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.floatingEmoji}>🧘</Text>
              </View>

              {/* Water Balance */}
              <View style={[styles.miniSection, { flex: 1 }]}>
                <View style={styles.waterHeader}>
                  <Text style={styles.miniTitle}>Water Balance:</Text>
                  <Text style={styles.waterIllustration}>💧</Text>
                </View>
                <View style={styles.waterGrid}>
                  {Array.from({ length: WATER_GLASSES_MAX }).map((_, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.waterGlass}
                      onPress={() => setWaterGlasses(i + 1)}
                    >
                      <Text style={[
                        styles.glassIcon,
                        i < waterGlasses && styles.glassIconFilled,
                      ]}>
                        🥛
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Gratitude Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Things I am Grateful Today:</Text>
              <Text style={styles.illustration}>🙏</Text>
            </View>
            <TextInput
              style={styles.gratitudeInput}
              value={gratitude}
              onChangeText={setGratitude}
              placeholder="Write what you're grateful for..."
              placeholderTextColor="#9CA3AF"
              multiline
            />
          </View>

          {/* Sleep & Productivity Row */}
          <View style={styles.twoColumnRow}>
            {/* Hours of Sleep */}
            <View style={[styles.miniSection, { flex: 0.4 }]}>
              <Text style={styles.miniTitle}>Hours of Sleep:</Text>
              <View style={styles.sleepOptions}>
                {SLEEP_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.sleepOption,
                      sleepHours === option && { backgroundColor: categoryColor },
                    ]}
                    onPress={() => setSleepHours(option)}
                  >
                    <Text style={[
                      styles.sleepOptionText,
                      sleepHours === option && { color: '#fff' },
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Productivity */}
            <View style={[styles.miniSection, { flex: 0.6 }]}>
              <Text style={styles.miniTitle}>Productivity:</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setProductivity(star)}
                  >
                    <Text style={styles.star}>
                      {star <= productivity ? '⭐' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Mood Section */}
          <View style={styles.moodSection}>
            <Text style={styles.moodTitle}>My mood:</Text>
            <View style={styles.moodRow}>
              {MOOD_OPTIONS.map((m, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.moodCircle,
                    { backgroundColor: m.color },
                    mood === m.emoji && styles.moodSelected,
                  ]}
                  onPress={() => setMood(m.emoji)}
                >
                  <Text style={styles.moodEmoji}>{m.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: categoryColor }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save My Plan</Text>
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  titleCard: {
    backgroundColor: '#8B5CF6',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    fontStyle: 'italic',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  illustration: {
    fontSize: 40,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIcon: {
    fontSize: 18,
  },
  taskText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  taskTextChecked: {
    color: '#6B7280',
  },
  addTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  addTaskInput: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  miniSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  miniTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  miniCheckbox: {
    gap: 6,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  checkItemText: {
    fontSize: 13,
    color: '#4B5563',
  },
  floatingEmoji: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    fontSize: 28,
    opacity: 0.7,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  waterIllustration: {
    fontSize: 24,
  },
  waterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  waterGlass: {
    padding: 4,
  },
  glassIcon: {
    fontSize: 20,
    opacity: 0.3,
  },
  glassIconFilled: {
    opacity: 1,
  },
  gratitudeInput: {
    fontSize: 15,
    color: '#374151',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sleepOptions: {
    gap: 4,
  },
  sleepOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  sleepOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  starRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  star: {
    fontSize: 28,
  },
  moodSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  moodTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  moodCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moodSelected: {
    transform: [{ scale: 1.15 }],
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  moodEmoji: {
    fontSize: 22,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 30,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
