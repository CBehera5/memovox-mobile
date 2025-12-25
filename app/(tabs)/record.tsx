// app/(tabs)/record.tsx

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import AudioService, { AudioService as AudioServiceClass } from '../../src/services/AudioService';
import AIService from '../../src/services/AIService';
import AuthService from '../../src/services/AuthService';
import VoiceMemoService from '../../src/services/VoiceMemoService';
import AgentService from '../../src/services/AgentService';
import StorageService from '../../src/services/StorageService';
import NotificationService from '../../src/services/NotificationService';
import PersonaService from '../../src/services/PersonaService';
import SubscriptionService from '../../src/services/SubscriptionService';
import { VoiceMemo } from '../../src/types';
import { COLORS, GRADIENTS, EXAMPLE_PROMPTS, TYPE_BADGES, CATEGORY_COLORS } from '../../src/constants';
import { generateId } from '../../src/utils';
import UsageLimitWarning from '../../src/components/UsageLimitWarning';

export default function Record() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<any>(null);

  useEffect(() => {
    loadUsageStats();
  }, []);

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

  const loadUsageStats = async () => {
    try {
      const stats = await SubscriptionService.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  };

  const handleStartRecording = async () => {
    try {
      // Check usage limit before recording
      const canCreate = await SubscriptionService.canCreateVoiceMemo();
      
      if (!canCreate) {
        Alert.alert(
          '🚫 Limit Reached',
          'You\'ve reached your monthly limit of voice memos. Upgrade to Premium for unlimited recordings!',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => {
              // Navigate to profile with upgrade modal
              // Since we can't use router here, we'll just show the alert
            }}
          ]
        );
        return;
      }

      await AudioService.startRecording();
      setIsRecording(true);
      setResult(null);
      
      // Haptics may not be available on web
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (hapticError) {
        console.log('Haptics not available (web platform)');
      }
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      // Show user-friendly error message
      if (error.message?.includes('permission')) {
        Alert.alert(
          'Permission Required', 
          'Microphone permission is required to record audio. Please grant permission in your device settings.',
          [
            { text: 'OK' }
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to start recording');
      }
    }
  };

  const handleStopRecording = async () => {
    try {
      console.log('🔴 DEBUG: handleStopRecording called');
      const audioUri = await AudioService.stopRecording();
      console.log('🔴 DEBUG: audioUri received:', audioUri);
      setIsRecording(false);
      
      // Haptics may not be available on web, so wrap in try-catch
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (hapticError) {
        console.log('Haptics not available (web platform)');
      }
      
      // Process the recording
      if (audioUri) {
        console.log('🔴 DEBUG: About to call processRecording');
        await processRecording(audioUri);
        console.log('🔴 DEBUG: processRecording completed');
      } else {
        console.log('🔴 DEBUG: audioUri is falsy!');
        Alert.alert('Error', 'Failed to save recording');
      }
    } catch (error: any) {
      console.error('🔴 DEBUG: Error in handleStopRecording:', error);
      Alert.alert('Error', error.message || 'Failed to stop recording');
    }
  };

  const processRecording = async (audioUri: string) => {
    setIsProcessing(true);
    try {
      console.log('🔴 DEBUG: processRecording START');
      console.log('Processing recording:', audioUri);
      
      // Get current user from Supabase Auth
      const user = await AuthService.getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save memos');
        setIsProcessing(false);
        return;
      }

      // Convert audio URI to blob for upload
      console.log('🔴 DEBUG: Converting audio URI to blob');
      let audioBlob: Blob;
      
      try {
        if (audioUri.startsWith('file://')) {
          // Use FileSystem to read local file
          console.log('🔴 DEBUG: Reading file from filesystem');
          const base64Data = await FileSystemLegacy.readAsStringAsync(audioUri, {
            encoding: 'base64',
          });
          
          // Convert base64 to binary string
          const binaryString = atob(base64Data);
          let blobData = '';
          for (let i = 0; i < binaryString.length; i++) {
            blobData += String.fromCharCode(binaryString.charCodeAt(i));
          }
          
          audioBlob = new Blob([blobData], { type: 'audio/mp4', lastModified: Date.now() });
          console.log('🔴 DEBUG: audioBlob created from filesystem, size:', audioBlob.size);
        } else {
          // Fallback to fetch for other URIs
          console.log('🔴 DEBUG: Fetching audio from:', audioUri);
          const response = await fetch(audioUri);
          audioBlob = await response.blob();
          console.log('🔴 DEBUG: audioBlob created from fetch, size:', audioBlob.size);
        }
      } catch (blobError) {
        console.error('🔴 DEBUG: Error creating audioBlob:', blobError);
        Alert.alert('Error', 'Failed to process audio file');
        setIsProcessing(false);
        return;
      }
      
      const memoId = generateId();
      console.log('🔴 DEBUG: audioBlob created, memoId:', memoId);

      // Upload audio to Supabase Storage
      console.log('🔴 DEBUG: About to upload audio');
      console.log('Uploading audio to Supabase...');
      const audioUrl = await VoiceMemoService.uploadAudio(
        user.id,
        memoId,
        audioUri,
        audioBlob
      );
      console.log('🔴 DEBUG: Upload returned audioUrl:', audioUrl);

      // If upload failed or returned local path, use local audioUri for transcription
      const transcriptionUri = (audioUrl && audioUrl.startsWith('http')) ? audioUrl : audioUri;
      console.log('🔴 DEBUG: Using URI for transcription:', transcriptionUri.substring(0, 50));

      // Transcribe and analyze (works with both remote URL and local file://)
      console.log('🔴 DEBUG: Calling AIService.transcribeAndAnalyze');
      const analysis = await AIService.transcribeAndAnalyze(transcriptionUri);
      console.log('Analysis complete:', analysis);

      // Use audioUrl for storage if available, otherwise use local URI
      const finalAudioUri = audioUrl || audioUri;

      // Create memo object using analysis
      const memo: VoiceMemo = {
        id: memoId,
        userId: user.id,
        audioUri: finalAudioUri,
        transcription: analysis.transcription,
        category: analysis.category,
        type: analysis.type,
        title: analysis.title,
        duration,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiAnalysis: analysis.analysis,
        metadata: analysis.metadata,
      };

      // Save memo to database
      console.log('Saving memo to Supabase:', memo);
      await VoiceMemoService.saveMemo(memo);
      console.log('Memo saved successfully');

      // Auto-create agent actions from AI analysis action items
      if (analysis.analysis?.actionItems && analysis.analysis.actionItems.length > 0) {
        console.log('🔴 DEBUG: Creating agent actions from action items');
        for (const actionItem of analysis.analysis.actionItems) {
          try {
            const actionData: any = {
              id: `action-${Date.now()}-${Math.random()}`,
              userId: user.id,
              title: actionItem,
              description: `From memo: ${analysis.title}`,
              type: memo.type === 'event' ? 'calendar_event' : memo.type === 'reminder' ? 'reminder' : 'task',
              priority: (memo.metadata?.priority || 'medium'),
              dueDate: memo.metadata?.eventDate || memo.metadata?.reminderDate,
              dueTime: memo.metadata?.eventTime,
              linkedMemoId: memoId,
              createdFrom: memoId,
              status: 'pending',
              createdAt: new Date().toISOString(),
            };
            const createdAction = await AgentService.createAction(actionData, user.id);
            console.log('🔴 DEBUG: Action created:', createdAction?.id);
          } catch (actionError) {
            console.error('Error creating agent action:', actionError);
            // Don't fail the whole process if one action fails
          }
        }
        console.log('🔴 DEBUG: All agent actions created');
      }

      // Update persona
      const allMemos = await VoiceMemoService.getUserMemos(user.id);
      await PersonaService.updatePersona(user.id, allMemos);

      // Track usage
      await SubscriptionService.trackVoiceMemoCreation();
      
      // Reload usage stats
      await loadUsageStats();

      // Show result
      setResult(analysis);
      setDuration(0);
      
      // Haptics may not be available on web
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (hapticError) {
        console.log('Haptics not available (web platform)');
      }
      
      Alert.alert('Success', `Memo "${analysis.title}" saved and analyzed!`);
    } catch (error: any) {
      console.error('🔴 DEBUG: Processing error caught:', error);
      Alert.alert('Processing Error', error.message || 'Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExamplePrompt = async (prompt: string) => {
    Alert.alert(
      'Example Prompt',
      `This would simulate recording: "${prompt}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Try It',
          onPress: async () => {
            setIsProcessing(true);
            try {
              // Simulate with mock analysis
              const analysis = await AIService.transcribeAndAnalyze('mock_uri');
              const user = await StorageService.getUser();
              
              if (user) {
                const memo: VoiceMemo = {
                  id: generateId(),
                  userId: user.id,
                  audioUri: 'mock_uri',
                  transcription: prompt,
                  category: analysis.category,
                  type: analysis.type,
                  title: analysis.title,
                  duration: 5,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  aiAnalysis: analysis.analysis,
                  metadata: analysis.metadata,
                };

                await StorageService.saveVoiceMemo(memo);
                const allMemos = await StorageService.getVoiceMemos();
                await PersonaService.updatePersona(user.id, allMemos);

                setResult(analysis);
              }
            } catch (error) {
              console.error('Example error:', error);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={GRADIENTS.primary} style={styles.header}>
          <Text style={styles.headerTitle}>Voice Recorder</Text>
          <Text style={styles.headerSubtitle}>
            AI-powered transcription & organization
          </Text>
        </LinearGradient>

        {/* Usage Limit Warning */}
        {usageStats && (
          <UsageLimitWarning
            currentUsage={usageStats.voiceMemosUsed}
            limit={usageStats.voiceMemosLimit}
            featureName="voice memos"
          />
        )}

        <View style={styles.content}>
          {/* Recording Controls */}
          <View style={styles.recordingSection}>
            <View style={styles.durationContainer}>
              <Text style={styles.durationText}>
                {AudioServiceClass.formatDuration(duration)}
              </Text>
              {isRecording && <View style={styles.recordingIndicator} />}
            </View>

            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessing}
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

          {/* Processing State */}
          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.processingText}>
                Analyzing your memo...
              </Text>
            </View>
          )}

          {/* Result Display */}
          {result && !isProcessing && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>✨ Analysis Complete</Text>
              
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: CATEGORY_COLORS[result.category as keyof typeof CATEGORY_COLORS] },
                    ]}
                  >
                    <Text style={styles.categoryBadgeText}>{result.category}</Text>
                  </View>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: TYPE_BADGES[result.type as keyof typeof TYPE_BADGES].color },
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>
                      {TYPE_BADGES[result.type as keyof typeof TYPE_BADGES].icon} {TYPE_BADGES[result.type as keyof typeof TYPE_BADGES].label}
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
                onPress={() => setResult(null)}
              >
                <Text style={styles.newRecordingText}>Record Another</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Example Prompts */}
          {!isRecording && !isProcessing && !result && (
            <View style={styles.examplesSection}>
              <Text style={styles.examplesTitle}>Try These Examples:</Text>
              <View style={styles.examplesGrid}>
                {EXAMPLE_PROMPTS.map((prompt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.exampleChip}
                    onPress={() => handleExamplePrompt(prompt)}
                  >
                    <Text style={styles.exampleText} numberOfLines={2}>
                      {prompt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
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
  processingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray[600],
  },
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
  guidanceSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  guidanceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 12,
  },
  guidanceText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 20,
  },
  guidanceSteps: {
    marginBottom: 20,
  },
  guidanceStep: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 8,
    paddingLeft: 8,
  },
  examplePrompts: {
    marginTop: 8,
  },
  promptsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  promptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  promptText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});