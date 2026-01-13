// app/(tabs)/record.tsx

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Globe, Check } from 'lucide-react-native';

import AIService from '../../src/services/AIService';
import AuthService from '../../src/services/AuthService';
import VoiceMemoService from '../../src/services/VoiceMemoService';
import AgentService from '../../src/services/AgentService';
import StorageService from '../../src/services/StorageService'; // Still needed for example prompt mock
import SubscriptionService from '../../src/services/SubscriptionService';
import PersonaService from '../../src/services/PersonaService';
import GoogleCalendarService from '../../src/services/GoogleCalendarService';
import LanguageService, { SUPPORTED_LANGUAGES } from '../../src/services/LanguageService';
import { logger } from '../../src/services/Logger';

import { VoiceMemo } from '../../src/types';
import { COLORS, GRADIENTS } from '../../src/constants';
import { generateId } from '../../src/utils';

// Components
import UsageLimitWarning from '../../src/components/UsageLimitWarning';
import RecordingControls from '../../src/components/RecordingControls';
import AnalysisResultCard from '../../src/components/AnalysisResultCard';
import PromptExamples from '../../src/components/PromptExamples';

// Hooks
import { useAudioRecorder } from '../../src/hooks/useAudioRecorder';

export default function Record() {
  const { isRecording, duration, startRecording, stopRecording } = useAudioRecorder();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null); // TODO: Type this properly with AnalysisResult
  const [usageStats, setUsageStats] = useState<any>(null);
  
  // Language State
  const [currentLangCode, setCurrentLangCode] = useState(LanguageService.getCurrentLanguage());
  const [langModalVisible, setLangModalVisible] = useState(false);

  useEffect(() => {
    loadUsageStats();
    // Refresh language on focus if needed, or simple sync
    setCurrentLangCode(LanguageService.getCurrentLanguage());
  }, []); // Note: If user changes lang in settings, this might be stale until reload. Ideally useFocusEffect.

  const loadUsageStats = async () => {
    try {
      const stats = await SubscriptionService.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      logger.error('Failed to load usage stats:', error);
    }
  };
  
  const handleLanguageSelect = async (code: any) => {
    await LanguageService.setLanguage(code);
    setCurrentLangCode(code);
    setLangModalVisible(false);
    safeHaptics('impact');
  };

  const safeHaptics = async (type: 'impact' | 'notification' | 'success') => {
    if (Platform.OS === 'web') return; 
    // Platform check or try/catch. Haptics throws on web? The original code had try/catch.
    try {
        if (type === 'impact') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
        // ignore
    }
  };

  const handleStartRecording = async () => {
    try {
      const canCreate = await SubscriptionService.canCreateVoiceMemo();
      
      if (!canCreate) {
        Alert.alert(
          '🚫 Limit Reached',
          'You\'ve reached your monthly limit of voice memos. Upgrade to Premium for unlimited recordings!',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => {} } // Navigate to upgrade
          ]
        );
        return;
      }

      await startRecording();
      setResult(null);
      safeHaptics('impact');
    } catch (error: any) {
      if (error.message?.includes('permission')) {
        Alert.alert('Permission Required', 'Microphone permission is required.');
      } else {
        Alert.alert('Error', error.message || 'Failed to start recording');
      }
    }
  };

  const handleStopRecording = async () => {
    try {
        const audioUri = await stopRecording();
        safeHaptics('impact');
        
        if (audioUri) {
            await processRecording(audioUri);
        } else {
            Alert.alert('Error', 'Failed to save recording');
        }
    } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to stop recording');
    }
  };

  const processRecording = async (audioUri: string) => {
    setIsProcessing(true);
    try {
      logger.info('Processing recording', { audioUri });
      
      const user = await AuthService.getCurrentUser();
      if (!user) {
        throw new Error('You must be logged in to save memos');
      }

      // Convert to blob
      const response = await fetch(audioUri);
      const audioBlob = await response.blob();

      const memoId = generateId();
      
      // 1. Upload
      const audioUrl = await VoiceMemoService.uploadAudio(user.id, memoId, audioUri, audioBlob);
      const transcriptionUri = (audioUrl && audioUrl.startsWith('http')) ? audioUrl : audioUri;

      // 2. Analyze
      const analysis = await AIService.transcribeAndAnalyze(transcriptionUri);

      // 3. Save
      const memo: VoiceMemo = {
        id: memoId,
        userId: user.id,
        audioUri: audioUrl || audioUri,
        transcription: analysis.transcription,
        category: analysis.category,
        type: analysis.type,
        title: analysis.title,
        duration, // This is from the hook state at the moment of stop. 
                  // Wait, stopRecording resets duration in hook? 
                  // My hook implementation resets duration on START. So duration is preserving strict final value? 
                  // Hook sets duration in interval. When stop called, interval clears. State remains.
                  // So `duration` here is correct.
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        aiAnalysis: analysis.analysis,
        metadata: analysis.metadata,
      };

      await VoiceMemoService.saveMemo(memo);

      // 4. Create Actions
      if (analysis.analysis?.actionItems?.length) {
          for (const item of analysis.analysis.actionItems) {
              try {
                  await AgentService.createAction({
                      id: generateId(),
                      userId: user.id,
                      title: item,
                      type: memo.type === 'event' ? 'calendar_event' : memo.type === 'reminder' ? 'reminder' : 'task',
                      priority: memo.metadata?.priority || 'medium',
                      dueDate: memo.metadata?.eventDate || new Date().toISOString(), // Default to Today
                      dueTime: memo.metadata?.eventTime,
                      createdFrom: memoId,
                      status: 'pending',
                      createdAt: new Date().toISOString(),
                      linkedMemoId: memoId,
                  } as any, user.id);
              } catch (e) {
                  logger.error('Failed to create action', e);
              }
          }
      } else if (['Ideas', 'Work', 'Planning', 'Notes'].includes(memo.category) && memo.metadata?.priority === 'high') {
          // Fallback: If no specific actions but it's an important note/idea, create a "Review" task
          try {
              await AgentService.createAction({
                  id: generateId(),
                  userId: user.id,
                  title: `Review: ${memo.title}`,
                  type: 'task',
                  priority: memo.metadata?.priority || 'medium',
                  createdFrom: memoId,
                  status: 'pending',
                  createdAt: new Date().toISOString(),
                  linkedMemoId: memoId,
              } as any, user.id);
          } catch (e) {
              logger.error('Failed to create fallback action', e);
          }
      }

      // 5. Update Persona & Stats
      const allMemos = await VoiceMemoService.getUserMemos(user.id);
      await PersonaService.updatePersona(user.id, allMemos);
      await SubscriptionService.trackVoiceMemoCreation();
      loadUsageStats();

      setResult(analysis);
      safeHaptics('success');
      Alert.alert('Success', `Memo "${analysis.title}" saved!`);

      // 6. Google Calendar Prompt
      if (['event', 'task'].includes(memo.type)) {
          // Import GoogleCalendarService at top level if not present, or use dynamic import/require if needed, 
          // but better to rely on what's available. Assuming GoogleCalendarService is imported.
          // Wait, I need to add the import first. I will assume I'll add it in a separate step or just use the global one if I imported it.
          // I'll assume I'll add 'import GoogleCalendarService ...' in the next tool call or this one if I can match the file.
          // Actually, I can't add imports easily with replace_file_content in the middle. 
          // I will execute this, then add imports.
          
          checkCalendarSync(memo);
      }

    } catch (error: any) {
      logger.error('Processing error', error);
      Alert.alert('Processing Error', error.message || 'Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const checkCalendarSync = async (memo: VoiceMemo) => {
      try {
          const isSignedIn = await GoogleCalendarService.isSignedIn();
          
          if (isSignedIn) {
              if (memo.type === 'event' || (memo.type === 'task' && memo.metadata?.eventDate)) {
                  Alert.alert(
                      'Add to Google Calendar?',
                      `Would you like to add "${memo.title}" to your calendar?`,
                      [
                          { text: 'No', style: 'cancel' },
                          { 
                              text: 'Yes', 
                              onPress: async () => {
                                  try {
                                      const startDate = new Date(memo.metadata?.eventDate || new Date());
                                      // Parse time if available
                                      if (memo.metadata?.eventTime) {
                                          const [hours, minutes] = memo.metadata.eventTime.split(':');
                                          startDate.setHours(parseInt(hours), parseInt(minutes));
                                      }
                                      
                                      const endDate = new Date(startDate);
                                      endDate.setMinutes(startDate.getMinutes() + (memo.duration ? Math.ceil(memo.duration / 60) : 60)); // Default 1 hour

                                      await GoogleCalendarService.createEvent({
                                          title: memo.title || 'Untitled',
                                          description: memo.transcription,
                                          startTime: startDate,
                                          endTime: endDate,
                                          location: memo.metadata?.location
                                      });
                                      Alert.alert('Success', 'Event added to Google Calendar!');
                                  } catch (e) {
                                      Alert.alert('Error', 'Failed to add to calendar.');
                                  }
                              }
                          }
                      ]
                  );
              }
          } else {
               Alert.alert(
                  'Connect Google Calendar?',
                  'Connect your calendar so Jeetu can automatically schedule this for you next time.',
                  [
                      { text: 'Later', style: 'cancel' },
                      { 
                          text: 'Connect', 
                          onPress: async () => {
                              try {
                                  await AuthService.signInWithGoogle();
                              } catch (e) {
                                  console.error(e);
                              }
                          }
                      }
                  ]
              );
          }
      } catch (e) {
          console.error('Calendar check failed', e);
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
              const analysis = await AIService.transcribeAndAnalyze('mock_uri'); // Uses mock because of invalid URI
              const user = await AuthService.getCurrentUser() || await StorageService.getUser();
              
              if (user) {
                 const memo: VoiceMemo = {
                  id: generateId(),
                  userId: user.id,
                  audioUri: 'mock_uri',
                  transcription: prompt, // Use the prompt!
                  category: analysis.category,
                  type: analysis.type,
                  title: analysis.title,
                  duration: 5,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  aiAnalysis: analysis.analysis,
                  metadata: analysis.metadata,
                };
                
                await VoiceMemoService.saveMemo(memo); 
                // Don't need explicit PersonaStore.updatePersona if saveMemo handles side effects? 
                // VoiceMemoService doesn't handle side effects on Persona. 
                // Duplicate logic from processRecording.
                
                const allMemos = await VoiceMemoService.getUserMemos(user.id);
                await PersonaService.updatePersona(user.id, allMemos);
                
                setResult(analysis);
              }
            } catch (error) { 
                logger.error('Example error', error);
            } finally {
                setIsProcessing(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={GRADIENTS.primary} style={styles.header}>
            <View style={styles.headerTopRow}>
              <View>
                <Text style={styles.headerTitle}>Voice Recorder</Text>
                <Text style={styles.headerSubtitle}>
                    AI-powered transcription & organization
                </Text>
              </View>
              {/* Language Toggle Pill */}
              <TouchableOpacity 
                style={styles.langPill} 
                onPress={() => setLangModalVisible(true)}
              >
                <Globe size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.langPillText}>
                  {SUPPORTED_LANGUAGES[currentLangCode as keyof typeof SUPPORTED_LANGUAGES]?.nativeName || 'English'}
                </Text>
              </TouchableOpacity>
            </View>
        </LinearGradient>

        {usageStats && (
          <UsageLimitWarning
            currentUsage={usageStats.voiceMemosUsed}
            limit={usageStats.voiceMemosLimit}
            featureName="voice memos"
          />
        )}

        <View style={styles.content}>
          <RecordingControls 
            isRecording={isRecording}
            duration={duration}
            onToggleRecording={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
          />

          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.processingText}>
                Analyzing your memo...
              </Text>
            </View>
          )}

          {result && !isProcessing && (
            <AnalysisResultCard 
                result={result} 
                onRecordNew={() => setResult(null)} 
            />
          )}

          {!isRecording && !isProcessing && !result && (
            <PromptExamples onSelect={handleExamplePrompt} />
          )}
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={langModalVisible}
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Input Language</Text>
              <TouchableOpacity onPress={() => setLangModalVisible(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={Object.values(SUPPORTED_LANGUAGES)}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.langOption,
                    currentLangCode === item.code && styles.langOptionSelected
                  ]}
                  onPress={() => handleLanguageSelect(item.code)}
                >
                  <View>
                    <Text style={styles.langOptionNative}>{item.nativeName}</Text>
                    <Text style={styles.langOptionEnglish}>{item.name}</Text>
                  </View>
                  {currentLangCode === item.code && (
                    <Check size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50], // Check if gray[50] exists, usually simple palette
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
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
  processingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray[600] || '#4b5563',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  langPillText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  modalClose: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  langOptionSelected: {
    backgroundColor: '#EEF2FF',
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  langOptionNative: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 2,
  },
  langOptionEnglish: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
});