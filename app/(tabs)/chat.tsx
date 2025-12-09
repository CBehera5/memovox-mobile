import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  FlatList,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import ChatService, { ChatMessage, ChatSession } from '../../src/services/ChatService';
import AudioService from '../../src/services/AudioService';
import StorageService from '../../src/services/StorageService';
import VoiceMemoService from '../../src/services/VoiceMemoService';
import PersonalCompanionService from '../../src/services/PersonalCompanionService';
import ActionService from '../../src/services/ActionService';
import AgentActionManager from '../../src/services/AgentActionManager';
import AnimatedActionButton from '../../src/components/AnimatedActionButton';
import { User, VoiceMemo } from '../../src/types';

const ChatScreen: React.FC = () => {
  const params = useLocalSearchParams<{
    memoId?: string;
  }>();

  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showSessionList, setShowSessionList] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedMemo, setSelectedMemo] = useState<VoiceMemo | null>(null);
  const [memoInsight, setMemoInsight] = useState<any>(null);
  const [showingInsight, setShowingInsight] = useState(false);
  const [memoLoaded, setMemoLoaded] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const userData = await StorageService.getUser();
      setUser(userData);
      if (userData?.id) {
        // If we have a memoId, create a fresh session for this memo
        if (params.memoId) {
          await createMemoSpecificSession(userData.id);
        } else {
          loadSessions();
        }
      }
    };
    loadUser();
  }, [params.memoId]);

  // Load memo insight when memo ID is provided and session is ready
  useEffect(() => {
    const loadMemoAndGenerateInsight = async () => {
      if (params.memoId && !memoLoaded) {
        try {
          setInsightLoading(true);
          setShowingInsight(true); // Show loading state immediately
          const memo = await VoiceMemoService.getMemo(params.memoId);
          if (memo) {
            setSelectedMemo(memo);
            const insight = await PersonalCompanionService.generatePersonalInsight(memo);
            setMemoInsight(insight);
            setMemoLoaded(true);
          }
        } catch (error) {
          console.error('Error loading memo and generating insight:', error);
          Alert.alert('Error', 'Failed to load memo context');
          setShowingInsight(false);
        } finally {
          setInsightLoading(false);
        }
      }
    };

    if (params.memoId && user?.id && !memoLoaded) {
      loadMemoAndGenerateInsight();
    }
  }, [params.memoId, user?.id, memoLoaded]);

  useEffect(() => {
    if (currentSession) {
      setMessages(currentSession.messages);
    }
  }, [currentSession]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const loadSessions = async () => {
    if (!user?.id) return;
    try {
      const userSessions = await ChatService.getUserSessions(user.id);
      setSessions(userSessions);
      
      if (userSessions.length > 0) {
        const session = await ChatService.loadSession(userSessions[0].id);
        setCurrentSession(session);
      } else {
        createNewSession();
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      Alert.alert('Error', 'Failed to load chat sessions');
    }
  };

  const createNewSession = async () => {
    if (!user?.id) return;
    try {
      const timestamp = new Date().toLocaleString();
      const session = await ChatService.createSession(user.id, `Chat ${timestamp}`);
      
      // Ensure the session is properly loaded from storage
      const loadedSession = await ChatService.loadSession(session.id);
      
      if (loadedSession) {
        // Refresh all sessions from storage to get the updated list
        const allSessions = await ChatService.getUserSessions(user.id);
        setSessions(allSessions);
        setCurrentSession(loadedSession);
        setMessages(loadedSession.messages || []);
      } else {
        // Fallback to the session object returned from creation
        setSessions([session, ...sessions]);
        setCurrentSession(session);
        setMessages([]);
      }
      
      setShowSessionList(false);
    } catch (error) {
      console.error('Error creating session:', error);
      Alert.alert('Error', 'Failed to create new chat session');
    }
  };

  const createMemoSpecificSession = async (userId: string) => {
    try {
      // Create a new session specifically for this memo
      const timestamp = new Date().toLocaleString();
      const session = await ChatService.createSession(userId, `Insight - ${timestamp}`);
      
      // Verify it was created
      const loadedSession = await ChatService.loadSession(session.id);
      
      if (loadedSession) {
        setCurrentSession(loadedSession);
        setMessages([]);
      } else {
        setCurrentSession(session);
        setMessages([]);
      }
      
      setShowSessionList(false);
    } catch (error) {
      console.error('Error creating memo-specific session:', error);
      Alert.alert('Error', 'Failed to create chat session for this memo');
    }
  };

  const sendTextMessage = async () => {
    if (!textInput.trim() || !currentSession) return;

    const userMessage = textInput;
    setTextInput('');
    
    try {
      setIsLoading(true);
      
      // Ensure current session is loaded in ChatService
      await ChatService.loadSession(currentSession.id);
      
      const response = await ChatService.sendMessage(userMessage);
      
      if (response) {
        // Update local state with new messages
        const updatedSession = { ...currentSession, messages: [...currentSession.messages, response.userMessage, response.aiResponse] };
        setCurrentSession(updatedSession);
        setMessages(updatedSession.messages);
        
        // Check if user message contains action request (reminders, alarms, etc)
        await handlePotentialAction(userMessage);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check user message for action requests and execute if found
   * Uses AgentActionManager for robust action detection and tracking
   */
  const handlePotentialAction = async (userMessage: string) => {
    try {
      // Use AgentActionManager to process message for actions
      const createdActions = await AgentActionManager.processMessageForActions(userMessage, {
        memoId: params.memoId,
        userId: user?.id,
      });

      if (createdActions.length > 0) {
        console.log(`Created ${createdActions.length} action(s) from message`);
        // Actions are automatically saved and listeners are notified
      }
    } catch (error) {
      console.error('Error handling potential action:', error);
      // Don't alert user - this is a non-critical background process
    }
  };

  const startVoiceRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      const audioUri = await AudioService.startRecording();
      console.log('Voice recording started:', audioUri);
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopVoiceRecording = async () => {
    try {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

      const audioUri = await AudioService.stopRecording();
      setIsRecording(false);
      setRecordingTime(0);

      if (!audioUri || !currentSession) return;

      setIsLoading(true);
      const transcription = await ChatService.transcribeAudio(audioUri);
      
      if (transcription) {
        // Ensure current session is loaded in ChatService
        await ChatService.loadSession(currentSession.id);
        
        const response = await ChatService.sendMessage(transcription, audioUri);
        if (response) {
          const updatedSession = { ...currentSession, messages: [...currentSession.messages, response.userMessage, response.aiResponse] };
          setCurrentSession(updatedSession);
          setMessages(updatedSession.messages);
          
          // Check for action requests in voice message
          await handlePotentialAction(transcription);
        }
      }
    } catch (error) {
      console.error('Error processing voice message:', error);
      Alert.alert('Error', 'Failed to process voice message');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await ChatService.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      
      if (currentSession?.id === sessionId) {
        if (sessions.length > 1) {
          const nextSession = sessions.find((s) => s.id !== sessionId);
          if (nextSession) {
            const loaded = await ChatService.loadSession(nextSession.id);
            setCurrentSession(loaded);
          }
        } else {
          createNewSession();
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      Alert.alert('Error', 'Failed to delete chat session');
    }
  };

  const saveInsight = async () => {
    try {
      if (!selectedMemo || !memoInsight) {
        Alert.alert('Error', 'No insight to save');
        return;
      }
      
      // Update memo with insight
      const updatedMemo = {
        ...selectedMemo,
        aiAnalysis: {
          ...selectedMemo.aiAnalysis,
          keywords: selectedMemo.aiAnalysis?.keywords || [],
          actionItems: selectedMemo.aiAnalysis?.actionItems || [],
          savedInsight: memoInsight,
          savedAt: new Date().toISOString(),
        }
      };
      
      await VoiceMemoService.updateMemo(updatedMemo as any);
      Alert.alert('Success', 'Insight saved to memo!');
    } catch (error) {
      console.error('Error saving insight:', error);
      Alert.alert('Error', 'Failed to save insight');
    }
  };

  const shareInsight = async () => {
    try {
      if (!memoInsight) {
        Alert.alert('Error', 'No insight to share');
        return;
      }
      
      const shareText = `JARVIS Insight:\n\n${memoInsight.summary || ''}\n\n${memoInsight.personalTouch || ''}`;
      
      await Share.share({
        message: shareText,
        title: 'Share Insight',
      });
    } catch (error) {
      console.error('Error sharing insight:', error);
      Alert.alert('Error', 'Failed to share insight');
    }
  };

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUserMessage = item.role === 'user';
    const isSpeaking = speakingMessageId === item.id;

    const handleSpeakMessage = async () => {
      try {
        if (isSpeaking) {
          // Stop speaking
          await ChatService.stopSpeech();
          setSpeakingMessageId(null);
        } else {
          // Start speaking
          setSpeakingMessageId(item.id);
          await ChatService.generateSpeech(item.content);
          setSpeakingMessageId(null);
        }
      } catch (error) {
        console.error('Error speaking message:', error);
        setSpeakingMessageId(null);
      }
    };

    return (
      <View style={[styles.messageContainer, isUserMessage ? styles.userMessageContainer : styles.aiMessageContainer]}>
        <View style={[styles.messageBubble, isUserMessage ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUserMessage ? styles.userText : styles.aiText]}>
            {item.content}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          
          {/* Speak button for AI messages - only on native platforms */}
          {!isUserMessage && Platform.OS !== 'web' && (
            <TouchableOpacity 
              style={styles.speakButton}
              onPress={handleSpeakMessage}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isSpeaking ? 'stop-circle' : 'volume-high'} 
                size={16} 
                color={isSpeaking ? '#FF3B30' : '#007AFF'}
              />
              <Text style={[styles.speakButtonText, isSpeaking && { color: '#FF3B30' }]}>
                {isSpeaking ? 'Stop' : 'Listen'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderInsightDetail = () => {
    if (!showingInsight) return null;

    // Show loading state while insight is being generated
    if (insightLoading || !memoInsight) {
      return (
        <View style={[styles.messagesContainer, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 12, color: '#666', fontSize: 16 }}>Generating insights with JARVIS...</Text>
        </View>
      );
    }

    // Build greeting and summary message
    const summaryMessage = `Hi, I am JARVIS, your AI companion.\n\n${memoInsight.summary || ''}${
      memoInsight.personalTouch ? '\n\n' + memoInsight.personalTouch : ''
    }`;

    return (
      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {/* JARVIS Insight Message */}
        <View style={styles.messageContainer}>
          <View style={styles.aiMessageBubble}>
            <Text style={styles.aiMessageText}>{summaryMessage}</Text>
            <Text style={styles.aiMessageTime}>
              {new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        {memoInsight.actionableItems && memoInsight.actionableItems.length > 0 && (
          <View style={styles.actionButtonsContainer}>
            <Text style={styles.actionButtonsTitle}>Here are some actions I can help with:</Text>
            {memoInsight.actionableItems.map((item: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.actionItemButton}
                onPress={() => {
                  // Send action as message to start conversation about it
                  setTextInput(`Tell me more about: ${item.title}`);
                }}
              >
                <View style={styles.actionItemButtonContent}>
                  <View style={styles.actionItemButtonIcon}>
                    <Text style={styles.actionItemButtonIconText}>
                      {item.type === 'calendar' && '📅'}
                      {item.type === 'reminder' && '🔔'}
                      {item.type === 'notification' && '📲'}
                      {item.type === 'task' && '✓'}
                    </Text>
                  </View>
                  <View style={styles.actionItemButtonText}>
                    <Text style={styles.actionItemButtonTitle}>{item.title}</Text>
                    {item.description && (
                      <Text style={styles.actionItemButtonDesc}>{item.description}</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Ask More Questions, Save, and Share Buttons */}
        <View style={styles.insightActionContainer}>
          <View style={styles.insightButtonRow}>
            <AnimatedActionButton
              icon="💾"
              label="Save"
              backgroundColor="#667EEA"
              onPress={saveInsight}
            />
            
            <AnimatedActionButton
              icon="📤"
              label="Share"
              backgroundColor="#34C759"
              onPress={shareInsight}
            />
            
            <AnimatedActionButton
              icon="💬"
              label="Ask More"
              backgroundColor="#FF9500"
              onPress={async () => {
                // Add insight message to chat
                const summaryMessage = `Hi, I am JARVIS, your AI companion.\n\n${memoInsight.summary || ''}${
                  memoInsight.personalTouch ? '\n\n' + memoInsight.personalTouch : ''
                }`;
                
                const insightMessage: ChatMessage = {
                  id: `msg_${Date.now()}`,
                  role: 'assistant',
                  content: summaryMessage,
                  timestamp: new Date().toISOString(),
                };
                
                // Add to current session
                if (currentSession) {
                  const updatedSession = { 
                    ...currentSession, 
                    messages: [...currentSession.messages, insightMessage] 
                  };
                  setCurrentSession(updatedSession);
                  setMessages(updatedSession.messages);
                }
                
                // Switch to chat view
                setShowingInsight(false);
              }}
            />
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderSessionItem = ({ item }: { item: ChatSession }) => (
    <TouchableOpacity
      style={[styles.sessionItem, currentSession?.id === item.id && styles.sessionItemActive]}
      onPress={() => {
        ChatService.loadSession(item.id).then(setCurrentSession);
        setShowSessionList(false);
      }}
    >
      <View style={styles.sessionContent}>
        <Text style={styles.sessionTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.sessionDate}>
          {new Date(item.updatedAt).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          Alert.alert('Delete Chat?', 'This action cannot be undone.', [
            { text: 'Cancel', onPress: () => {} },
            {
              text: 'Delete',
              onPress: () => deleteSession(item.id),
              style: 'destructive',
            },
          ]);
        }}
      >
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to use chat</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {!showingInsight && (
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.sessionButton} onPress={() => setShowSessionList(!showSessionList)}>
              <Ionicons name="menu" size={24} color="#000" />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {currentSession?.title || 'New Chat'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.newChatButton} onPress={createNewSession}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {showSessionList && !showingInsight && (
        <View style={styles.sessionListContainer}>
          <FlatList
            data={sessions}
            renderItem={renderSessionItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={sessions.length > 5}
            style={styles.sessionList}
          />
        </View>
      )}

      {showingInsight ? (
        renderInsightDetail()
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#D0D0D0" />
              <Text style={styles.emptyText}>Start a conversation</Text>
              <Text style={styles.emptySubtext}>Record a voice message or type your question</Text>
            </View>
          ) : (
            <FlatList
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.messagesList}
            />
          )}
        </ScrollView>
      )}

      {!showingInsight && (
        <View style={styles.inputArea}>
          {isLoading && (
            <View style={styles.loadingBar}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>JARVIS is thinking...</Text>
            </View>
          )}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask me anything..."
              value={textInput}
              onChangeText={setTextInput}
              editable={!isRecording && !isLoading}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !textInput.trim() && styles.sendButtonDisabled]}
              onPress={sendTextMessage}
              disabled={!textInput.trim() || isLoading}
            >
              <Ionicons name="send" size={20} color={textInput.trim() ? '#007AFF' : '#CCCCCC'} />
            </TouchableOpacity>
          </View>

          <View style={styles.voiceControlRow}>
            {isRecording ? (
              <>
                <View style={styles.recordingTimer}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>
                    {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                  </Text>
                </View>
                <TouchableOpacity style={styles.recordButton} onPress={stopVoiceRecording}>
                  <Ionicons name="stop-circle" size={24} color="#FF3B30" />
                  <Text style={styles.recordButtonText}>Stop</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.recordButton, isLoading && styles.recordButtonDisabled]}
                onPress={startVoiceRecording}
                disabled={isLoading}
              >
                <Ionicons name="mic-circle" size={24} color={isLoading ? '#CCCCCC' : '#007AFF'} />
                <Text style={styles.recordButtonText}>Record</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    flex: 1,
  },
  sessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  newChatButton: {
    padding: 8,
  },
  sessionListContainer: {
    maxHeight: 300,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sessionList: {
    paddingHorizontal: 12,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sessionItemActive: {
    backgroundColor: '#F0F7FF',
  },
  sessionContent: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  sessionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 12,
  },
  messagesList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#007AFF',
  },
  aiBubble: {
    backgroundColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#000000',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  inputArea: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  voiceControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  recordButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  recordingTimer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  recordingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  insightContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  greetingSection: {
    backgroundColor: '#667EEA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  insightSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#667EEA',
  },
  insightSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#667EEA',
    marginRight: 8,
    fontWeight: '700',
  },
  keyPointText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  actionItem: {
    backgroundColor: '#F8FAFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#667EEA',
  },
  actionItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionType: {
    fontSize: 18,
    marginRight: 10,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  actionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  actionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#FAFBFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: '#333',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  questionItem: {
    backgroundColor: '#FAFBFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#FFB84D',
  },
  questionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontWeight: '500',
  },
  personalTouchSection: {
    backgroundColor: '#F0F7FF',
    borderLeftColor: '#FF6B6B',
    marginBottom: 16,
  },
  personalTouchText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  insightActions: {
    flexDirection: 'column',
    gap: 10,
    paddingBottom: 20,
  },
  actionButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  aiMessageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#E8E8E8',
    marginLeft: 12,
    marginBottom: 12,
  },
  aiMessageText: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
  },
  aiMessageTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
    textAlign: 'right',
  },
  insightActionContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  insightButtonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  actionButtonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  actionItemButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  actionItemButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionItemButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionItemButtonIconText: {
    fontSize: 20,
  },
  actionItemButtonText: {
    flex: 1,
  },
  actionItemButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  actionItemButtonDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  speakButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
});

export default ChatScreen;