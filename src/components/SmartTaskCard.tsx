// src/components/SmartTaskCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants';
import { AgentAction } from '../types';

interface SmartTaskCardProps {
  action: AgentAction;
  daysOld?: number;
  onPress?: () => void;
  onComplete?: () => void;
}

export default function SmartTaskCard({ 
  action, 
  daysOld,
  onPress, 
  onComplete 
}: SmartTaskCardProps) {
  const getTypeIcon = () => {
    switch (action.type) {
      case 'task': return '✓';
      case 'reminder': return '🔔';
      case 'calendar_event': return '📅';
      default: return '📋';
    }
  };

  const getPriorityColor = () => {
    switch (action.priority) {
      case 'high': return '#EF5350';
      case 'medium': return '#FFA726';
      case 'low': return '#66BB6A';
      default: return COLORS.gray[400];
    }
  };

  const getStatusColor = () => {
    switch (action.status) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FFA726';
      case 'cancelled': return COLORS.gray[400];
      default: return COLORS.gray[400];
    }
  };

  const formatDueDate = () => {
    if (!action.dueDate) return null;
    const date = new Date(action.dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today${action.dueTime ? ` at ${action.dueTime}` : ''}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow${action.dueTime ? ` at ${action.dueTime}` : ''}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        ...(action.dueTime && { hour: 'numeric', minute: '2-digit' })
      });
    }
  };

  const isOverdue = () => {
    if (!action.dueDate || action.status === 'completed') return false;
    return new Date(action.dueDate) < new Date();
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        isOverdue() && styles.overdueContainer
      ]} 
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.leftSection}>
          <View style={[styles.typeIcon, { backgroundColor: getPriorityColor() + '20' }]}>
            <Text style={styles.iconText}>{getTypeIcon()}</Text>
          </View>
          <View style={styles.titleSection}>
            <Text style={styles.title} numberOfLines={1}>
              {action.title}
            </Text>
            <View style={styles.badges}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() }]}>
                <Text style={styles.badgeText}>{action.priority?.toUpperCase()}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.badgeText}>{action.status?.replace('_', ' ').toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {action.description && (
        <Text style={styles.description} numberOfLines={2}>
          {action.description}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.dateSection}>
          {formatDueDate() && (
            <View style={[styles.dateContainer, isOverdue() && styles.overdueDate]}>
              <Text style={styles.dateLabel}>Due:</Text>
              <Text style={[styles.dateText, isOverdue() && styles.overdueDateText]}>
                {formatDueDate()}
              </Text>
            </View>
          )}
          {daysOld && daysOld > 3 && (
            <View style={styles.oldBadge}>
              <Text style={styles.oldBadgeText}>⚠️ {daysOld} days old</Text>
            </View>
          )}
        </View>

        {action.status !== 'completed' && onComplete && (
          <TouchableOpacity 
            style={styles.completeButton}
            onPress={onComplete}
          >
            <Text style={styles.completeButtonText}>✓ Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overdueContainer: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF5350',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 6,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray[700],
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateSection: {
    flex: 1,
    gap: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overdueDate: {
    backgroundColor: '#EF535015',
    padding: 6,
    borderRadius: 6,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.gray[700],
    fontWeight: '600',
  },
  overdueDateText: {
    color: '#EF5350',
  },
  oldBadge: {
    backgroundColor: '#FFA72620',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  oldBadgeText: {
    fontSize: 11,
    color: '#F57C00',
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
});
