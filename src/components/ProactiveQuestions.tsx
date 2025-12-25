// src/components/ProactiveQuestions.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

interface ProactiveQuestionsProps {
  questions: string[];
  onQuestionPress: (question: string) => void;
  loading?: boolean;
}

export default function ProactiveQuestions({ 
  questions, 
  onQuestionPress,
  loading 
}: ProactiveQuestionsProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>💭 Thinking of helpful questions...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💡 Questions to help you:</Text>
      <View style={styles.questionsContainer}>
        {questions.map((question, index) => (
          <TouchableOpacity
            key={index}
            style={styles.questionChip}
            onPress={() => onQuestionPress(question)}
          >
            <Text style={styles.questionText}>{question}</Text>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A1B9A',
    marginBottom: 12,
  },
  questionsContainer: {
    gap: 8,
  },
  questionChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CE93D8',
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
    marginRight: 8,
  },
  arrow: {
    fontSize: 16,
    color: '#9C27B0',
    fontWeight: 'bold',
  },
});
