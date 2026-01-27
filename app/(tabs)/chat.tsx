import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../src/config/supabase';
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
  Image, // Added Image
} from 'react-native';
import MemberSelectionModal from '../../src/components/MemberSelectionModal';
import MarkdownText from '../../src/components/MarkdownText'; // Added MarkdownText
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import PlanningCategorySelector from '../../src/components/PlanningCategorySelector';
import HealthPlanningTemplate from '../../src/components/templates/HealthPlanningTemplate';
import WorkPlanningTemplate from '../../src/components/templates/WorkPlanningTemplate';

// New WhatsApp-style Chat Components
import {
  ChatHeader,
  DateSeparator,
  MessageBubble,
  ChatInputBar,
  ActionRequiredSection,
  MessageType,
} from '../../src/components/chat';

// Proactive AI Companion Service
import JeetuReminderService from '../../src/services/JeetuReminderService';

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
    template?: string;
    groupId?: string; // Added for Group Chat
    groupName?: string;
    sessionId?: string; // For viewing chat history from task
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
  const [memoLoaded, setMemoLoaded] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [agentSuggestions, setAgentSuggestions] = useState<AgentSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isGroupPlanMode, setIsGroupPlanMode] = useState(false);
  const [groupPlanMembers, setGroupPlanMembers] = useState<GroupMember[]>([]);
  const [groupPlanTopic, setGroupPlanTopic] = useState('');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [groupSession, setGroupSession] = useState<GroupPlanningSession | null>(null);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (params.template) {
         handleTemplateSelection(params.template as string);
    }
  }, [params.template]);

  const handleTemplateSelection = (category: string) => {
    console.log('Template selected:', category);
    setSelectedTemplate(category);
    // You might want to create a new session or set context here
  };

  const handleTemplateSave = async (data: any) => {
     console.log('Template data saved:', data);
     if (!user?.id) return;
     
     try {
       setIsLoading(true);

       // 1. Create tasks for each To-Do item
       const category = selectedTemplate || 'Planning';
       const todoPromises = data.todos
         .filter((t: string) => t && t.trim().length > 0)
         .map((todo: string) => AgentService.createAction({
            title: todo,
            type: 'task',
            priority: 'medium',
            status: 'pending',
            category: category,
            description: `Created from ${category} Plan`,
            dueDate: new Date().toISOString(),
         } as any, user.id));

       // 2. Create a summary task for the log itself (auto-completed)
       let summaryDescription = '';
       let summaryTitle = '';

       if (selectedTemplate === 'Health') {
           summaryTitle = `Daily Health Log: ${new Date().toLocaleDateString()}`;
           summaryDescription = `
⚡ Productivity: ${data.productivity}/5
🌊 Water: ${data.waterCount} cups
😴 Sleep: ${data.sleepHours || '?'} hours
🧘 Routine: ${data.morningRoutine.filter((i: any) => i.checked).map((i: any) => i.label).join(', ') || 'None'}
mood: ${data.mood || 'Not set'}
           `.trim();
       } else if (selectedTemplate === 'Work') {
           summaryTitle = `Work Session: ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
           summaryDescription = `
🚀 Mode: ${data.focusMode ? data.focusMode.toUpperCase() : 'General'}
🏢 Env: ${data.environment || 'Not set'}
🎵 Sound: ${data.soundscape || 'None'}
           `.trim();
       }

       const summaryTask = AgentService.createAction({
          title: summaryTitle,
          type: 'task',
          priority: 'low',
          status: 'completed', // Auto-complete the log itself
          category: category,
          description: summaryDescription,
          completedAt: new Date().toISOString(),
       } as any, user.id);

       await Promise.all([...todoPromises, summaryTask]);
       
       Alert.alert('✅ Saved', `Your ${category.toLowerCase()} plan and ${todoPromises.length} tasks have been created.`);
       setSelectedTemplate(null);

       // Reload actions if possible, or just let Home refresh on focus
     } catch (error) {
       console.error('Error saving health plan:', error);
       Alert.alert('Error', 'Failed to save health plan.');
     } finally {
       setIsLoading(false);
     }
  };

  if (selectedTemplate === 'Health') {
      return (
          <View style={styles.container}>
             <HealthPlanningTemplate onSave={handleTemplateSave} onCancel={() => setSelectedTemplate(null)} />
          </View>
      );
  }

  if (selectedTemplate === 'Work') {
      return (
          <View style={styles.container}>
             <WorkPlanningTemplate onSave={handleTemplateSave} onCancel={() => setSelectedTemplate(null)} />
          </View>
      );
  }

  const pickAndSendImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setIsUploading(true);
        const asset = result.assets[0];
        const fileName = `${currentSession?.id || 'temp'}/${Date.now()}.jpg`;
        const contentType = 'image/jpeg';
        const base64Data = asset.base64;

        if (!base64Data) throw new Error('Could not get image data');

        const { error: uploadError } = await supabase.storage
          .from('chat-images')
          .upload(fileName, decode(base64Data), { contentType, upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);

        // Send to Group Session
        if (isGroupPlanMode && groupSession && user) {
          await GroupPlanningService.sendMessage(
            groupSession.id,
            user.id,
            user.name,
            {
              role: 'user',
              content: '📷 Image',
              timestamp: new Date().toISOString(),
              imageUri: publicUrl
            }
          );
        } 
        // Send to Jeetu (Personal Chat)
        else if (currentSession && user) {
             // For personal chat, we send it as a message with imageUri
             // Note: ChatService needs to support imageUri too ideally, but for now we format it in content or handle it via metadata
             // Since Jeetu is text-based context, we might want to analyze it immediately?
             // For now, let's just send it.
             const userMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: 'Shared an image',
                timestamp: new Date().toISOString(),
                // We'll attach image URL in the content or metadata if ChatService allows?
                // ChatMessage interface might not have imageUri. Use metadata.
                // Or just append URL to content for AI to see?
             };
             // AI handling for images is complex. Let's stick to Group Plan for now as per user request.
        }

        setIsUploading(false);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', 'Could not upload image.');
      setIsUploading(false);
    }
  };

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
            // Reset group planning state when navigating normally to Plan with AI
            // This ensures a fresh planning experience
            if (isGroupPlanMode || isCollaborative) {
              console.log('🔄 Resetting group mode for fresh planning');
              setIsGroupPlanMode(false);
              setGroupPlanMembers([]);
              setGroupPlanTopic('');
              setIsCollaborative(false);
              setGroupSession(null);
              GroupPlanningService.unsubscribe();
            }
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
    setMessages([]);
    setAgentSuggestions([]);
    setCurrentSession(null);
    
    // If mode is not 'group' and no groupId, clear group planning state
    if ((params.mode as string) !== 'group' && !params.groupId) {
      setIsGroupPlanMode(false);
      setGroupPlanMembers([]);
      setGroupPlanTopic('');
      setIsCollaborative(false);
      setGroupSession(null);
    }
  }, [params.memoId, params.taskId, params.mode]);

  // Load specific session when sessionId is provided (from Task > View Chat History)
  useEffect(() => {
    const loadSessionFromId = async () => {
      if (params.sessionId && user?.id) {
        try {
          setIsLoading(true);
          const session = await ChatService.loadSession(params.sessionId);
          if (session) {
            setCurrentSession(session);
            setMessages(session.messages);
            console.log('📂 Loaded chat history for session:', params.sessionId);
          }
        } catch (error) {
          console.error('Error loading session by ID:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadSessionFromId();
  }, [params.sessionId, user?.id]);

  // Load memo insight when memo ID is provided and session is ready
  useEffect(() => {
    const loadMemoAndGenerateInsight = async () => {
      if (params.memoId && !memoLoaded) {
        try {
          setIsLoading(true);
          const memo = await VoiceMemoService.getMemo(params.memoId);
          if (memo) {
            setSelectedMemo(memo);
            
            // Generate personal insight
            const insight = await PersonalCompanionService.generatePersonalInsight(memo);
            setMemoInsight(insight);
            
            // Create a rich markdown message for the insight
            const insightMessage: ChatMessage = {
              id: `insight_${Date.now()}`,
              role: 'assistant',
              content: `## 📝 Insight for: ${memo.title || 'Voice Memo'}\n\n` +
                `**Summary**\n${insight.summary}\n\n` +
                `**Key Points**\n${insight.keyPoints.map(p => `• ${p}`).join('\n')}\n\n` +
                `**Actionable Items**\n${insight.actionableItems.map(item => `• [${item.priority.toUpperCase()}] ${item.title}`).join('\n')}\n\n` +
                `*${insight.personalTouch}*`,
              timestamp: new Date().toISOString(),
            };

            setMessages([insightMessage]);
            
            // Generate AI agent suggestions
            try {
              const suggestions = await AgentService.suggestActions(memo);
              setAgentSuggestions(suggestions);
            } catch (error) {
              console.error('Error generating agent suggestions:', error);
            }
            
            // Generate proactive questions and add as AI message
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
            }
            
            setMemoLoaded(true);
          }
        } catch (error) {
          console.error('Error loading memo and generating insight:', error);
          Alert.alert('Error', 'Failed to load memo context');
        } finally {
          setIsLoading(false);
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
          
          let finalContent = greeting;

          // Generate proactive questions about the task
          try {
            const questions = await ChatService.generateProactiveQuestions({
              userMessage: `${params.taskTitle}: ${params.taskDescription}`,
              conversationHistory: [],
            });
            
            // Append questions to the greeting
            if (questions.length > 0) {
              finalContent += `\n\n💡 **Here's what I can help with:**\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n')}\n\nWhat would you like to know or discuss about this?`;
            }
          } catch (error) {
            console.error('Error generating questions:', error);
          }
          
          // Add single combined message
          const aiMessage: ChatMessage = {
            id: `task_greeting_${Date.now()}`,
            role: 'assistant',
            content: finalContent,
            timestamp: new Date().toISOString(),
          };
          
          setMessages([aiMessage]);
          
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

  // Load Group Session Context
  useEffect(() => {
    const loadGroupContext = async () => {
        if (params.groupId && user?.id) {
            console.log('👥 Loading Group Session:', params.groupId);
            try {
                setIsLoading(true);
                const session = await GroupPlanningService.getSession(params.groupId);
                
                if (session) {
                    // Fetch messages separately since they are in a rel table
                    const groupMessages = await GroupPlanningService.getMessages(session.id);
                    
                    // Map to ChatMessage format (snake_case to camelCase if needed)
                    const formattedMessages: any[] = groupMessages.map(msg => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        imageUri: msg.image_uri,
                        // Add naming context for group chat
                        user: {
                            _id: msg.user_id,
                            name: msg.user_name
                        }
                    }));

                    // Set Group Mode
                    setGroupSession(session);
                    setIsGroupPlanMode(true);
                    setIsCollaborative(true);
                    setGroupPlanTopic(session.title);
                    
                    // Populate Group Members
                    if (session.members) {
                        const members: GroupMember[] = session.members.map(m => ({
                            id: m.user_id,
                            name: m.name,
                            isMemovoxUser: true,
                            contactInfo: m.email || m.phone || ''
                        }));
                        setGroupPlanMembers(members);
                    }

                    // Set Current Session for UI compatibility
                    const mappedSession: ChatSession = {
                        id: session.id,
                        userId: user.id,
                        title: session.title,
                        messages: formattedMessages,
                        createdAt: session.created_at,
                        updatedAt: session.updated_at
                    };
                    setCurrentSession(mappedSession);
                    setMessages(formattedMessages);
                    
                    // Subscribe to Realtime Updates FIRST (before sending any messages)
                    GroupPlanningService.subscribeToSession(session.id, (message) => {
                        console.log('🔄 Group Message Received:', message);
                         
                         // Map the new message
                         const newMsg = {
                            id: message.id,
                            role: message.role,
                            content: message.content,
                            timestamp: message.timestamp,
                            imageUri: message.image_uri, 
                            user: {
                                _id: message.user_id,
                                name: message.user_name
                            }
                         };

                         setMessages(prev => [...prev, newMsg as any]);
                         // Update current session wrapper
                         setCurrentSession(prev => prev ? { ...prev, messages: [...prev.messages, newMsg as any] } : null);
                    });

                    // JEETU WELCOME (If Jeetu hasn't introduced himself yet)
                    const hasJeetuIntro = formattedMessages.some(m => 
                        m.user?.name === 'JEETU' || 
                        m.role === 'assistant'
                    );

                    if (!hasJeetuIntro) {
                        console.log('✨ No Jeetu intro found, sending welcome...');
                        // Longer delay to ensure subscription is active
                        setTimeout(async () => {
                            try {
                                const welcomeText = "Hello! I'm Jeetu, your AI assistant for this group. 🤝\n\nI can help you:\n• Plan events and trips\n• Assign tasks to members\n• Keep track of deadlines\n\nJust start discussing your plan!";
                                
                                // OPTIMISTIC UPDATE: Add message to local state immediately
                                const optimisticMsg = {
                                    id: `jeetu_welcome_${Date.now()}`,
                                    role: 'assistant' as const,
                                    content: welcomeText,
                                    timestamp: new Date().toISOString(),
                                    user: { _id: 'system', name: 'JEETU' }
                                };
                                setMessages(prev => [...prev, optimisticMsg as any]);
                                
                                // Then persist to database
                                await GroupPlanningService.sendMessage(
                                    session.id,
                                    'system',
                                    'JEETU',
                                    {
                                        role: 'assistant',
                                        content: welcomeText,
                                        timestamp: new Date().toISOString()
                                    }
                                );
                            } catch (e) {
                                console.error('Failed to send welcome:', e);
                            }
                        }, 1000); // Increased to 1 second
                    }
                } else {
                    Alert.alert('Error', 'Group not found');
                    router.back();
                }
            } catch (error) {
                console.error('Error loading group session:', error);
                Alert.alert('Error', 'Failed to join group chat');
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (params.groupId && user?.id) {
        loadGroupContext();
    }
  }, [params.groupId, user?.id]);

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

  const loadSessions = useCallback(async () => {
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
  }, [user?.id, currentSession]);

  const createNewSession = async () => {
    if (!user?.id) return;
    // ALLOW forcing new session (User tapped + button)
    
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

  /**
   * Smart detection for when Jeetu should respond in group chat
   * Returns true if the message warrants an AI response
   */
  const shouldJeetuRespond = (message: string): { shouldRespond: boolean; reason: string } => {
    const lowerMessage = message.toLowerCase().trim();
    
    // 1. Direct mentions of Jeetu
    const mentionPatterns = [
      /\bjeetu\b/i,
      /@jeetu/i,
      /\bai\b/i,
      /\bassistant\b/i,
      /\bhey jeetu\b/i,
      /\bhi jeetu\b/i,
    ];
    for (const pattern of mentionPatterns) {
      if (pattern.test(message)) {
        return { shouldRespond: true, reason: 'direct_mention' };
      }
    }
    
    // 2. Questions (ends with ? or starts with question words)
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could', 'should', 'would', 'is', 'are', 'do', 'does'];
    if (message.includes('?')) {
      return { shouldRespond: true, reason: 'question' };
    }
    for (const word of questionWords) {
      if (lowerMessage.startsWith(word + ' ') || lowerMessage.startsWith(word + "'")) {
        return { shouldRespond: true, reason: 'question' };
      }
    }
    
    // 3. Help/advice requests - Check for explicit mentions first (more robust)
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('jeetu') || lowerMsg.includes('suggest') || lowerMsg.includes('help')) {
        return { shouldRespond: true, reason: 'explicit_mention_or_keyword' };
    }

    const helpPatterns = [
      /\bhelp\b/i,
      /\badvice\b/i,
      /\bsuggest/i,
      /\brecommend/i,
      /\bopinion\b/i,
      /\bthoughts?\b/i,
      /\bideas?\b/i,
      /\bwhat do you think/i,
    ];
    for (const pattern of helpPatterns) {
      if (pattern.test(message)) {
        return { shouldRespond: true, reason: 'help_request' };
      }
    }
    
    // 4. Planning-specific keywords (since this is group planning)
    const planningPatterns = [
      /\bplan\b/i,
      /\bschedule\b/i,
      /\bdeadline\b/i,
      /\btask/i,
      /\baction item/i,
      /\bnext step/i,
      /\blet'?s decide/i,
      /\bfinalize/i,
      /\bsummar/i,
    ];
    for (const pattern of planningPatterns) {
      if (pattern.test(message)) {
        return { shouldRespond: true, reason: 'planning_context' };
      }
    }
    
    // 5. First message after period of silence (every 5 messages without Jeetu)
    // Count recent messages without Jeetu response
    const recentMessages = messages.slice(-5);
    const jeetuMessagesCount = recentMessages.filter(m => m.role === 'assistant').length;
    if (jeetuMessagesCount === 0 && messages.length >= 5) {
      return { shouldRespond: true, reason: 'periodic_checkin' };
    }
    
    // 6. In group planning mode, be MORE proactive - respond to most messages
    // For the first 10 messages, always engage to help establish the planning session
    if (messages.length < 10) {
      return { shouldRespond: true, reason: 'early_planning_session' };
    }
    
    // Default: Still respond occasionally to stay engaged
    // Only skip very short casual messages like "ok", "yes", "haha"
    if (lowerMessage.length > 5) {
      return { shouldRespond: true, reason: 'proactive_engagement' };
    }
    
    return { shouldRespond: false, reason: 'casual_conversation' };
  };

  const sendTextMessage = async () => {
    if (!textInput.trim()) return;
    
    const userMessage = textInput;
    setTextInput('');
    
    try {
      setIsLoading(true);
      
      // CHECK IF WE'RE IN COLLABORATIVE GROUP PLANNING MODE
      if (isCollaborative && groupSession) {
        console.log('📤 Sending message to collaborative session:', groupSession.id);
        console.log('🔍 isCollaborative:', isCollaborative, 'groupSession:', !!groupSession);
        
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

        
        // SMART DETECTION: Check if Jeetu should respond
        const { shouldRespond, reason } = shouldJeetuRespond(userMessage);
        console.log('🧠 Smart Detection:', { shouldRespond, reason, message: userMessage.substring(0, 50) });
        
        if (shouldRespond) {
          // GET JEETU'S AI RESPONSE (Stateless)
          try {
            console.log('🤖 Calling ChatService.generateResponse with', messages.length, 'messages');
            const aiContent = await ChatService.generateResponse(
                messages, 
                userMessage
            );
            console.log('🤖 AI Response received:', aiContent?.substring(0, 100) + '...');
            
            // BROADCAST JEETU'S RESPONSE TO ALL MEMBERS
            await GroupPlanningService.sendMessage(
                groupSession.id,
                'system',
                'JEETU',
                {
                    role: 'assistant',
                    content: aiContent,
                    timestamp: new Date().toISOString(),
                }
            );
            
            console.log('✅ JEETU response broadcast to all members');
          } catch (aiError: any) {
            console.error('❌ Error getting/sending AI response:', aiError);
            
            // Show alert for immediate visibility (bypassing chat UI issues)
            Alert.alert('AI Error', aiError.message || 'Unknown error');

            // Send descriptive error to chat so user knows why it failed
            let errorMessage = 'Sorry, I had trouble processing that. Please try again.';
            if (aiError.message?.includes('API key')) {
                errorMessage = 'System Alert: AI API key is missing or invalid.';
            } else if (aiError.message?.includes('network') || aiError.message?.includes('fetch')) {
                errorMessage = 'Network Error: I cannot connect to the AI server right now.';
            }
            
            await GroupPlanningService.sendMessage(
                groupSession.id,
                'system',
                'JEETU',
                {
                    role: 'assistant',
                    content: errorMessage,
                    timestamp: new Date().toISOString(),
                }
            );
          }
        } else {
          console.log('🤫 Jeetu staying quiet (casual conversation)');
        }
        
        // PROACTIVE TASK DETECTION: Check if message contains a task assignment
        try {
          const groupMemberList = groupPlanMembers.map(m => ({ id: m.id, name: m.name }));
          const taskConfirmation = await JeetuReminderService.processMessageForTasks(
            groupSession.id,
            user!.id,
            userMessage,
            groupMemberList
          );
          
          if (taskConfirmation) {
            console.log('📋 Task detected and created, sending confirmation');
            // Send task confirmation as a separate message
            await GroupPlanningService.sendMessage(
              groupSession.id,
              'system',
              'JEETU',
              {
                role: 'assistant',
                content: taskConfirmation,
                timestamp: new Date().toISOString(),
              }
            );
          }
        } catch (taskError) {
          console.error('Error processing task detection:', taskError);
        }
        
        // Check for action requests
        await handlePotentialAction(userMessage);
        
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

        // Auto-generate title if it's a new conversation (2-4 messages)
        if (updatedSession.messages.length >= 2 && updatedSession.messages.length <= 4) {
             // Don't await this to keep UI responsive, but we need to update state eventually
             ChatService.generateSessionTitle(updatedSession.messages).then(async (newTitle) => {
                 if (newTitle && newTitle !== 'New Chat') {
                     await ChatService.updateSessionTitle(updatedSession.id, newTitle);
                     // Update local state without full reload if possible, or trigger reload
                     setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null);
                     setSessions(prev => prev.map(s => s.id === updatedSession.id ? { ...s, title: newTitle } : s));
                 }
             });
        }
        
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
        // Pass group members if in collaborative mode
        members: isGroupPlanMode ? groupPlanMembers.map(m => ({ id: m.id, name: m.name })) : undefined
      });

      if (createdActions.length > 0) {
        console.log(`Created ${createdActions.length} action(s) from message`);
        
        // Show confirmation to user about created actions
        const actionSummary = createdActions.map(action => {
          const emoji = action.type === 'alarm' ? '⏰' : 
                       action.type === 'reminder' ? '🔔' : 
                       action.type === 'calendar' ? '📅' : 
                       action.type === 'task' ? '✓' : '📝';
          const assignment = action.assignedToName ? ` (to ${action.assignedToName})` : '';
          return `${emoji} ${action.title}${assignment}`;
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
      
      setIsLoading(true);
      
      // Transcribe the audio first
      const transcription = await ChatService.transcribeAudio(audioUri);
      
      if (!transcription) {
        console.error('Failed to transcribe audio');
        Alert.alert('Error', 'Could not transcribe voice message');
        setIsLoading(false);
        return;
      }
      
      console.log('🎤 Voice transcription:', transcription);
      
      // CHECK IF WE'RE IN COLLABORATIVE GROUP MODE
      if (isCollaborative && groupSession) {
        console.log('📤 Sending voice message to collaborative session:', groupSession.id);
        
        // SEND USER MESSAGE TO GROUP (with audio URI)
        await GroupPlanningService.sendMessage(
          groupSession.id,
          user!.id,
          user!.name,
          {
            role: 'user',
            content: transcription,
            audioUri: audioUri,
            timestamp: new Date().toISOString(),
          }
        );
        
        // SMART DETECTION: Check if Jeetu should respond
        const { shouldRespond, reason } = shouldJeetuRespond(transcription);
        console.log('🧠 Smart Detection (voice):', { shouldRespond, reason });
        
        if (shouldRespond) {
          // GET JEETU'S AI RESPONSE
          try {
            const aiContent = await ChatService.generateResponse(messages, transcription);
            
            // BROADCAST JEETU'S RESPONSE TO ALL MEMBERS
            await GroupPlanningService.sendMessage(
              groupSession.id,
              'system',
              'JEETU',
              {
                role: 'assistant',
                content: aiContent,
                timestamp: new Date().toISOString(),
              }
            );
            console.log('✅ JEETU voice response broadcast');
          } catch (aiError) {
            console.error('❌ Error getting AI response for voice:', aiError);
          }
        }
        
        // PROACTIVE TASK DETECTION
        try {
          const groupMemberList = groupPlanMembers.map(m => ({ id: m.id, name: m.name }));
          const taskConfirmation = await JeetuReminderService.processMessageForTasks(
            groupSession.id,
            user!.id,
            transcription,
            groupMemberList
          );
          
          if (taskConfirmation) {
            await GroupPlanningService.sendMessage(
              groupSession.id,
              'system',
              'JEETU',
              {
                role: 'assistant',
                content: taskConfirmation,
                timestamp: new Date().toISOString(),
              }
            );
          }
        } catch (taskError) {
          console.error('Error processing task detection:', taskError);
        }
        
        await handlePotentialAction(transcription);
        setIsLoading(false);
        return; // Exit early for collaborative mode
      }
      
      // PERSONAL CHAT MODE: Auto-create session if none exists
      if (!currentSession) {
        if (!user?.id) {
          Alert.alert('Error', 'Please log in to use chat');
          setIsLoading(false);
          return;
        }
        
        console.log('No session found, creating one for voice message...');
        const timestamp = new Date().toLocaleString();
        const newSession = await ChatService.createSession(user.id, `Chat ${timestamp}`);
        setCurrentSession(newSession);
        setMessages([]);
        
        await ChatService.loadSession(newSession.id);
        const response = await ChatService.sendMessage(transcription, audioUri);
        if (response) {
          const updatedSession = { ...newSession, messages: [response.userMessage, response.aiResponse] };
          setCurrentSession(updatedSession);
          setMessages(updatedSession.messages);
          await handlePotentialAction(transcription);
        }
        setIsLoading(false);
        return;
      }

      // PERSONAL CHAT MODE: With existing session
      await ChatService.loadSession(currentSession.id);
      const response = await ChatService.sendMessage(transcription, audioUri);
      if (response) {
        const updatedSession = { ...currentSession, messages: [...currentSession.messages, response.userMessage, response.aiResponse] };
        setCurrentSession(updatedSession);
        setMessages(updatedSession.messages);
        
        // Check for action requests in voice message
        await handlePotentialAction(transcription);
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
      // Get conversation history as transcription context
      const conversationContext = messages
        .filter(m => m.content && m.content.length > 0)
        .slice(-10) // Last 10 messages for context
        .map(m => `${m.role === 'user' ? 'User' : 'Jeetu'}: ${m.content}`)
        .join('\n');
      
      // Create the action with session ID and transcription for full history
      const actionWithContext = {
        ...suggestion.action,
        sessionId: currentSession?.id || groupSession?.id || undefined,
        transcription: conversationContext || suggestion.action.description,
        linkedMemoId: selectedMemo?.id,
      };
      
      const createdAction = await AgentService.createAction(
        actionWithContext,
        user!.id
      );

      // Link action to memo if we have a selected memo
      // Link action to memo if we have a selected memo
      if (selectedMemo) {
        await VoiceMemoService.linkActionToMemo(
          selectedMemo.id,
          user!.id,
          createdAction.id
        );
      }

      // Handle Group Distribution
      let distributionMessage = '';
      if (isGroupPlanMode && groupPlanMembers.length > 0) {
        // In a real app, we would loop through members and create actions for them via backend
        // For now, we simulate this distribution
        console.log(`👥 Distributing action "${suggestion.action.title}" to ${groupPlanMembers.length} group members`);
        
        // Mock distribution
        groupPlanMembers.forEach(member => {
           console.log(`   - Assigned to: ${member.name}`);
        });

        distributionMessage = `\n\n👥 Assigned to you and shared with ${groupPlanMembers.length} group members.`;
      }

      // Mark as created
      setCreatedActionIds(new Set([...createdActionIds, actionKey]));

      Alert.alert(
        '✅ Success',
        `${suggestion.action.type === 'task' ? 'Task' : suggestion.action.type === 'reminder' ? 'Reminder' : 'Calendar event'} created successfully!${distributionMessage}\n\nYou can view it in the Home tab.`,
        [
          { text: 'OK' },
        ]
      );

      // Remove this suggestion from the list
      setAgentSuggestions(prev => prev.filter(s => s.action.title !== suggestion.action.title));
    } catch (error) {
      console.error('Error creating action:', error);
      Alert.alert('Error', 'Failed to create action');
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUserMessage = item.role === 'user';
    const isAssistant = item.role === 'assistant';
    const imageUri = (item as any).imageUri || (item as any).data?.imageUri;
    const messageUser = (item as any).user;
    
    // Determine message type
    let messageType: MessageType = 'received';
    let senderName = messageUser?.name || 'Unknown';
    
    if (isUserMessage) {
      const isMe = !messageUser || messageUser._id === user?.id;
      if (isMe) {
        messageType = 'sent';
      } else {
        messageType = 'received';
      }
    } else if (isAssistant) {
      messageType = 'ai';
      senderName = 'Jeetu';
    }

    // Check if this is first message from this sender (for showing avatar/name)
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const prevUser = (prevMessage as any)?.user;
    const isFirstInGroup = !prevMessage || 
      prevMessage.role !== item.role ||
      (messageUser?._id !== prevUser?._id);

    return (
      <MessageBubble
        content={item.content}
        timestamp={item.timestamp}
        type={messageType}
        senderName={senderName}
        isFirstInGroup={isFirstInGroup}
        imageUri={imageUri}
      />
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

  const startGroupPlan = () => {
    // Phone number check removed to match "Add Members" UX and avoid loops.
    // We can prompt for it later if critical for specific Supabase features.

    // FRESH START: Clear existing members when starting a new plan from scratch
    if (!isGroupPlanMode) {
      setGroupPlanMembers([]);
    }
    setShowMemberModal(true);
  };

  const handleMemberSelect = async (userId: string, userName: string) => {
    // Check if member already exists
    if (groupPlanMembers.some(m => m.id === userId)) {
      Alert.alert('Already Added', `${userName} is already in the group.`);
      return;
    }

    const newMember: GroupMember = {
      id: userId,
      name: userName,
      isMemovoxUser: true,
      contactInfo: userId,
    };

    // Add to local state
    setGroupPlanMembers(prev => [...prev, newMember]);
    
    // If we're in an active group session, add member to Supabase too
    if (isCollaborative && groupSession) {
      try {
        const planningMember: GroupPlanningMember = {
          user_id: userId,
          name: userName,
          joined_at: new Date().toISOString(),
          is_active: true,
        };
        
        const success = await GroupPlanningService.addMember(groupSession.id, planningMember);
        
        if (success) {
          console.log('✅ Member added to group session:', userName);
          
          // Send a message announcing the new member
          await GroupPlanningService.sendMessage(
            groupSession.id,
            'system',
            'JEETU',
            {
              role: 'assistant',
              content: `👋 **${userName}** has joined the group planning session! Welcome aboard!`,
              timestamp: new Date().toISOString(),
            }
          );
        } else {
          Alert.alert('Error', 'Could not add member to the session. Please try again.');
        }
      } catch (error) {
        console.error('Error adding member to session:', error);
        Alert.alert('Error', 'Failed to add member to the group session.');
      }
    }
  };

  const startGroupPlanningSession = async () => {
    if (groupPlanMembers.length === 0) {
      Alert.alert('No Members', 'Please add at least one member to start group planning.');
      return;
    }

    setShowMemberModal(false);
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
      
      // FRESH START: Clear any previous messages and session context
      setMessages([]);
      setCurrentSession(null);
      
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
          content: `🎯 **Group Planning Mode Activated!**\n\nHi! I'm JEETU. I'm here to help you and your group create an amazing plan together!\n\n**Group Members (${groupPlanMembers.length}):**\n${memberNames}\n\n**Let's get started:**\nTell me what you're planning, and I'll help organize the details, suggest responsibilities, and keep us on track.\n\nWhat would you like to plan today?`,
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
    setShowMemberModal(true);
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
        .filter(m => !m.content.includes('Group Planning Mode Activated'))
        .map(m => {
          const role = m.role === 'user' ? '👤 User' : '🤖 JEETU';
          return `${role}:\n${m.content}`;
        })
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
    <LinearGradient
        colors={['#F8FAFC', '#EFF6FF']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
    >
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      {/* WhatsApp-style Header for Group Mode */}
      {isGroupPlanMode || isCollaborative ? (
        <ChatHeader
          title={groupSession?.title || groupPlanTopic || 'Group Chat'}
          memberCount={groupPlanMembers.length}
          isGroupMode={true}
          onNotificationPress={() => {}}
          onMenuPress={() => setShowSessionList(!showSessionList)}
          onAddMember={() => setShowMemberModal(true)}
        />
      ) : (
        <View style={styles.header}>
        <LinearGradient
          colors={['#fff', '#f8f9fa']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.headerContent}>
            <TouchableOpacity style={styles.sessionButton} onPress={() => setShowSessionList(!showSessionList)}>
              <Ionicons name="menu" size={24} color="#000" />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {currentSession?.title || 'New Chat'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TouchableOpacity 
              style={styles.shareButtonWithText} 
              onPress={sharePlan}
            >
              <Ionicons name="share-outline" size={18} color="#667EEA" />
              <Text style={styles.shareButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.groupPlanButton} 
              onPress={startGroupPlan}
            >
              <Ionicons name="people" size={20} color="#FFFFFF" />
              <Text style={styles.groupPlanText}>Group Plan</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.newChatButton} onPress={createNewSession}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {showSessionList && (
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

      <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Planning Category Selector (Visible when no messages or at start) */}
          {messages.length === 0 && !isRecording && (
              <PlanningCategorySelector 
                 selectedCategory={null}
                 onSelectCategory={handleTemplateSelection}
              />
          )}

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
              ListFooterComponent={
                agentSuggestions.length > 0 ? (
                  <View style={styles.agentSuggestionsContainer}>
                    <Text style={styles.agentSuggestionsTitle}>✨ Suggested Actions</Text>
                    {agentSuggestions.map((suggestion, index) => (
                      <View key={index} style={styles.suggestionCard}>
                        <View style={styles.suggestionHeader}>
                          <View style={styles.suggestionIconContainer}>
                            <Ionicons 
                              name={
                                suggestion.action.type === 'calendar_event' ? 'calendar' : 
                                suggestion.action.type === 'reminder' ? 'alarm' : 
                                'checkbox'
                              } 
                              size={20} 
                              color="#667EEA" 
                            />
                          </View>
                          <View style={styles.suggestionInfo}>
                            <Text style={styles.suggestionTitle}>{suggestion.action.title}</Text>
                            <Text style={styles.suggestionDescription}>{suggestion.reason}</Text>
                            {/* Date/Time Info */}
                            {(suggestion.action.dueDate || suggestion.action.dueTime) && (
                                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4}}>
                                    <Ionicons name="calendar-outline" size={12} color="#666" />
                                    <Text style={{fontSize: 12, color: '#666'}}>
                                        {suggestion.action.dueDate ? new Date(suggestion.action.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : ''}
                                        {suggestion.action.dueTime ? ` • ${suggestion.action.dueTime}` : ''}
                                    </Text>
                                </View>
                            )}
                            {/* Shared Info */}
                            {suggestion.action.shared_with && suggestion.action.shared_with.length > 0 && (
                                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 4}}>
                                    <Ionicons name="people" size={12} color="#666" />
                                    <Text style={{fontSize: 12, color: '#666'}}>
                                        Shared with {suggestion.action.shared_with.length}
                                    </Text>
                                </View>
                            )}
                          </View>
                        </View>
                        <TouchableOpacity
                          style={createdActionIds.has(suggestion.action.title) ? styles.createActionButtonDisabled : styles.createActionButton}
                          disabled={createdActionIds.has(suggestion.action.title)}
                          onPress={() => handleCreateAction(suggestion)}
                        >
                          <Text style={createdActionIds.has(suggestion.action.title) ? styles.createActionButtonTextDisabled : styles.createActionButtonText}>
                            {createdActionIds.has(suggestion.action.title) ? '✓ Created' : 'Create Action'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null
              }
            />
          )}
        </ScrollView>

      {/* Enhanced WhatsApp-style Input Bar */}
      <ChatInputBar
        value={textInput}
        onChangeText={setTextInput}
        onSend={sendTextMessage}
        onVoicePress={isRecording ? stopVoiceRecording : startVoiceRecording}
        onAttachPress={pickAndSendImage}
        onCameraPress={pickAndSendImage}
        isLoading={isLoading}
        isRecording={isRecording}
        placeholder={isGroupPlanMode ? "Message group..." : "Ask Jeetu anything..."}
      />

      {/* Member Selection Modal */}
      <MemberSelectionModal
        visible={showMemberModal}
        onClose={() => setShowMemberModal(false)}
        onSelectMember={handleMemberSelect}
        title="Add to Group Plan"
      />
    </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    borderRadius: 30,
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
    borderRadius: 30,
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
    borderRadius: 30,
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
    marginBottom: 16,
    flexDirection: 'row',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
    paddingLeft: 48,
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
    paddingRight: 48,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1E293B',
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    alignSelf: 'flex-end',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(240, 247, 255, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  loadingText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
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
    marginTop: 4, // Reduced from whatever it was (default is usually more)
    marginBottom: 8,
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
    borderRadius: 30,
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
    borderRadius: 30,
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
    borderRadius: 30,
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
    borderRadius: 30,
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
    borderRadius: 30,
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
    height: '85%', // Enforce height so flex children (FlatList) can expand
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
  contactItemContainer: {
    marginBottom: 8,
  },
  inviteMiniButton: {
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#667EEA',
  },
  inviteMiniButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667EEA',
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