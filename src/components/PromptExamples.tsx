import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, EXAMPLE_PROMPTS } from '../constants';

interface PromptExamplesProps {
  onSelect: (prompt: string) => void;
}

export default function PromptExamples({ onSelect }: PromptExamplesProps) {
  return (
    <View style={styles.examplesSection}>
      <Text style={styles.examplesTitle}>Try These Examples:</Text>
      <View style={styles.examplesGrid}>
        {EXAMPLE_PROMPTS.map((prompt, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.exampleChip}
            onPress={() => onSelect(prompt)}
          >
            <Text style={styles.exampleText} numberOfLines={2}>
              {prompt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  examplesSection: {
    marginTop: 24,
  },
  examplesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
  examplesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exampleChip: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    maxWidth: '48%',
  },
  exampleText: {
    fontSize: 13,
    color: COLORS.gray[700],
  },
});
