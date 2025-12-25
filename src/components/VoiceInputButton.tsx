// src/components/VoiceInputButton.tsx
import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { COLORS } from '../constants';

interface VoiceInputButtonProps {
  onTranscription: (text: string) => void;
  isDisabled?: boolean;
}

export default function VoiceInputButton({ 
  onTranscription, 
  isDisabled 
}: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      pulseAnim.setValue(1);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      console.log('Requesting audio permissions...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (!permission.granted) {
        console.log('Audio permission denied');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      console.log('Stopping recording...');
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        console.log('Recording saved to:', uri);
        // Import AIService dynamically to transcribe
        const AIService = (await import('../services/AIService')).default;
        const transcription = await AIService.transcribeAudio(uri);
        onTranscription(transcription);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setRecording(null);
    }
  };

  const handlePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.container,
        isDisabled && styles.disabled
      ]}
    >
      <Animated.View
        style={[
          styles.button,
          isRecording && styles.recording,
          { transform: [{ scale: isRecording ? pulseAnim : 1 }] }
        ]}
      >
        {isRecording ? (
          <View style={styles.recordingContent}>
            <View style={styles.redDot} />
            <Text style={styles.timeText}>{formatTime(recordingTime)}</Text>
          </View>
        ) : (
          <Text style={styles.micIcon}>🎤</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recording: {
    backgroundColor: '#EF5350',
  },
  micIcon: {
    fontSize: 20,
  },
  recordingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
});
