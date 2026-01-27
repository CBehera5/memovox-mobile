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
import { GroupSession } from '../services/GroupService';

interface GroupOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  group: GroupSession | null;
  onAddMembers: (groupId: string) => void;
  onMarkComplete: (group: GroupSession) => void;
}

export default function GroupOptionsModal({
  visible,
  onClose,
  group,
  onAddMembers,
  onMarkComplete,
}: GroupOptionsModalProps) {
  const router = useRouter();

  if (!group) return null;

  const handleDiscuss = () => {
    onClose();
    router.push({ 
        pathname: '/(tabs)/chat', 
        params: { groupId: group.id, groupName: group.title } 
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
            <Text style={styles.title} numberOfLines={1}>{group.title}</Text>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{group.members?.length || 1} Members</Text>
            </View>
          </View>

          <Text style={styles.description}>
            Managed by MemoVox AI
          </Text>

          {/* Options Grid */}
          <View style={styles.optionsContainer}>
            
            {/* Discuss More */}
            <TouchableOpacity style={styles.optionButton} onPress={handleDiscuss}>
              <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="chatbubbles" size={24} color="#0EA5E9" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Discuss More</Text>
                <Text style={styles.optionSubtitle}>Open group chat</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            {/* Add Member */}
            <TouchableOpacity style={styles.optionButton} onPress={() => { onClose(); onAddMembers(group.id); }}>
              <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="person-add" size={24} color="#22C55E" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Add Members</Text>
                <Text style={styles.optionSubtitle}>Invite friends</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

            {/* Mark Complete */}
            <TouchableOpacity style={styles.optionButton} onPress={() => { onClose(); onMarkComplete(group); }}>
              <View style={[styles.iconContainer, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="checkmark-done-circle" size={24} color="#A855F7" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Mark as Complete</Text>
                <Text style={styles.optionSubtitle}>Archive this group</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
            </TouchableOpacity>

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
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    flex: 1,
    marginRight: 12,
  },
  badge: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.gray[600],
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginBottom: 24,
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
});
