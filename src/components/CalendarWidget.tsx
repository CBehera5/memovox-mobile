// src/components/CalendarWidget.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../constants';
import { AgentAction } from '../types';

interface CalendarWidgetProps {
  actions: AgentAction[];
  onDatePress?: (date: Date) => void;
}

export default function CalendarWidget({ actions, onDatePress }: CalendarWidgetProps) {
  const [currentDate] = useState(new Date());
  
  // Get current week
  const getWeekDays = () => {
    const week = [];
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek; // Start from Sunday
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(diff + i);
      week.push(date);
    }
    
    return week;
  };

  const weekDays = getWeekDays();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const getActionCount = (date: Date) => {
    return actions.filter(action => {
      if (!action.dueDate) return false;
      const actionDate = new Date(action.dueDate);
      return (
        actionDate.getDate() === date.getDate() &&
        actionDate.getMonth() === date.getMonth() &&
        actionDate.getFullYear() === date.getFullYear()
      );
    }).length;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.monthText}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
      </View>
      
      <View style={styles.weekContainer}>
        {weekDays.map((date, index) => {
          const actionsOnDate = hasActions(date);
          const actionCount = getActionCount(date);
          const today = isToday(date);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayContainer,
                today && styles.todayContainer,
              ]}
              onPress={() => onDatePress?.(date)}
            >
              <Text style={[styles.dayName, today && styles.todayText]}>
                {dayNames[index]}
              </Text>
              <View style={[styles.dateCircle, today && styles.todayCircle]}>
                <Text style={[styles.dateText, today && styles.todayDateText]}>
                  {date.getDate()}
                </Text>
              </View>
              {actionsOnDate && (
                <View style={styles.indicator}>
                  <Text style={styles.indicatorText}>{actionCount}</Text>
                </View>
              )}
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
    marginBottom: 16,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
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
