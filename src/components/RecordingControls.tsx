import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants';

interface RecordingControlsProps {
  isRecording: boolean;
  duration: number;
  onToggleRecording: () => void;
  disabled?: boolean;
}

export default function RecordingControls({ 
  isRecording, 
  duration, 
  onToggleRecording,
  disabled 
}: RecordingControlsProps) {

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.recordingSection}>
      <View style={styles.durationContainer}>
        <Text style={styles.durationText}>
          {formatDuration(duration)}
        </Text>
        {isRecording && <View style={styles.recordingIndicator} />}
      </View>

      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording && styles.recordButtonActive,
        ]}
        onPress={onToggleRecording}
        disabled={disabled}
      >
        <LinearGradient
          colors={isRecording ? [COLORS.error, '#dc2626'] as any : GRADIENTS.primary}
          style={styles.recordButtonGradient}
        >
          <Text style={styles.recordButtonIcon}>
            {isRecording ? '⏹️' : '🎙️'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.recordHint}>
        {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  recordingSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  durationText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error,
  },
  recordButton: {
    marginBottom: 16,
  },
  recordButtonActive: {
    transform: [{ scale: 1.1 }],
  },
  recordButtonGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonIcon: {
    fontSize: 48,
  },
  recordHint: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
});
