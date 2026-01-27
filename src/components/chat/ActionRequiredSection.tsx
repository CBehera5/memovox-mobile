import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

interface ActionItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ActionRequiredSectionProps {
  actions: ActionItem[];
  onToggleAction?: (id: string) => void;
  isCollapsed?: boolean;
}

export default function ActionRequiredSection({
  actions,
  onToggleAction,
  isCollapsed: initialCollapsed = false,
}: ActionRequiredSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  
  const completedCount = actions.filter(a => a.completed).length;
  const totalCount = actions.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (actions.length === 0) return null;

  return (
    <LinearGradient
      colors={['rgba(236, 72, 153, 0.1)', 'rgba(139, 92, 246, 0.1)']}
      style={styles.container}
    >
      {/* Header Row */}
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsCollapsed(!isCollapsed)}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Action Required:</Text>
          <Ionicons 
            name={isCollapsed ? 'chevron-down' : 'chevron-up'} 
            size={18} 
            color="#6B7280" 
          />
        </View>

        {/* Progress Ring */}
        <View style={styles.progressContainer}>
          <View style={styles.progressRing}>
            <View style={[
              styles.progressFill,
              { 
                transform: [{ rotate: `${(progress / 100) * 360}deg` }]
              }
            ]} />
            <View style={styles.progressInner}>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action Items */}
      {!isCollapsed && (
        <View style={styles.actionList}>
          {actions.slice(0, 5).map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionItem}
              onPress={() => onToggleAction?.(action.id)}
            >
              <View style={[
                styles.checkbox,
                action.completed && styles.checkboxCompleted
              ]}>
                {action.completed && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
              </View>
              <Text style={[
                styles.actionText,
                action.completed && styles.actionTextCompleted
              ]}>
                {action.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#06B6D4',
    top: 0,
    left: 0,
  },
  progressInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  actionList: {
    marginTop: 12,
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#9333EA',
    borderColor: '#9333EA',
  },
  actionText: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  actionTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
});
