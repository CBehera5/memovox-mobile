/**
 * AudioService
 * Handles audio recording, playback, and management
 */

import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

export class AudioService {
  private recordingUri: string | null = null;
  private duration: number = 0;
  private isRecording: boolean = false;
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private recordingStartTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Request audio permissions
    this.requestAudioPermissions();
  }

  private async requestAudioPermissions(): Promise<void> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Audio permissions not granted');
      }
      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      if (this.isRecording) {
        console.warn('Already recording');
        return;
      }

      // Reset state
      this.duration = 0;
      this.recordingStartTime = Date.now();

      // Create new recording instance
      this.recording = new Audio.Recording();

      // Prepare recording
      await this.recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      // Start recording
      await this.recording.startAsync();
      this.isRecording = true;

      // Update duration every 100ms
      this.durationInterval = setInterval(() => {
        this.duration = Date.now() - this.recordingStartTime;
      }, 100);

      console.log('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * Stop recording and get the URI
   */
  async stopRecording(): Promise<string | null> {
    try {
      if (!this.isRecording || !this.recording) {
        console.warn('No active recording');
        return null;
      }

      // Clear duration interval
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = null;
      }

      // Stop recording
      await this.recording.stopAndUnloadAsync();
      this.isRecording = false;

      // Get the URI
      const uri = this.recording.getURI();
      this.recordingUri = uri;

      console.log('Recording stopped. URI:', uri);

      // On web, convert blob URI to base64 for persistence
      if (uri && uri.startsWith('blob:')) {
        try {
          const base64Uri = await this.convertBlobToBase64(uri);
          this.recordingUri = base64Uri;
          console.log('Converted blob URI to base64');
          return base64Uri;
        } catch (error) {
          console.warn('Failed to convert blob to base64, using original URI:', error);
          return uri;
        }
      }

      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.isRecording = false;
      return null;
    }
  }

  /**
   * Convert blob URI to base64 data URI
   */
  private async convertBlobToBase64(blobUri: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        const reader = new FileReader();
        reader.onloadend = function () {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.open('GET', blobUri);
      xhr.responseType = 'blob';
      xhr.send();
    });
  }

  /**
   * Play audio from URI
   */
  async playAudio(uri: string): Promise<void> {
    try {
      // Stop any existing playback
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Load and play the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      this.sound = sound;
      await sound.playAsync();

      console.log('Playing audio:', uri.substring(0, 50) + '...');
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  /**
   * Stop audio playback
   */
  async stopPlayback(): Promise<void> {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  }

  /**
   * Delete audio file
   */
  async deleteAudio(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri);
      console.log('Audio file deleted:', uri);
    } catch (error) {
      console.error('Error deleting audio:', error);
    }
  }

  /**
   * Get the current recording state
   */
  getRecordingState(): { duration: number; isRecording: boolean } {
    return {
      duration: this.duration,
      isRecording: this.isRecording,
    };
  }

  /**
   * Format duration in milliseconds to MM:SS format
   */
  static formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

export default new AudioService();
