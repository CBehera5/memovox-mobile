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
  StatusBar,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import ChatService, { ChatMessage, ChatSession } from '../../src/services/ChatService';
import AudioService from '../../src/services/AudioService';
import StorageService from '../../src/services/StorageService';
import VoiceMemoService from '../../src/services/VoiceMemoService';
import PersonalCompanionService from '../../src/services/PersonalCompanionService';
import ActionService from '../../src/services/ActionService';
import AgentActionManager from '../../src/services/AgentActionManager';
import AgentService from '../../src/services/AgentService';
import SubscriptionService from '../../src/services/SubscriptionService';
import { 
  GroupPlanningService, 
  GroupPlanningSession,
  GroupPlanningMember 
} from '../../src/services/GroupPlanningService';
import AnimatedActionButton from '../../src/components/AnimatedActionButton';
import VoiceInputButton from '../../src/components/VoiceInputButton';
import { User, VoiceMemo, AgentSuggestion } from '../../src/types';

// Types for contacts and group members
interface Contact {
  id: string;
  name: string;
  phoneNumbers?: Array<{ number?: string; digits?: string; label?: string }>;
  emails?: Array<{ email?: string; label?: string }>;
}

interface GroupMember {
  id: string;
  name: string;
  isMemovoxUser: boolean;
  contactInfo: string; // phone or email
}

const ChatScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    memoId?: string;
    taskId?: string;
    taskTitle?: string;
    taskDescription?: string;
    mode?: 'task-insight' | 'memo-insight';
  }>();

  const [user, setUser] = useState<User | null>(null);
  const [hasAIAccess, setHasAIAccess] = useState<boolean>(false);
  const [checkingAccess, setCheckingAccess] = useState<boolean>(true);
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
  const [agentSuggestions, setAgentSuggestions] = useState<AgentSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isGroupPlanMode, setIsGroupPlanMode] = useState(false);
  const [groupPlanMembers, setGroupPlanMembers] = useState<GroupMember[]>([]);
  const [groupPlanTopic, setGroupPlanTopic] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [groupSession, setGroupSession] = useState<GroupPlanningSession | null>(null);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load user whenever screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const loadUser = async () => {
        setCheckingAccess(true);
        const userData = await StorageService.getUser();
        setUser(userData);
        
        // Check AI access
        const access = await SubscriptionService.canUseAIChat();
        setHasAIAccess(access);
        setCheckingAccess(false);
        
        if (userData?.id && access) {
          // If we have a memoId, create a fresh session for this memo (only once)
          if (params.memoId && !currentSession && !memoLoaded) {
            await createMemoSpecificSession(userData.id);
          } else if (!currentSession && !params.memoId && !params.mode) {
            // Only load sessions if we don't have a current session and no special params
            loadSessions();
          }
        }
      };
      loadUser();
    }, [params.memoId, currentSession, memoLoaded, params.mode])
  );

  // Reset state when memoId, taskId, or mode changes (navigating to different insights)
  useEffect(() => {
    // Reset all insight-related state when params change
    setMemoLoaded(false);
    setSelectedMemo(null);
    setMemoInsight(null);
    setShowingInsight(false);
    setMessages([]);
    setAgentSuggestions([]);
    setCurrentSession(null);
  }, [params.memoId, params.taskId, params.mode]);

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
            
            // Generate personal insight
            const insight = await PersonalCompanionService.generatePersonalInsight(memo);
            setMemoInsight(insight);
            
            // Generate AI agent suggestions
            setSuggestionsLoading(true);
            try {
              const suggestions = await AgentService.suggestActions(memo);
              setAgentSuggestions(suggestions);
            } catch (error) {
              console.error('Error generating agent suggestions:', error);
            } finally {
              setSuggestionsLoading(false);
            }
            
            // Generate proactive questions and add as AI message
            setQuestionsLoading(true);
            try {
              const questions = await ChatService.generateProactiveQuestions({
                userMessage: memo.transcription,
                conversationHistory: [],
              });
              
              // Add questions as a natural conversation message
              if (questions.length > 0) {
                const questionsMessage: ChatMessage = {
                  id: `questions_${Date.now()}`,
                  role: 'assistant',
                  content: `💡 **Here's what I can help with:**\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}\n\nWhat would you like to know or discuss about this?`,
                  timestamp: new Date().toISOString(),
                };
                
                // Add to messages
                setMessages(prev => [...prev, questionsMessage]);
              }
            } catch (error) {
              console.error('Error generating proactive questions:', error);
            } finally {
              setQuestionsLoading(false);
            }
            
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

  // Load task context when task ID is provided
  useEffect(() => {
    const loadTaskContext = async () => {
      if (params.mode === 'task-insight' && params.taskId && !memoLoaded) {
        try {
          setIsLoading(true);
          
          // Generate context-aware greeting for the task
          const greeting = await ChatService.generateTaskContextGreeting({
            title: params.taskTitle || 'Untitled Task',
            transcription: params.taskDescription || '',
          });
          
          // Add greeting as first AI message
          const aiMessage: ChatMessage = {
            id: `task_greeting_${Date.now()}`,
            role: 'assistant',
            content: greeting,
            timestamp: new Date().toISOString(),
          };
          
          setMessages([aiMessage]);
          
          // Generate proactive questions about the task and add as AI message
          setQuestionsLoading(true);
          try {
            const questions = await ChatService.generateProactiveQuestions({
              userMessage: `${params.taskTitle}: ${params.taskDescription}`,
              conversationHistory: [],
            });
            
            // Add questions as a natural conversation message
            if (questions.length > 0) {
              const questionsMessage: ChatMessage = {
                id: `questions_${Date.now()}`,
                role: 'assistant',
                content: `💡 **Here's what I can help with:**\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}\n\nWhat would you like to know or discuss about this?`,
                timestamp: new Date().toISOString(),
              };
              
              // Add to messages
              setMessages(prev => [...prev, questionsMessage]);
            }
          } catch (error) {
            console.error('Error generating questions:', error);
          } finally {
            setQuestionsLoading(false);
          }
          
          setMemoLoaded(true); // Reuse this flag to prevent reloading
        } catch (error) {
          console.error('Error loading task context:', error);
          Alert.alert('Error', 'Failed to load task context');
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (params.mode === 'task-insight' && params.taskId && user?.id && !memoLoaded) {
      loadTaskContext();
    }
  }, [params.mode, params.taskId, params.taskTitle, params.taskDescription, user?.id, memoLoaded]);

  useEffect(() => {
    if (currentSession) {
      setMessages(currentSession.messages);
    }
  }, [currentSession]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Clean up collaborative session when leaving screen
  useEffect(() => {
    return () => {
      if (isCollaborative) {
        if (__DEV__) {
          console.log('🧹 Cleaning up: Unsubscribing from collaborative session');
        }
        GroupPlanningService.unsubscribe();
      }
    };
  }, [isCollaborative]);

  const loadSessions = async () => {
    if (!user?.id) return;
    // Prevent duplicate loading
    if (currentSession) return;
    
    try {
      const userSessions = await ChatService.getUserSessions(user.id);
      setSessions(userSessions);
      
      if (userSessions.length > 0 && !currentSession) {
        const session = await ChatService.loadSession(userSessions[0].id);
        setCurrentSession(session);
      } else if (userSessions.length === 0 && !currentSession) {
        createNewSession();
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      Alert.alert('Error', 'Failed to load chat sessions');
    }
  };

  const createNewSession = async () => {
    if (!user?.id) return;
    // Prevent duplicate creation
    if (currentSession) {
      console.log('Session already exists, skipping creation');
      return;
    }
    
    try {
      const timestamp = new Date().toLocaleString();
      const session = await ChatService.createSession(user.id, `Chat ${timestamp}`);
      
      // Refresh all sessions from storage to get the updated list
      const allSessions = await ChatService.getUserSessions(user.id);
      setSessions(allSessions);
      setCurrentSession(session);
      setMessages(session.messages || []);
      
      setShowSessionList(false);
    } catch (error) {
      console.error('Error creating session:', error);
      Alert.alert('Error', 'Failed to create new chat session');
    }
  };

  const createMemoSpecificSession = async (userId: string) => {
    // Prevent duplicate creation
    if (currentSession) {
      console.log('Memo session already exists, skipping creation');
      return;
    }
    
    try {
      // Create a new session specifically for this memo
      const timestamp = new Date().toLocaleString();
      const session = await ChatService.createSession(userId, `Insight - ${timestamp}`);
      
      if (session) {
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
    if (!textInput.trim()) return;
    
    const userMessage = textInput;
    setTextInput('');
    
    try {
      setIsLoading(true);
      
      // CHECK IF WE'RE IN COLLABORATIVE GROUP PLANNING MODE
      if (isCollaborative && groupSession) {
        if (__DEV__) {
          console.log('📤 Sending message to collaborative session:', groupSession.id);
        }
        
        // SEND USER MESSAGE TO GROUP
        await GroupPlanningService.sendMessage(
          groupSession.id,
          user!.id,
          user!.name,
          {
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString(),
          }
        );
        
        // GET JEETU'S AI RESPONSE
        // Create a temp session if needed for AI response
        if (!currentSession) {
          const timestamp = new Date().toLocaleString();
          const tempSession = await ChatService.createSession(user!.id, `Temp ${timestamp}`);
          setCurrentSession(tempSession);
          await ChatService.loadSession(tempSession.id);
        } else {
          await ChatService.loadSession(currentSession.id);
        }
        
        const response = await ChatService.sendMessage(userMessage);
        
        if (response) {
          // BROADCAST JEETU'S RESPONSE TO ALL MEMBERS
          await GroupPlanningService.sendMessage(
            groupSession.id,
            'system',
            'JEETU',
            {
              role: 'assistant',
              content: response.aiResponse.content,
              timestamp: new Date().toISOString(),
            }
          );
          
          if (__DEV__) {
            console.log('✅ JEETU response broadcast to all members');
          }
          
          // Check for action requests
          await handlePotentialAction(userMessage);
        }
        
        setIsLoading(false);
        return; // Exit early for collaborative mode
      }
      
      // EXISTING CODE FOR NON-COLLABORATIVE CHAT CONTINUES BELOW...
    
      // Auto-create session if none exists
      if (!currentSession) {
        if (!user?.id) {
          Alert.alert('Error', 'Please log in to use chat');
          setIsLoading(false);
          return;
        }
        
        console.log('No session found, creating one automatically...');
        const timestamp = new Date().toLocaleString();
        const newSession = await ChatService.createSession(user.id, `Chat ${timestamp}`);
        setCurrentSession(newSession);
        setMessages([]);
        
        await ChatService.loadSession(newSession.id);
        const response = await ChatService.sendMessage(userMessage);
        
        if (response) {
          const updatedSession = { ...newSession, messages: [response.userMessage, response.aiResponse] };
          setCurrentSession(updatedSession);
          setMessages(updatedSession.messages);
          await handlePotentialAction(userMessage);
        }
        setIsLoading(false);
        return;
      }
    
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
        
        // Generate proactive questions for follow-up (only if not an irrelevant question)
        try {
          const isIrrelevant = await ChatService.isIrrelevantQuestion(userMessage);
          if (!isIrrelevant) {
            const questions = await ChatService.generateProactiveQuestions({
              userMessage,
              conversationHistory: updatedSession.messages,
            });
            
            // Add questions as a natural conversation message
            if (questions.length > 0) {
              const questionsMessage: ChatMessage = {
                id: `questions_${Date.now()}`,
                role: 'assistant',
                content: `💡 **Here's what I can help with:**\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}\n\nWhat would you like to know or discuss about this?`,
                timestamp: new Date().toISOString(),
              };
              
              // Add to current session and update messages
              const sessionWithQuestions = { 
                ...updatedSession, 
                messages: [...updatedSession.messages, questionsMessage] 
              };
              setCurrentSession(sessionWithQuestions);
              setMessages(sessionWithQuestions.messages);
              // Save to storage
              await StorageService.saveChatSession(sessionWithQuestions);
            }
          }
        } catch (error) {
          console.error('Error generating proactive questions:', error);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message. Please try again.';
      Alert.alert('Error', errorMessage);
      // Restore the message if it failed
      setTextInput(userMessage);
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
      if (!user?.id) return;

      // Use AgentActionManager to process message for actions
      const createdActions = await AgentActionManager.processMessageForActions(userMessage, {
        memoId: params.memoId,
        userId: user.id,
      });

      if (createdActions.length > 0) {
        console.log(`Created ${createdActions.length} action(s) from message`);
        
        // Show confirmation to user about created actions
        const actionSummary = createdActions.map(action => {
          const emoji = action.type === 'alarm' ? '⏰' : 
                       action.type === 'reminder' ? '🔔' : 
                       action.type === 'calendar' ? '📅' : 
                       action.type === 'task' ? '✓' : '📝';
          return `${emoji} ${action.title}`;
        }).join('\n');
        
        Alert.alert(
          '✅ Actions Created',
          `I've created the following for you:\n\n${actionSummary}`,
          [{ text: 'Great!', style: 'default' }]
        );
        
        // Add AI message confirming the actions
        if (currentSession) {
          const confirmMessage: ChatMessage = {
            id: `confirm-${Date.now()}`,
            role: 'assistant',
            content: `I've successfully created ${createdActions.length} action(s) for you. You can find them on your home screen!`,
            timestamp: new Date().toISOString(),
          };
          
          const updatedMessages = [...messages, confirmMessage];
          const updatedSession = { ...currentSession, messages: updatedMessages };
          setCurrentSession(updatedSession);
          setMessages(updatedMessages);
        }
      }
    } catch (error) {
      console.error('Error handling potential action:', error);
      // Show error to user since actions are a key feature
      Alert.alert('Action Error', 'I understood your request but had trouble creating the action. Please try again.');
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

      if (!audioUri) return;
      
      // Auto-create session if none exists
      if (!currentSession) {
        if (!user?.id) {
          Alert.alert('Error', 'Please log in to use chat');
          return;
        }
        
        console.log('No session found, creating one for voice message...');
        const timestamp = new Date().toLocaleString();
        const newSession = await ChatService.createSession(user.id, `Chat ${timestamp}`);
        setCurrentSession(newSession);
        setMessages([]);
        
        // Continue with processing voice message
        setIsLoading(true);
        const transcription = await ChatService.transcribeAudio(audioUri);
        
        if (transcription) {
          await ChatService.loadSession(newSession.id);
          const response = await ChatService.sendMessage(transcription, audioUri);
          if (response) {
            const updatedSession = { ...newSession, messages: [response.userMessage, response.aiResponse] };
            setCurrentSession(updatedSession);
            setMessages(updatedSession.messages);
            await handlePotentialAction(transcription);
          }
        }
        setIsLoading(false);
        return;
      }

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
      
      const shareText = `JEETU Insight:\n\n${memoInsight.summary || ''}\n\n${memoInsight.personalTouch || ''}`;
      
      await Share.share({
        message: shareText,
        title: 'Share Insight',
      });
    } catch (error) {
      console.error('Error sharing insight:', error);
      Alert.alert('Error', 'Failed to share insight');
    }
  };

  const [createdActionIds, setCreatedActionIds] = useState<Set<string>>(new Set());

  const handleCreateAction = async (suggestion: AgentSuggestion) => {
    try {
      if (!user?.id) {
        Alert.alert('Error', 'You must be logged in to create actions');
        return;
      }

      // Check if already created
      const actionKey = `${suggestion.action.title}-${suggestion.action.type}`;
      if (createdActionIds.has(actionKey)) {
        Alert.alert('Already Created', 'You have already created this action');
        return;
      }

      // Enhanced confirmation dialog with more options
      Alert.alert(
        '🤖 Create Action',
        `Type: ${suggestion.action.type.replace('_', ' ').toUpperCase()}\nTitle: "${suggestion.action.title}"\n\n💡 Why this matters:\n${suggestion.reason}\n\nPriority: ${suggestion.action.priority?.toUpperCase() || 'MEDIUM'}\nDue: ${suggestion.action.dueDate ? new Date(suggestion.action.dueDate).toLocaleDateString() : 'Not set'}${suggestion.action.dueTime ? ` at ${suggestion.action.dueTime}` : ''}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Edit First',
            onPress: () => {
              // Show edit dialog
              Alert.prompt(
                'Edit Action Title',
                'Modify the title if needed:',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Create',
                    onPress: async (newTitle?: string) => {
                      if (newTitle && newTitle.trim()) {
                        suggestion.action.title = newTitle.trim();
                      }
                      await createActionFromSuggestion(suggestion, actionKey);
                    },
                  },
                ],
                'plain-text',
                suggestion.action.title
              );
            },
          },
          {
            text: 'Create Now',
            onPress: async () => {
              await createActionFromSuggestion(suggestion, actionKey);
            },
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleCreateAction:', error);
      Alert.alert('Error', 'Failed to process action');
    }
  };

  const createActionFromSuggestion = async (suggestion: AgentSuggestion, actionKey: string) => {
    try {
      // Create the action
      const createdAction = await AgentService.createAction(
        suggestion.action,
        user!.id
      );

      // Link action to memo if we have a selected memo
      if (selectedMemo) {
        await VoiceMemoService.linkActionToMemo(
          selectedMemo.id,
          user!.id,
          createdAction.id
        );
      }

      // Mark as created
      setCreatedActionIds(new Set([...createdActionIds, actionKey]));

      Alert.alert(
        '✅ Success',
        `${suggestion.action.type === 'task' ? 'Task' : suggestion.action.type === 'reminder' ? 'Reminder' : 'Calendar event'} created successfully!\n\nYou can view it in the Home tab.`,
        [
          { text: 'OK' },
        ]
      );

      // Remove this suggestion from the list (optional - keep it to show status)
      // setAgentSuggestions(agentSuggestions.filter(s => s.action.title !== suggestion.action.title));
    } catch (error) {
      console.error('Error creating action:', error);
      Alert.alert('Error', 'Failed to create action');
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUserMessage = item.role === 'user';

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
          <Text style={{ marginTop: 12, color: '#666', fontSize: 16 }}>Generating insights with JEETU...</Text>
        </View>
      );
    }

    // Build greeting and summary message
    const summaryMessage = `Hi, I am JEETU, your AI companion.\n\n${memoInsight.summary || ''}${
      memoInsight.personalTouch ? '\n\n' + memoInsight.personalTouch : ''
    }`;

    return (
      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {/* JEETU Insight Message */}
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

        {/* AI Agent Suggestions */}
        {agentSuggestions && agentSuggestions.length > 0 && (
          <View style={styles.agentSuggestionsContainer}>
            <Text style={styles.agentSuggestionsTitle}>
              🤖 JEETU's recommendation
            </Text>
            <Text style={styles.agentSuggestionsSubtitle}>
              I analyzed your memo and found these actionable items:
            </Text>
            
            {agentSuggestions.map((suggestion, index) => {
              const actionKey = `${suggestion.action.title}-${suggestion.action.type}`;
              const isCreated = createdActionIds.has(actionKey);
              
              return (
              <View key={index} style={[
                styles.suggestionCard,
                isCreated && styles.suggestionCardCreated
              ]}>
                {/* Created Badge */}
                {isCreated && (
                  <View style={styles.createdBadge}>
                    <Text style={styles.createdBadgeText}>✅ Created</Text>
                  </View>
                )}

                <View style={styles.suggestionHeader}>
                  <View style={styles.suggestionIconContainer}>
                    <Text style={styles.suggestionIcon}>
                      {suggestion.action.type === 'task' && '✓'}
                      {suggestion.action.type === 'reminder' && '🔔'}
                      {suggestion.action.type === 'calendar_event' && '📅'}
                    </Text>
                  </View>
                  <View style={styles.suggestionInfo}>
                    <View style={styles.suggestionTitleRow}>
                      <Text style={styles.suggestionTitle}>
                        {suggestion.action.title}
                      </Text>
                      <View style={[
                        styles.priorityBadge,
                        suggestion.action.priority === 'high' && styles.priorityHigh,
                        suggestion.action.priority === 'medium' && styles.priorityMedium,
                        suggestion.action.priority === 'low' && styles.priorityLow,
                      ]}>
                        <Text style={styles.priorityText}>
                          {suggestion.action.priority}
                        </Text>
                      </View>
                    </View>
                    {suggestion.action.description && (
                      <Text style={styles.suggestionDescription}>
                        {suggestion.action.description}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Due Date/Time */}
                {(suggestion.action.dueDate || suggestion.action.dueTime) && (
                  <View style={styles.suggestionDateRow}>
                    <Text style={styles.suggestionDateLabel}>Due:</Text>
                    <Text style={styles.suggestionDateValue}>
                      {suggestion.action.dueDate && new Date(suggestion.action.dueDate).toLocaleDateString()}
                      {suggestion.action.dueTime && ` at ${suggestion.action.dueTime}`}
                    </Text>
                  </View>
                )}

                {/* AI Reasoning */}
                <View style={styles.suggestionReasonBox}>
                  <Text style={styles.suggestionReasonLabel}>💡 Why this matters:</Text>
                  <Text style={styles.suggestionReasonText}>
                    {suggestion.reason}
                  </Text>
                </View>

                {/* Create Action Button */}
                <TouchableOpacity
                  style={[
                    styles.createActionButton,
                    isCreated && styles.createActionButtonDisabled
                  ]}
                  onPress={() => !isCreated && handleCreateAction(suggestion)}
                  activeOpacity={isCreated ? 1 : 0.7}
                  disabled={isCreated}
                >
                  <Text style={[
                    styles.createActionButtonText,
                    isCreated && styles.createActionButtonTextDisabled
                  ]}>
                    {isCreated ? '✓ Already Created' : `➕ Create ${suggestion.action.type === 'task' ? 'Task' : suggestion.action.type === 'reminder' ? 'Reminder' : 'Event'}`}
                  </Text>
                </TouchableOpacity>
              </View>
              );
            })}
          </View>
        )}

        {/* Loading state for suggestions */}
        {suggestionsLoading && (
          <View style={styles.suggestionLoadingContainer}>
            <ActivityIndicator size="small" color="#667EEA" />
            <Text style={styles.suggestionLoadingText}>
              Analyzing memo for actionable items...
            </Text>
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
                const summaryMessage = `Hi, I am JEETU, your AI companion.\n\n${memoInsight.summary || ''}${
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

  const startGroupPlan = async () => {
    // Show modal first with loading state
    setShowContactPicker(true);
    setLoadingContacts(true);
    
    // Then load contacts
    await loadContacts();
  };

  const loadContacts = async () => {
    try {
      setLoadingContacts(true);
      console.log('📱 Starting to load contacts...');
      
      // Request contacts permission
      const { status } = await Contacts.requestPermissionsAsync();
      console.log('📱 Contacts permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Memovox needs access to your contacts to let you invite friends to group planning.\n\nPlease enable contacts permission in your device settings.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setShowContactPicker(false) },
            { 
              text: 'Open Settings', 
              onPress: () => {
                setShowContactPicker(false);
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              }
            }
          ]
        );
        setLoadingContacts(false);
        return;
      }

      console.log('📱 Permission granted, fetching contacts...');
      
      // Get contacts from device
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.PhoneNumbers,
          Contacts.Fields.Emails,
        ],
      });

      console.log(`📱 Raw contacts fetched: ${data?.length || 0}`);

      // Filter out contacts without name
      const filteredContacts = data.filter(contact => contact.name && contact.name.trim() !== '');
      console.log(`📱 Contacts with names: ${filteredContacts.length}`);
      
      // Sort contacts alphabetically
      const sortedContacts = filteredContacts.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || '';
        const nameB = b.name?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });

      setContacts(sortedContacts as Contact[]);
      console.log(`📱 ✅ Successfully loaded ${sortedContacts.length} contacts`);
      
      if (sortedContacts.length === 0) {
        Alert.alert(
          'No Contacts Found',
          'Your device contact list appears to be empty. Please add some contacts to your device and try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error loading contacts:', error);
      Alert.alert(
        'Error',
        `Failed to load contacts: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingContacts(false);
    }
  };

  const checkMemovoxUser = async (contactInfo: string): Promise<boolean> => {
    // TODO: Implement actual API call to check if user is registered
    // For now, always return false to enable invite functionality
    // In production, this would check against your Supabase users table
    
    try {
      // Example API call structure (uncomment and modify when backend is ready):
      /*
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .or(`phone.eq.${contactInfo},email.eq.${contactInfo}`)
        .single();
      
      return !error && !!data;
      */
      
      // For demo: Always return false so invite option is always shown
      // This ensures users can always invite friends to join Memovox
      if (__DEV__) {
        console.log('📧 Checking if contact is Memovox user:', contactInfo);
        console.log('💡 Returning false to show invite option (no backend API yet)');
      }
      return false; // Always show invite option until backend API is implemented
    } catch (error) {
      console.error('Error checking user:', error);
      return false; // Default to showing invite option on error
    }
  };

  const handleContactSelect = async (contact: Contact) => {
    const contactInfo = contact.phoneNumbers?.[0]?.number || contact.emails?.[0]?.email || '';
    
    // Check if already added
    const alreadyAdded = groupPlanMembers.some(m => m.contactInfo === contactInfo);
    if (alreadyAdded) {
      Alert.alert('Already Added', `${contact.name} is already in the group.`);
      return;
    }

    // Check if user is on Memovox
    const isMemovoxUser = await checkMemovoxUser(contactInfo);
    
    if (!isMemovoxUser) {
      Alert.alert(
        '📱 Invite to Memovox',
        `${contact.name} isn't on Memovox yet.\n\nSend them an invite to join your group planning session!`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '📲 Send Invite',
            onPress: async () => {
              try {
                const inviteMessage = `Hey ${contact.name}! 👋\n\nI'm inviting you to collaborate with me on Memovox!\n\n🤖 AI-Powered Planning\nMeet JEETU, your AI assistant who helps plan and organize tasks\n\n✨ What We Can Do Together:\n• Voice-to-text memos\n• Collaborative planning\n• Smart task extraction\n• Real-time sync\n\n� Join me now:\nhttps://memovox.app\n\nLet's get productive together!`;
                
                const result = await Share.share({
                  message: inviteMessage,
                  title: 'Join me on Memovox',
                });
                
                if (result.action === Share.sharedAction) {
                  if (__DEV__) {
                    console.log('✅ Invite shared successfully');
                    if (result.activityType) {
                      console.log('📱 Shared via:', result.activityType);
                    }
                  }
                  Alert.alert(
                    '🎉 Invitation Sent!',
                    `Your invitation has been shared with ${contact.name}.\n\nThey can join your group planning session once they install Memovox!`,
                    [{ text: 'Great!' }]
                  );
                } else if (result.action === Share.dismissedAction) {
                  if (__DEV__) {
                    console.log('ℹ️ Share dismissed by user');
                  }
                }
              } catch (error: any) {
                console.error('❌ Error sharing invite:', error);
                Alert.alert(
                  'Share Failed',
                  `Unable to share the invitation: ${error.message || 'Unknown error'}\n\nPlease try again.`,
                  [{ text: 'OK' }]
                );
              }
            },
          },
        ]
      );
      return;
    }

    // Add member to group
    const newMember: GroupMember = {
      id: contact.id,
      name: contact.name,
      isMemovoxUser: true,
      contactInfo,
    };

    setGroupPlanMembers(prev => [...prev, newMember]);
    Alert.alert('✅ Added', `${contact.name} has been added to the group!`);
  };

  const startGroupPlanningSession = async () => {
    if (groupPlanMembers.length === 0) {
      Alert.alert('No Members', 'Please add at least one member to start group planning.');
      return;
    }

    setShowContactPicker(false);
    setIsGroupPlanMode(true);
    
    try {
      if (__DEV__) {
        console.log('🚀 Creating collaborative group planning session...');
      }
      
      // CREATE COLLABORATIVE SESSION IN SUPABASE
      // Convert GroupMember to GroupPlanningMember format
      const planningMembers: GroupPlanningMember[] = groupPlanMembers.map(m => ({
        user_id: m.id,
        name: m.name,
        email: m.contactInfo.includes('@') ? m.contactInfo : undefined,
        phone: m.contactInfo.includes('@') ? undefined : m.contactInfo,
        joined_at: new Date().toISOString(),
        is_active: true,
      }));
      
      const session = await GroupPlanningService.createSession(
        user!.id,
        user!.name,
        `Group Plan - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        planningMembers
      );
      
      if (__DEV__) {
        console.log('✅ Session created:', session.id);
      }
      
      setGroupSession(session);
      setIsCollaborative(true);
      
      // SUBSCRIBE TO REALTIME UPDATES
      GroupPlanningService.subscribeToSession(
        session.id,
        (newMessage) => {
          if (__DEV__) {
            console.log('📨 New message received:', newMessage.content.substring(0, 50));
          }
          // Add message to local state (avoiding duplicates)
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage as any];
          });
        },
        (updatedMembers) => {
          if (__DEV__) {
            console.log('👥 Members updated:', updatedMembers.length);
          }
          // Convert GroupPlanningMember back to GroupMember format
          const convertedMembers: GroupMember[] = updatedMembers.map(m => ({
            id: m.user_id,
            name: m.name,
            isMemovoxUser: true,
            contactInfo: m.email || m.phone || '',
          }));
          setGroupPlanMembers(convertedMembers);
        }
      );
      
      // LOAD EXISTING MESSAGES (in case of rejoin)
      const existingMessages = await GroupPlanningService.getMessages(session.id);
      if (existingMessages.length > 0) {
        if (__DEV__) {
          console.log('📜 Loaded existing messages:', existingMessages.length);
        }
        setMessages(existingMessages as any[]);
      }
      
      // SEND WELCOME MESSAGE TO ALL MEMBERS
      const memberNames = groupPlanMembers.map(m => m.name).join(', ');
      
      await GroupPlanningService.sendMessage(
        session.id,
        'system',
        'JEETU',
        {
          role: 'assistant',
          content: `🎯 **Group Planning Mode Activated!**\n\nHi! I'm JEETU, your AI planning assistant. Let's create an amazing plan together!\n\n**Group Members (${groupPlanMembers.length}):**\n${memberNames}\n\n**Let's get started:**\nTell me what you're planning and I'll help break it down into tasks, assign responsibilities, and set deadlines.\n\nWhat would you like to plan today?`,
          timestamp: new Date().toISOString(),
        }
      );
      
      if (__DEV__) {
        console.log('✅ Welcome message sent to all members');
      }
      
    } catch (error) {
      console.error('❌ Error creating collaborative session:', error);
      Alert.alert(
        'Connection Error',
        'Failed to create group planning session. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
      // Revert state
      setIsGroupPlanMode(false);
      setIsCollaborative(false);
    }
  };

  const removeGroupMember = (memberId: string) => {
    setGroupPlanMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const addGroupMember = (memberName: string) => {
    // This function is now deprecated - use handleContactSelect instead
    setShowContactPicker(true);
  };

  const generateGroupPlan = async (planTopic: string) => {
    if (!planTopic.trim()) return;
    
    setGroupPlanTopic(planTopic);
    setIsLoading(true);
    
    try {
      const memberNames = groupPlanMembers.map(m => m.name).join(', ');
      // Create enhanced prompt for group planning
      const groupPlanPrompt = `I'm planning "${planTopic}" with a group of ${groupPlanMembers.length} people: ${memberNames}.

Please help me create a comprehensive plan with:
1. Key tasks/activities
2. Suggested timeline
3. Responsibilities (who should do what)
4. Important considerations
5. Success metrics

Make it collaborative and actionable!`;

      // Ensure current session is loaded
      if (currentSession) {
        await ChatService.loadSession(currentSession.id);
      }
      
      const response = await ChatService.sendMessage(groupPlanPrompt);
      
      if (response && currentSession) {
        const updatedSession = {
          ...currentSession,
          messages: [...currentSession.messages, response.userMessage, response.aiResponse]
        };
        setCurrentSession(updatedSession);
        setMessages(updatedSession.messages);
        
        // Auto-extract actions from the plan
        await handlePotentialAction(response.aiResponse.content);
      }
    } catch (error) {
      console.error('Error generating group plan:', error);
      Alert.alert('Error', 'Failed to generate group plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const sharePlan = async () => {
    try {
      if (messages.length === 0) {
        Alert.alert('No Plan', 'There is no plan to share yet.');
        return;
      }

      // Get the conversation content
      const planContent = messages
        .filter(m => m.role === 'assistant' && !m.content.includes('Group Planning Mode Activated'))
        .map(m => m.content)
        .join('\n\n---\n\n');

      if (!planContent) {
        Alert.alert('No Plan', 'Generate a plan first before sharing.');
        return;
      }

      const memberNames = groupPlanMembers.map(m => m.name).join(', ');
      const shareText = `🎯 Memovox Group Plan\n\n👥 Group Members: ${memberNames}\n📅 Created: ${new Date().toLocaleDateString()}\n\n${planContent}\n\n---\nCreated with Memovox AI Planning`;

      await Share.share({
        message: shareText,
        title: 'Share Group Plan',
      });
    } catch (error) {
      console.error('Error sharing plan:', error);
      Alert.alert('Error', 'Failed to share plan.');
    }
  };

  const exitGroupPlanMode = () => {
    // Clean up collaborative session
    if (isCollaborative && groupSession) {
      if (__DEV__) {
        console.log('🛑 Ending collaborative session:', groupSession.id);
      }
      
      // End session in database
      GroupPlanningService.endSession(groupSession.id).catch(error => {
        console.error('Error ending session:', error);
      });
      
      // Unsubscribe from realtime updates
      GroupPlanningService.unsubscribe();
    }
    
    // Reset all group planning state
    setIsGroupPlanMode(false);
    setGroupPlanMembers([]);
    setGroupPlanTopic('');
    setIsCollaborative(false);
    setGroupSession(null);
    
    if (__DEV__) {
      console.log('✅ Exited group planning mode');
    }
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Please log in to use chat</Text>
      </View>
    );
  }

  // Show loading while checking access
  if (checkingAccess) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 100 }} />
        <Text style={styles.loadingText}>Checking access...</Text>
      </View>
    );
  }

  // Show upgrade prompt if no AI access
  if (!hasAIAccess) {
    return (
      <View style={styles.upgradeContainer}>
        <Text style={styles.upgradeEmoji}>✨</Text>
        <Text style={styles.upgradeTitle}>Chat with JEETU</Text>
        <Text style={styles.upgradeDescription}>
          Your AI companion ready to help organize your thoughts and tasks
        </Text>
        <Text style={styles.upgradeFeatureTitle}>Premium Features:</Text>
        <View style={styles.featureList}>
          <Text style={styles.featureItem}>💬 Unlimited AI conversations</Text>
          <Text style={styles.featureItem}>🧠 Context-aware insights</Text>
          <Text style={styles.featureItem}>📝 Smart task suggestions</Text>
          <Text style={styles.featureItem}>🎯 Proactive planning help</Text>
        </View>
        <TouchableOpacity 
          style={styles.upgradeCTA}
          onPress={() => router.push('/(tabs)/profile?showUpgrade=true')}
        >
          <Text style={styles.upgradeCTAText}>Upgrade to Premium</Text>
        </TouchableOpacity>
        <Text style={styles.trialNote}>Or enjoy your 15-day Pro trial!</Text>
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
          {!isGroupPlanMode ? (
            <TouchableOpacity 
              style={styles.groupPlanButton} 
              onPress={startGroupPlan}
            >
              <Ionicons name="people" size={20} color="#FFFFFF" />
              <Text style={styles.groupPlanText}>Group Plan</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRightGroup}>
              <TouchableOpacity 
                style={styles.addMembersButton} 
                onPress={() => setShowContactPicker(true)}
              >
                <Ionicons name="person-add" size={16} color="#007AFF" />
                <Text style={styles.addMembersText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.shareButtonWithText} 
                onPress={sharePlan}
              >
                <Ionicons name="share-outline" size={18} color="#667EEA" />
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.exitGroupButton} 
                onPress={exitGroupPlanMode}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
                <Text style={styles.exitGroupText}>Exit</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.newChatButton} onPress={createNewSession}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Group Plan Mode Indicator */}
      {isGroupPlanMode && !showingInsight && (
        <View style={styles.groupModeIndicator}>
          <Text style={styles.groupModeText}>
            🎯 Group Planning Mode • Members ({groupPlanMembers.length}): {groupPlanMembers.map(m => m.name).join(', ')}
          </Text>
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
          {messages.length === 0 && !isRecording && (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={48} color="#D0D0D0" />
              <Text style={styles.emptyText}>Start a conversation</Text>
              <Text style={styles.emptySubtext}>Record a voice message or type your question</Text>
            </View>
          )}
          {messages.length > 0 && (
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
              <Text style={styles.loadingText}>JEETU is thinking...</Text>
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
            
            {/* Voice Input Button */}
            <VoiceInputButton
              onTranscription={(text) => {
                setTextInput(text);
              }}
              isDisabled={isLoading || isRecording}
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

      {/* Contact Picker Modal */}
      <Modal
        visible={showContactPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContactPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Group Members</Text>
              <TouchableOpacity onPress={() => setShowContactPicker(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search contacts..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#999"
              />
            </View>

            {/* Selected Members */}
            {groupPlanMembers.length > 0 && (
              <View style={styles.selectedMembersContainer}>
                <Text style={styles.selectedMembersTitle}>Selected ({groupPlanMembers.length}):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedMembersList}>
                  {groupPlanMembers.map((member) => (
                    <View key={member.id} style={styles.selectedMemberChip}>
                      <Text style={styles.selectedMemberName}>{member.name}</Text>
                      <TouchableOpacity onPress={() => removeGroupMember(member.id)}>
                        <Ionicons name="close-circle" size={18} color="#667EEA" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Contacts List */}
            {loadingContacts ? (
              <View style={styles.emptyContactsList}>
                <ActivityIndicator size="large" color="#667EEA" />
                <Text style={styles.emptyContactsText}>Loading contacts...</Text>
              </View>
            ) : (
              <FlatList
                data={contacts.filter((c: Contact) => 
                  c.name.toLowerCase().includes(searchQuery.toLowerCase())
                )}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.contactItem}
                    onPress={() => handleContactSelect(item)}
                  >
                    <View style={styles.contactAvatar}>
                      <Text style={styles.contactAvatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={styles.contactName}>{item.name}</Text>
                      <Text style={styles.contactDetail}>
                        {item.phoneNumbers?.[0]?.number || item.emails?.[0]?.email || 'No contact info'}
                      </Text>
                    </View>
                    {groupPlanMembers.some(m => m.id === item.id) && (
                      <Ionicons name="checkmark-circle" size={24} color="#34C759" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContactsList}>
                    <Ionicons name="people-outline" size={48} color="#CCCCCC" />
                    <Text style={styles.emptyContactsText}>
                      {searchQuery ? 'No contacts found' : 'No contacts available'}
                    </Text>
                  </View>
                }
                style={styles.contactsList}
                contentContainerStyle={contacts.length === 0 ? styles.emptyContactsContainer : undefined}
              />
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowContactPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.startPlanButton, groupPlanMembers.length === 0 && styles.disabledButton]}
                onPress={startGroupPlanningSession}
                disabled={groupPlanMembers.length === 0}
              >
                <Text style={styles.startPlanButtonText}>
                  Start Planning ({groupPlanMembers.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
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
  addMembersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    marginRight: 8,
  },
  addMembersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  groupPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#667EEA',
    borderRadius: 20,
    marginRight: 8,
  },
  groupPlanText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  exitGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF0F0',
    borderRadius: 16,
    marginRight: 8,
  },
  exitGroupText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  groupModeIndicator: {
    backgroundColor: '#F0F5FF',
    borderBottomWidth: 2,
    borderBottomColor: '#667EEA',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  groupModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667EEA',
    textAlign: 'center',
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
  // AI Agent Suggestion Styles
  agentSuggestionsContainer: {
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  agentSuggestionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#667EEA',
    marginBottom: 8,
  },
  agentSuggestionsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#667EEA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  suggestionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 8,
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  priorityHigh: {
    backgroundColor: '#FFE8E8',
    borderColor: '#FF3B30',
  },
  priorityMedium: {
    backgroundColor: '#FFF4E6',
    borderColor: '#FF9500',
  },
  priorityLow: {
    backgroundColor: '#E8F5E9',
    borderColor: '#34C759',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: '#666',
  },
  suggestionDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  suggestionDateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginRight: 6,
  },
  suggestionDateValue: {
    fontSize: 13,
    color: '#333',
  },
  suggestionReasonBox: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 3,
    borderLeftColor: '#667EEA',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  suggestionReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667EEA',
    marginBottom: 4,
  },
  suggestionReasonText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 19,
  },
  createActionButton: {
    backgroundColor: '#667EEA',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  createActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  suggestionLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  suggestionLoadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  suggestionCardCreated: {
    opacity: 0.7,
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  createdBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  createdBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createActionButtonDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6,
  },
  createActionButtonTextDisabled: {
    color: '#999',
  },
  upgradeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeEmoji: {
    fontSize: 72,
    marginBottom: 20,
  },
  upgradeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  upgradeDescription: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  upgradeFeatureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    alignSelf: 'flex-start',
    width: '100%',
  },
  featureList: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 12,
    paddingLeft: 8,
  },
  upgradeCTA: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  upgradeCTAText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  trialNote: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  // Group Planning Styles
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: {
    padding: 8,
    backgroundColor: '#F0F5FF',
    borderRadius: 20,
    marginRight: 4,
  },
  shareButtonWithText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F0F5FF',
    borderRadius: 16,
    marginRight: 8,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667EEA',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  selectedMembersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9F9F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectedMembersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667EEA',
    marginBottom: 8,
  },
  selectedMembersList: {
    flexDirection: 'row',
  },
  selectedMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    gap: 6,
  },
  selectedMemberName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#667EEA',
  },
  contactsList: {
    flex: 1,
    maxHeight: 400,
  },
  emptyContactsList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContactsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptyContactsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667EEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  startPlanButton: {
    backgroundColor: '#667EEA',
  },
  startPlanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
});

export default ChatScreen;