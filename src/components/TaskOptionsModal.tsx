import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../constants';
import { AgentAction } from '../types';

interface TaskOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  action: AgentAction | null;
  onAddMember: (actionId: string) => void;
  onMarkDone: (actionId: string) => void;
}

export default function TaskOptionsModal({
  visible,
  onClose,
  action,
  onAddMember,
  onMarkDone,
}: TaskOptionsModalProps) {
  const router = useRouter();

  if (!action) return null;

  const handleShowPlan = () => {
    onClose();
    router.push({
      pathname: '/(tabs)/chat',
      params: {
        mode: 'task-insight',
        taskId: action.id,
        taskTitle: action.title,
        taskDescription: action.description,
      },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{action.title}</Text>
            <View style={styles.priorityBadge}>
                <Text style={styles.priorityText}>{action.priority || 'NORMAL'}</Text>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={3}>
            {action.description || 'No additional details provided.'}
          </Text>

          {/* Original Transcription - Show if available */}
          {action.transcription && (
            <View style={styles.transcriptionContainer}>
              <Text style={styles.transcriptionLabel}>🎙️ Original Recording:</Text>
              <Text style={styles.transcriptionText} numberOfLines={4}>
                "{action.transcription}"
              </Text>
            </View>
          )}

          {/* Options Grid */}
          <View style={styles.optionsContainer}>
            
            {/* Show Plan */}
            <TouchableOpacity style={styles.optionButton} onPress={handleShowPlan}>
              <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="sparkles" size={24} color="#0EA5E9" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Show Plan with AI</Text>
                <Text style={styles.optionSubtitle}>Get AI insights & breakdown</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            {/* Add Member */}
            <TouchableOpacity style={styles.optionButton} onPress={() => { onClose(); onAddMember(action.id); }}>
              <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="person-add" size={24} color="#22C55E" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Add Members</Text>
                <Text style={styles.optionSubtitle}>Collaborate with friends</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            {/* Mark Done */}
            <TouchableOpacity style={styles.optionButton} onPress={() => { onClose(); onMarkDone(action.id); }}>
              <View style={[styles.iconContainer, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#A855F7" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Mark as Done</Text>
                <Text style={styles.optionSubtitle}>Complete this task</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            {/* View Chat History - Only show if task has a sessionId */}
            {action.sessionId && (
              <TouchableOpacity 
                style={styles.optionButton} 
                onPress={() => { 
                  onClose(); 
                  router.push({
                    pathname: '/(tabs)/chat',
                    params: { sessionId: action.sessionId },
                  });
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="chatbubbles" size={24} color="#F59E0B" />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>View Chat History</Text>
                  <Text style={styles.optionSubtitle}>See original conversation</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
              </TouchableOpacity>
            )}

          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray[300],
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    flex: 1,
    marginRight: 12,
  },
  priorityBadge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gray[600],
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginBottom: 24,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[100],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: COLORS.gray[400],
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[400],
  },
  transcriptionContainer: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  transcriptionText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
