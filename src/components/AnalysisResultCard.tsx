import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, CATEGORY_COLORS, TYPE_BADGES } from '../constants';
import { AIAnalysis } from '../types';

interface AnalysisResult {
  category: string;
  type: string;
  title: string;
  transcription: string;
  analysis: AIAnalysis;
}

interface AnalysisResultCardProps {
  result: AnalysisResult;
  onRecordNew: () => void;
}

export default function AnalysisResultCard({ result, onRecordNew }: AnalysisResultCardProps) {
  return (
    <View style={styles.resultContainer}>
      <Text style={styles.resultTitle}>✨ Analysis Complete</Text>
      
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: CATEGORY_COLORS[result.category as keyof typeof CATEGORY_COLORS] || COLORS.primary },
            ]}
          >
            <Text style={styles.categoryBadgeText}>{result.category}</Text>
          </View>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: TYPE_BADGES[result.type as keyof typeof TYPE_BADGES]?.color || COLORS.gray[500] },
            ]}
          >
            <Text style={styles.typeBadgeText}>
              {TYPE_BADGES[result.type as keyof typeof TYPE_BADGES]?.icon} {TYPE_BADGES[result.type as keyof typeof TYPE_BADGES]?.label || result.type}
            </Text>
          </View>
        </View>

        <Text style={styles.resultMemoTitle}>{result.title}</Text>
        <Text style={styles.resultTranscript}>{result.transcription}</Text>

        {result.analysis.summary && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryLabel}>Summary:</Text>
            <Text style={styles.summaryText}>{result.analysis.summary}</Text>
          </View>
        )}

        {result.analysis.actionItems && result.analysis.actionItems.length > 0 && (
          <View style={styles.actionsContainer}>
            <Text style={styles.actionsLabel}>Action Items:</Text>
            {result.analysis.actionItems.map((item: string, idx: number) => (
              <Text key={idx} style={styles.actionItem}>
                • {item}
              </Text>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.newRecordingButton}
        onPress={onRecordNew}
      >
        <Text style={styles.newRecordingText}>Record Another</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  resultContainer: {
    marginTop: 16,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 16,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  resultMemoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 8,
  },
  resultTranscript: {
    fontSize: 16,
    color: COLORS.gray[700],
    lineHeight: 24,
    marginBottom: 16,
  },
  summaryContainer: {
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 12,
  },
  actionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  actionItem: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginBottom: 4,
    lineHeight: 20,
  },
  newRecordingButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  newRecordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
