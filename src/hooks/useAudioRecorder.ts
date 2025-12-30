import { useState, useEffect, useCallback } from 'react';
import AudioService from '../services/AudioService';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        const state = AudioService.getRecordingState();
        setDuration(state.duration);
      }, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const startRecording = useCallback(async () => {
    try {
      await AudioService.startRecording();
      setIsRecording(true);
      setDuration(0);
      setRecordingUri(null);
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      const uri = await AudioService.stopRecording();
      setIsRecording(false);
      setRecordingUri(uri);
      return uri;
    } catch (error: any) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
      throw error;
    }
  }, []);

  return {
    isRecording,
    duration,
    recordingUri,
    startRecording,
    stopRecording
  };
};
