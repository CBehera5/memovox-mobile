import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DateSeparatorProps {
  date: Date | string;
}

function formatDateLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time for comparison
  const compareDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const compareToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const compareYesterday = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (compareDate.getTime() === compareToday.getTime()) {
    return 'Today';
  }
  if (compareDate.getTime() === compareYesterday.getTime()) {
    return 'Yesterday';
  }

  // Format as "Jan 24" or "Jan 24, 2025" if different year
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric',
    ...(d.getFullYear() !== today.getFullYear() && { year: 'numeric' })
  };
  return d.toLocaleDateString('en-US', options);
}

export default function DateSeparator({ date }: DateSeparatorProps) {
  const label = formatDateLabel(date);

  return (
    <View style={styles.container}>
      <View style={styles.pill}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  pill: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
});
