// src/components/CalendarWidget.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../constants';
import { AgentAction } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react-native';

interface CalendarWidgetProps {
  actions: AgentAction[];
  onDatePress?: (date: Date) => void;
  selectedDate?: Date;
}

export default function CalendarWidget({ actions, onDatePress, selectedDate }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Get current week based on currentDate state
  const getWeekDays = () => {
    const week = [];
    // Clone currentDate to avoid mutation
    const current = new Date(currentDate);
    const dayOfWeek = current.getDay();
    const diff = current.getDate() - dayOfWeek; // Start from Sunday
    
    // Set to start of week
    const startOfWeek = new Date(current);
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      week.push(date);
    }
    
    return week;
  };

  const weekDays = getWeekDays();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Navigation handlers
  const prevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  // Check if a date has actions
  const hasActions = (date: Date) => {
    return actions.some(action => {
      if (!action.dueDate) return false;
      const actionDate = new Date(action.dueDate);
      return (
        actionDate.getDate() === date.getDate() &&
        actionDate.getMonth() === date.getMonth() &&
        actionDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Count actions for a date
  // Get status for a date
  const getDateStatus = (date: Date) => {
    const dayActions = actions.filter(action => {
      if (!action.dueDate) return false;
      const actionDate = new Date(action.dueDate);
      return (
        actionDate.getDate() === date.getDate() &&
        actionDate.getMonth() === date.getMonth() &&
        actionDate.getFullYear() === date.getFullYear()
      );
    });

    if (dayActions.length === 0) return null;

    const count = dayActions.length;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    // Check if any pending
    const hasPending = dayActions.some(a => a.status !== 'completed');
    
    if (checkDate.getTime() < now.getTime() && hasPending) {
        return { count, type: 'missed', color: '#EF4444' }; // Red
    }
    if (hasPending) {
        return { count, type: 'pending', color: '#3B82F6' }; // Blue
    }
    return { count, type: 'completed', color: '#10B981' }; // Green
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelectedMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <CalendarIcon size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
          <Text style={styles.monthText}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View style={styles.navigationContainer}>
          <TouchableOpacity onPress={prevWeek} style={styles.navButton}>
            <ChevronLeft size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={nextWeek} style={styles.navButton}>
            <ChevronRight size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.weekContainer}>
        {weekDays.map((date, index) => {
          const status = getDateStatus(date);
          const today = isToday(date);
          const inCurrentMonth = isSelectedMonth(date);
          const isSelected = selectedDate && (
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear()
          );
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayContainer,
                isSelected && styles.todayContainer,
              ]}
              onPress={() => onDatePress?.(date)}
            >
              <Text style={[
                styles.dayName, 
                isSelected && styles.todayText,
                !inCurrentMonth && styles.mutedText
              ]}>
                {dayNames[index]}
              </Text>
              <View style={[styles.dateCircle, isSelected && styles.todayCircle]}>
                <Text style={[
                  styles.dateText, 
                  isSelected && styles.todayDateText,
                  !inCurrentMonth && styles.mutedText
                ]}>
                  {date.getDate()}
                </Text>
              </View>
              {(() => {
                  const status = getDateStatus(date);
                  if (!status) return null;
                  return (
                    <View style={[styles.indicator, { backgroundColor: status.color }]}>
                      {/* Only show count if significant or standard? User asked for 'mark the number' */}
                      <Text style={styles.indicatorText}>{status.count}</Text>
                    </View>
                  );
              })()}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  mutedText: {
    color: COLORS.gray[400],
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
  },
  todayContainer: {
    backgroundColor: COLORS.primary + '15',
  },
  dayName: {
    fontSize: 11,
    color: COLORS.gray[600],
    marginBottom: 8,
    fontWeight: '500',
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  dateCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  todayCircle: {
    backgroundColor: COLORS.primary,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  todayDateText: {
    color: COLORS.white,
  },
  indicator: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});
