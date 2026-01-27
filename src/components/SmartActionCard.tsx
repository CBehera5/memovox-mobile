import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AgentAction } from '../types';
import { formatRelativeTime } from '../utils';

interface SmartActionCardProps {
  action: AgentAction;
  onPress: () => void;
  onPressMenu?: () => void;
  index?: number;
}

const SmartActionCard: React.FC<SmartActionCardProps> = ({ action, onPress, onPressMenu, index = 0 }) => {
  const { smartTemplate, title, category, description, dueDate, dueTime, priority } = action;

  // Gradients matching Social Group Cards
  const gradients = [
      ['#4facfe', '#00f2fe'], // Blue
      ['#667eea', '#764ba2'], // Purple
      ['#30cfd0', '#330867'], // Teal/Dark
      ['#f093fb', '#f5576c'], // Pink
      ['#11998e', '#38ef7d'], // Green
      ['#FF416C', '#FF4B2B'], // Red/Orange
  ];

  // Use category-based colors if available
  const getCategoryGradient = () => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('health') || cat.includes('fitness')) return ['#11998e', '#38ef7d'];
    if (cat.includes('work') || cat.includes('meeting')) return ['#667eea', '#764ba2'];
    if (cat.includes('personal')) return ['#4facfe', '#00f2fe'];
    if (cat.includes('idea')) return ['#f093fb', '#f5576c'];
    if (cat.includes('urgent') || priority === 'high') return ['#FF416C', '#FF4B2B'];
    return gradients[index % gradients.length];
  };

  // Get icon based on category - for the right side visual
  const getCategoryIcon = (): keyof typeof Ionicons.glyphMap => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('health') || cat.includes('fitness')) return 'heart';
    if (cat.includes('work') || cat.includes('meeting')) return 'briefcase';
    if (cat.includes('idea')) return 'bulb';
    if (cat.includes('shopping')) return 'cart';
    if (cat.includes('travel')) return 'airplane';
    if (cat.includes('personal')) return 'person';
    if (cat.includes('food') || cat.includes('cooking')) return 'restaurant';
    if (cat.includes('study') || cat.includes('learn')) return 'book';
    if (cat.includes('chores') || cat.includes('household')) return 'home';
    if (cat.includes('daily')) return 'today';
    if (smartTemplate?.type === 'checklist') return 'checkbox';
    if (smartTemplate?.type === 'meeting_countdown') return 'calendar';
    // Check if it's a task/meeting type from title
    if (title?.toLowerCase().includes('meeting') || title?.toLowerCase().includes('call')) return 'videocam';
    if (title?.toLowerCase().includes('doctor') || title?.toLowerCase().includes('appointment')) return 'medkit';
    return 'flag'; // Default to flag icon for tasks
  };

  // Parse date handling 'today', 'tomorrow', etc.
  const parseDueDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    
    const dateLower = dateStr.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateLower === 'today') return today;
    if (dateLower === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    if (dateLower === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Check if task is missed or upcoming
  const getTaskStatus = () => {
    if (!dueDate) return { status: 'no-date', text: 'No due date', icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap };
    
    const now = new Date();
    const due = parseDueDate(dueDate);
    
    if (!due) return { status: 'no-date', text: 'No due date', icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap };
    
    // If there's a due time, parse and add it
    if (dueTime) {
      const [hours, minutes] = dueTime.split(':');
      due.setHours(parseInt(hours) || 0, parseInt(minutes) || 0);
    }
    
    if (due < now) {
      return { 
        status: 'missed', 
        text: 'Missed', 
        icon: 'alert-circle' as keyof typeof Ionicons.glyphMap,
        color: '#FF4444'
      };
    } else {
      // Calculate remaining time in hours/days
      const diffMs = due.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      let timeText = '';
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        timeText = `${diffMins}m left`;
      } else if (diffHours < 24) {
        timeText = `${diffHours}h left`;
      } else if (diffDays === 1) {
        timeText = `Tomorrow, ${diffHours % 24}h left`;
      } else {
        timeText = `${diffDays}d ${diffHours % 24}h left`;
      }
      
      return { 
        status: 'upcoming', 
        text: timeText, 
        icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
        color: '#4CAF50'
      };
    }
  };

  // Format due date nicely - handles 'today', 'tomorrow', and ISO dates
  const formatDueDate = () => {
    if (!dueDate) return null;
    
    // Handle relative date strings
    const dateLower = dueDate.toLowerCase().trim();
    if (dateLower === 'today') return 'Today';
    if (dateLower === 'tomorrow') return 'Tomorrow';
    if (dateLower === 'yesterday') return 'Yesterday';
    
    // Parse as date
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      // If invalid date, try to display as is or return null
      return dueDate.length < 15 ? dueDate : null;
    }
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Get task context (use description or generate from title)
  const getTaskContext = () => {
    if (description && description.trim()) {
      return description.length > 80 ? description.substring(0, 80) + '...' : description;
    }
    // Generate context from title if no description
    return `Complete: ${title}`;
  };

  // Priority indicator color
  const getPriorityColor = () => {
    switch (priority) {
      case 'high': return '#FF4444';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return 'rgba(255,255,255,0.5)';
    }
  };

  const hasShared = action.shared_with && action.shared_with.length > 0;
  const taskStatus = getTaskStatus();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={getCategoryGradient() as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Main Content Row */}
        <View style={styles.contentRow}>
          {/* Left Side: Content */}
          <View style={styles.leftContent}>
            {/* Category Badge with Priority */}
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {category ? category.toUpperCase() : (smartTemplate?.type?.replace('_', ' ').toUpperCase() || 'TASK')}
              </Text>
              {priority && (
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor() }]} />
              )}
            </View>
            
            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            
            {/* Task Context (NOT "Tap to view details") */}
            <Text style={styles.description} numberOfLines={2}>{getTaskContext()}</Text>
          </View>

          {/* Right Side: Category Icon (NOT menu) */}
          <View style={styles.rightContent}>
            <View style={styles.iconCircle}>
              <Ionicons name={getCategoryIcon()} size={28} color="#FFF" />
            </View>
          </View>
        </View>

        {/* Footer Row: Due Date, Status (Missed/Upcoming), Shared */}
        <View style={styles.footer}>
          {/* Due Date */}
          {dueDate && (
            <View style={styles.infoBadge}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.infoText}>{formatDueDate()}</Text>
            </View>
          )}

          {/* Due Time */}
          {dueTime && (
            <View style={styles.infoBadge}>
              <Ionicons name="alarm-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.infoText}>{dueTime}</Text>
            </View>
          )}

          {/* Status: Missed or Upcoming */}
          {dueDate && (
            <View style={[styles.statusBadge, { backgroundColor: taskStatus.status === 'missed' ? 'rgba(255,68,68,0.3)' : 'rgba(76,175,80,0.3)' }]}>
              <Ionicons name={taskStatus.icon} size={14} color={taskStatus.status === 'missed' ? '#FF6B6B' : '#7CFC00'} />
              <Text style={[styles.statusText, { color: taskStatus.status === 'missed' ? '#FF6B6B' : '#7CFC00' }]}>
                {taskStatus.text}
              </Text>
            </View>
          )}
          
          {/* Shared Badge */}
          {hasShared && (
            <View style={styles.infoBadge}>
              <Ionicons name="people" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.infoText}>{action.shared_with?.length}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginVertical: 8,
    minHeight: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  contentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftContent: {
    flex: 1,
    paddingRight: 12,
  },
  rightContent: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  infoText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default SmartActionCard;
