/**
 * SmartPlanningModal
 * Jeetu asks smart questions when user clicks a planning category
 * After questions, shows IllustrativeTaskBuilder
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getCategoryQuestions, PlanningQuestion, CategoryQuestions } from '../../config/planningQuestions';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SmartPlanningModalProps {
  visible: boolean;
  category: string;
  onClose: () => void;
  onComplete: (answers: Record<string, any>) => void;
}

export default function SmartPlanningModal({
  visible,
  category,
  onClose,
  onComplete,
}: SmartPlanningModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [categoryConfig, setCategoryConfig] = useState<CategoryQuestions | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [numberValue, setNumberValue] = useState('');
  const [textValue, setTextValue] = useState('');

  useEffect(() => {
    if (visible && category) {
      const config = getCategoryQuestions(category);
      setCategoryConfig(config);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setNumberValue('');
      setTextValue('');
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, category]);

  if (!categoryConfig) return null;

  const currentQuestion = categoryConfig.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === categoryConfig.questions.length - 1;
  const progress = (currentQuestionIndex + 1) / categoryConfig.questions.length;

  const handleChipSelect = (option: string) => {
    const questionId = currentQuestion.id;
    const currentAnswer = answers[questionId];
    
    // For multi-select questions (like 'focus'), toggle selection
    if (currentQuestion.id === 'focus' || currentQuestion.id === 'interests') {
      const currentArray = Array.isArray(currentAnswer) ? currentAnswer : [];
      const newArray = currentArray.includes(option)
        ? currentArray.filter(o => o !== option)
        : [...currentArray, option];
      setAnswers({ ...answers, [questionId]: newArray });
    } else {
      // Single select
      setAnswers({ ...answers, [questionId]: option });
      // Auto-advance for single select
      setTimeout(() => handleNext(), 300);
    }
  };

  const handleNext = () => {
    // Save number/text values
    if (currentQuestion.type === 'number' && numberValue) {
      setAnswers({ ...answers, [currentQuestion.id]: parseInt(numberValue) });
    } else if (currentQuestion.type === 'text' && textValue) {
      setAnswers({ ...answers, [currentQuestion.id]: textValue });
    }

    if (isLastQuestion) {
      // Complete questionnaire
      const finalAnswers = { ...answers };
      if (currentQuestion.type === 'number' && numberValue) {
        finalAnswers[currentQuestion.id] = parseInt(numberValue);
      } else if (currentQuestion.type === 'text' && textValue) {
        finalAnswers[currentQuestion.id] = textValue;
      }
      onComplete(finalAnswers);
    } else {
      // Move to next question
      setCurrentQuestionIndex(prev => prev + 1);
      setNumberValue('');
      setTextValue('');
      
      // Fade animation for next question
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setNumberValue('');
      setTextValue('');
    } else {
      onClose();
    }
  };

  const canProceed = () => {
    if (currentQuestion.type === 'chips') {
      const answer = answers[currentQuestion.id];
      return answer && (Array.isArray(answer) ? answer.length > 0 : true);
    }
    if (currentQuestion.type === 'number') {
      return numberValue.length > 0;
    }
    if (currentQuestion.type === 'text') {
      return textValue.length > 0;
    }
    return true;
  };

  const renderQuestionInput = () => {
    switch (currentQuestion.type) {
      case 'chips':
        return (
          <View style={styles.chipsContainer}>
            {currentQuestion.options?.map((option) => {
              const answer = answers[currentQuestion.id];
              const isSelected = Array.isArray(answer) 
                ? answer.includes(option) 
                : answer === option;
              
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.chip,
                    isSelected && { 
                      backgroundColor: categoryConfig.color,
                      borderColor: categoryConfig.color,
                    },
                  ]}
                  onPress={() => handleChipSelect(option)}
                >
                  <Text style={[
                    styles.chipText,
                    isSelected && styles.chipTextSelected,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'number':
        return (
          <View style={styles.numberContainer}>
            <TextInput
              style={styles.numberInput}
              value={numberValue}
              onChangeText={setNumberValue}
              keyboardType="numeric"
              placeholder={`Enter ${currentQuestion.unit || 'number'}`}
              placeholderTextColor="#999"
            />
            {currentQuestion.unit && (
              <Text style={styles.unitText}>{currentQuestion.unit}</Text>
            )}
          </View>
        );

      case 'text':
        return (
          <TextInput
            style={styles.textInput}
            value={textValue}
            onChangeText={setTextValue}
            placeholder={currentQuestion.placeholder || 'Type here...'}
            placeholderTextColor="#999"
            multiline
          />
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <LinearGradient
            colors={[categoryConfig.color, categoryConfig.color + 'CC']}
            style={styles.header}
          >
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerIcon}>{categoryConfig.icon}</Text>
              <Text style={styles.headerTitle}>{categoryConfig.category} Planning</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: categoryConfig.color }]} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Jeetu Avatar & Question */}
            <Animated.View style={[styles.questionSection, { opacity: fadeAnim }]}>
              {/* Jeetu Avatar */}
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>🤖</Text>
                </LinearGradient>
                <View style={styles.speechBubble}>
                  <Text style={styles.questionText}>{currentQuestion.question}</Text>
                  <View style={styles.speechTail} />
                </View>
              </View>

              {/* Question Counter */}
              <Text style={styles.questionCounter}>
                Question {currentQuestionIndex + 1} of {categoryConfig.questions.length}
              </Text>

              {/* Input Area */}
              <View style={styles.inputArea}>
                {renderQuestionInput()}
              </View>
            </Animated.View>
          </ScrollView>

          {/* Continue Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                { backgroundColor: categoryConfig.color },
                !canProceed() && styles.continueButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={styles.continueButtonText}>
                {isLastQuestion ? 'Create My Plan' : 'Continue'}
              </Text>
              <Ionicons 
                name={isLastQuestion ? 'checkmark-circle' : 'arrow-forward'} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  questionSection: {
    flex: 1,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  speechBubble: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    borderTopLeftRadius: 4,
    padding: 16,
    position: 'relative',
  },
  speechTail: {
    position: 'absolute',
    left: -8,
    top: 12,
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#F3F4F6',
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 24,
  },
  questionCounter: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputArea: {
    marginTop: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextSelected: {
    color: '#fff',
  },
  numberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  numberInput: {
    width: 120,
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1F2937',
  },
  unitText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 30,
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
