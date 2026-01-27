// app/(tabs)/home.tsx

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
  Animated,
  Dimensions,
  TextInput,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import StorageService from '../../src/services/StorageService';
import PersonaService from '../../src/services/PersonaService';
import NotificationService from '../../src/services/NotificationService';
import VoiceMemoService from '../../src/services/VoiceMemoService';
import AuthService from '../../src/services/AuthService';
import AgentService from '../../src/services/AgentService';
import AIService from '../../src/services/AIService';
import { supabase } from '../../src/config/supabase';
import { User, VoiceMemo, UserPersona, AgentAction, CompletionStats, MemoCategory } from '../../src/types';
import { COLORS, GRADIENTS, CATEGORY_COLORS, CATEGORY_ICONS, TYPE_BADGES } from '../../src/constants';
import { formatRelativeTime, sortByDate } from '../../src/utils';
import CompletionRing from '../../src/components/CompletionRing';
import CalendarWidget from '../../src/components/CalendarWidget';
import SmartTaskCard from '../../src/components/SmartTaskCard';
import { Ionicons } from '@expo/vector-icons';
import SmartActionCard from '../../src/components/SmartActionCard';
import GradientHero from '../../src/components/GradientHero';
import PlanningCategorySelector from '../../src/components/PlanningCategorySelector';
import TaskOptionsModal from '../../src/components/TaskOptionsModal';
import MemberSelectionModal from '../../src/components/MemberSelectionModal';
import AnimatedIconButton from '../../src/components/AnimatedIconButton';
import AnimatedActionButton from '../../src/components/AnimatedActionButton';
import TaskMenu from '../../src/components/TaskMenu';
import TrialBanner from '../../src/components/TrialBanner';
import GoogleCalendarSync from '../../src/components/GoogleCalendarSync';
import NotificationModal from '../../src/components/NotificationModal';
import SmartPlanningModal from '../../src/components/planning/SmartPlanningModal';
import IllustrativeTaskBuilder from '../../src/components/planning/IllustrativeTaskBuilder';
import { getHealthTasks, getIdeasTasks, getDailyTasks, getChoresTasks, getCategoryQuestions } from '../../src/config/planningQuestions';
import { cleanImportedText, parseWhatsAppExport } from '../../src/utils/parsers';
import { formatMemoForExport } from '../../src/utils/exportUtils';
import { Share as RNShare } from 'react-native'; // Resize alias if needed or just use Share

import { Bell, MessageSquare, Settings, Mic, Layout, CheckCircle, Calendar, Lightbulb, Bookmark, Trash2, Share2, FileText, Search, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<string>('');
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [savedMemos, setSavedMemos] = useState<Set<string>>(new Set());
  const [todayActions, setTodayActions] = useState<AgentAction[]>([]);
  const [upcomingActions, setUpcomingActions] = useState<AgentAction[]>([]);
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [allActions, setAllActions] = useState<AgentAction[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [selectedTaskIdForSharing, setSelectedTaskIdForSharing] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Audio playback state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AgentAction | null>(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  
  // Smart Planning Modal State
  const [showSmartPlanningModal, setShowSmartPlanningModal] = useState(false);
  const [showTaskBuilder, setShowTaskBuilder] = useState(false);
  const [planningCategory, setPlanningCategory] = useState<string>('');
  const [planningAnswers, setPlanningAnswers] = useState<Record<string, any>>({});
  const [suggestedTasks, setSuggestedTasks] = useState<{ title: string; icon: string }[]>([]);
  
  // Animation for background color
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false, // Color interpolation requires false
        }),
        Animated.timing(colorAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.primary, COLORS.accent || '#ec4899'], // Indigo to Pink
  });

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen comes into focus (e.g., after creating tasks in chat)
  useFocusEffect(
    useCallback(() => {
      console.log('Home screen focused - reloading data...');
      loadData();
    }, [])
  );

  // Realtime Notifications Listener
  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime notification listener for', user.id);
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          console.log('🔔 Realtime notification received:', payload);
          
          // 1. Refresh data (badge count and lists)
          loadData();
          
          // 2. Schedule local alert immediately to notify user
          const newNotif = payload.new;
          if (newNotif) {
              const notificationObj = {
                  id: newNotif.id,
                  userId: newNotif.user_id,
                  memoId: newNotif.data?.memoId || '',
                  type: newNotif.type,
                  title: newNotif.title,
                  body: newNotif.body,
                  scheduledFor: new Date().toISOString(),
                  sent: false,
                  createdAt: newNotif.created_at,
                  data: newNotif.data
              };
              // Schedule immediately (since s/he just got it)
              await NotificationService.scheduleNotification(notificationObj as any);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Audio playback functions
  const handleCategoryPress = (category: string) => {
    if (category === 'Health') {
        router.push({ pathname: '/(tabs)/chat', params: { template: 'Health' } });
    } else {
        setSelectedCategory(prev => prev === category ? null : category);
    }
  };

  const handleShareTask = async (taskId: string) => {
    setSelectedTaskIdForSharing(taskId);
    setMemberModalVisible(true);
  };

  const handleMemberSelected = async (targetUserId: string, targetUserName: string) => {
    if (!selectedTaskIdForSharing || !user) return;

    try {
      const success = await AgentService.shareAction(
        selectedTaskIdForSharing, 
        targetUserId, 
        targetUserName, 
        user.name || 'A friend' // Pass sharer name
      );
      if (success) {
        Alert.alert('Success', `Task shared with ${targetUserName}`);
      } else {
        Alert.alert('Error', 'Failed to share task');
      }
    } catch (error) {
      console.error('Error sharing task:', error);
      Alert.alert('Error', 'An error occurred while sharing');
    }
  };

  const playAudio = async (memo: VoiceMemo) => {
    try {
      // If already playing this memo, pause it
      if (playingMemoId === memo.id && isPlaying) {
        await sound?.pauseAsync();
        setIsPlaying(false);
        return;
      }

      // If playing different memo, stop and unload
      if (sound && playingMemoId !== memo.id) {
        await sound.unloadAsync();
        setSound(null);
      }

      // If same memo but paused, resume
      if (playingMemoId === memo.id && sound) {
        await sound.playAsync();
        setIsPlaying(true);
        return;
      }

      // Load and play new audio
      if (!memo.audioUri) {
        Alert.alert('No Audio', 'This memo has no audio recording');
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: memo.audioUri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setPlayingMemoId(null);
          }
        }
      );

      setSound(newSound);
      setPlayingMemoId(memo.id);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Playback Error', 'Unable to play audio');
    }
  };

  const stopAudio = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setPlayingMemoId(null);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }
  };

  const processImportedText = async (text: string, title: string) => {
    try {
      if (!text || text.trim().length === 0) {
        Alert.alert('Empty Content', 'The imported content appears to be empty.');
        return;
      }

      // Initial cleanup
      let parsedText = text;
      // Heuristic: if it looks like a WhatsApp export (contains many timestamps), try to clean it
      if (text.match(/\d{1,2}:\d{2}/) && (text.includes('Messages') || text.includes('encrypted'))) {
        parsedText = parseWhatsAppExport(text);
      } else {
        parsedText = cleanImportedText(text);
      }

      const newMemo: VoiceMemo = {
        id: Date.now().toString(),
        userId: user?.id || 'current-user',
        audioUri: 'imported-text', // Special marker
        transcription: parsedText,
        category: 'Notes',
        type: 'note',
        title: `Import: ${title}`,
        duration: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCompleted: false
      };

      // Use VoiceMemoService to save (handles sync and local fallback)
      await VoiceMemoService.saveMemo(newMemo);
      
      // Trigger AI Analysis in background
      Alert.alert(
        'Import Successful', 
        'Content imported! AI is analyzing it now...',
        [{ text: 'OK', onPress: () => loadData() }]
      );
      
      // Analyze
      try {
        const result = await AIService.analyzeMemo(newMemo.transcription);
        const updatedMemo = { ...newMemo, aiAnalysis: result.analysis };
        
        // Update memo with analysis
        await VoiceMemoService.updateMemo(updatedMemo);
        
        // Trigger Persona Update
        if (user) {
          const allMemos = await VoiceMemoService.getUserMemos(user.id);
          await PersonaService.updatePersona(user.id, allMemos);
        }

        loadData(); // Refresh to show analysis
      } catch (err) {
        console.error('AI Analysis failed:', err);
        // Don't show alert here to avoid spamming, just log it. The memo is saved.
      }
      
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Import Failed', 'Could not process the imported text.');
    }
  };

  const loadData = useCallback(async () => {
    try {
      // Get current user
      const userData = await AuthService.getCurrentUser();
      if (!userData) {
        console.warn('No user logged in');
        setUser(null);
        setMemos([]);
        return;
      }
      setUser(userData);

      // Get memos from Supabase
      const memosData = await VoiceMemoService.getUserMemos(userData.id);
      const sorted = sortByDate(memosData);
      console.log('Loaded memos from Supabase:', memosData.length);
      setMemos(sorted);

      // Load saved memos
      const savedMemoIds = await StorageService.getSavedMemos(userData.id);
      setSavedMemos(new Set(savedMemoIds));

      // Load persona
      const personaData = await StorageService.getUserPersona();
      setPersona(personaData);

      // Calculate urgency level based on memos
      const urgency = calculateUrgency(sorted);
      setUrgencyLevel(urgency);

      // Load agent data (today's actions, completion stats, smart suggestions)
      await loadAgentData(userData.id);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  const loadAgentData = useCallback(async (userId: string) => {
    try {
      // Get today's actions
      let today = await AgentService.getTodayActions(userId);
      
      // Sort by Priority (High > Medium > Low) then by Time
      const priorityWeights = { high: 3, medium: 2, low: 1 };
      today.sort((a, b) => {
          // 1. Priority
          const pA = priorityWeights[a.priority] || 0;
          const pB = priorityWeights[b.priority] || 0;
          if (pA !== pB) return pB - pA; // Descending (High first)

          // 2. Time
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dateA - dateB; // Ascending (Earliest first)
      });
      /*
      if (today.length === 0) {
          console.log('Using Mock Data for Dashboard Demo');
          today = await AgentService.getMockSmartActions();
      }
      */
      setTodayActions(today);

      // Get upcoming actions (next 7 days)
      const upcoming = await AgentService.getUpcomingActions(userId, 7);
      setUpcomingActions(upcoming);

      // Get completion statistics
      const stats = await AgentService.getCompletionStats(userId);
      setCompletionStats(stats);

      // Get ALL pending actions sorted by priority and date
      const pending = await AgentService.getPendingActions(userId);
      const sortedActions = pending.sort((a, b) => {
        // First sort by due date
        if (a.dueDate && b.dueDate) {
          const dateCompare = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          if (dateCompare !== 0) return dateCompare;
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        
        // Then by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority || 'low'];
        const bPriority = priorityOrder[b.priority || 'low'];
        return bPriority - aPriority;
      });

      
      // MOCK DATA FOR DEMO PURPOSES (To visualize Smart Templates)
      const demoSmartActions: AgentAction[] = [
          {
              id: 'health-check-001',
              userId: userId,
              type: 'task',
              title: 'Daily Health Goals',
              description: 'Stay hydrated and active',
              priority: 'high',
              status: 'pending',
              createdFrom: 'demo',
              createdAt: new Date().toISOString(),
              dueDate: new Date().toISOString(), // Due today
              smartTemplate: {
                  type: 'checklist',
                  items: [
                      { text: '💧 Drink 2L Water', checked: false },
                      { text: '💊 Take Multivitamin', checked: true },
                      { text: '🧘 10 min Meditation', checked: false },
                      { text: '🥗 Eat Salad', checked: false },
                      { text: '🚶 5000 Steps', checked: false }
                  ]
              }
          },
          {
            id: 'demo_health',
            userId: userId,
            type: 'task',
            title: 'Daily Steps',
            priority: 'medium',
            status: 'pending',
            createdFrom: 'demo',
            createdAt: new Date().toISOString(),
            dueDate: new Date().toISOString(), // Due today for demo
            smartTemplate: {
                type: 'health_tracker',
                currentValue: 1200,
                targetValue: 8000,
                metaLabel: '1200/8000 steps'
            }
          },
          {
            id: 'demo_gym',
            userId: userId,
            type: 'task',
            title: 'Gym Session',
            priority: 'high',
            status: 'pending',
            createdFrom: 'demo',
            createdAt: new Date().toISOString(),
            dueDate: new Date().toISOString(), // Due today for demo
            smartTemplate: {
                type: 'health_tracker',
                currentValue: 2,
                targetValue: 4,
                unit: 'hours',
                metaLabel: '2/4 hours'
            }
          },
          {
            id: 'demo_meeting',
            userId: userId,
            type: 'task',
            title: 'Meeting with Ashu',
            priority: 'high',
            status: 'pending',
            createdFrom: 'demo',
            createdAt: new Date().toISOString(),
            dueDate: new Date().toISOString(), // Due today for demo
            smartTemplate: {
                type: 'meeting_countdown',
                meetingTime: new Date(new Date().setHours(14, 30)).toISOString(),
                platform: 'meet'
            }
          }
      ];

      setAllActions([...demoSmartActions, ...sortedActions]);

      setAllActions([...demoSmartActions, ...sortedActions]);

      // Fetch precise notification count
      const count = await NotificationService.getUnreadNotificationCount(userId);
      setUnreadCount(count);

    } catch (error) {
      console.error('Error loading agent data:', error);
    }
  }, []);

  const calculateUrgency = (allMemos: VoiceMemo[]): string => {
    // Count recent action items (events/reminders from past week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const pendingItems = allMemos.filter(memo => {
      const memoDate = new Date(memo.createdAt);
      const isRecent = memoDate > oneWeekAgo;
      const isActionable = memo.type === 'event' || memo.type === 'reminder';
      return isRecent && isActionable;
    }).length;

    if (pendingItems >= 5) return '🔴 High - Multiple action items pending';
    if (pendingItems >= 3) return '🟡 Medium - Several tasks need attention';
    if (pendingItems >= 1) return '🟢 Low - Few action items noted';
    return '⚪ Clear - No pending action items';
  };

  const getActionItems = (allMemos: VoiceMemo[]): VoiceMemo[] => {
    // Get all memos sorted by date, most recent first
    return allMemos
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const deleteMemo = async (memoId: string) => {
    try {
      if (!user) {
        console.warn('No user logged in');
        return;
      }
      await VoiceMemoService.deleteMemo(memoId, user.id);
      // Remove from local state
      setMemos(memos.filter(memo => memo.id !== memoId));
      // Recalculate urgency
      const updatedMemos = memos.filter(memo => memo.id !== memoId);
      const urgency = calculateUrgency(updatedMemos);
      setUrgencyLevel(urgency);
    } catch (error) {
      console.error('Error deleting memo:', error);
    }
  };

  const saveMemoForLater = async (memoId: string, title: string) => {
    try {
      const newSavedMemos = new Set(savedMemos);
      if (newSavedMemos.has(memoId)) {
        newSavedMemos.delete(memoId);
        Alert.alert('Removed', `"${title}" removed from saved items`);
      } else {
        newSavedMemos.add(memoId);
        // Remove from home page display
        setMemos(memos.filter(memo => memo.id !== memoId));
        Alert.alert('Saved!', `"${title}" saved for later. It's now only visible in Notes tab.`);
      }
      setSavedMemos(newSavedMemos);
      // Save to storage
      if (user?.id) {
        await StorageService.setSavedMemos(user.id, Array.from(newSavedMemos));
      }
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };

  const shareTaskConversation = async (action: AgentAction) => {
    try {
      const conversationText = `📋 Task: ${action.title}\n\n` +
        `Priority: ${action.priority?.toUpperCase()}\n` +
        `Status: ${action.status}\n` +
        `${action.dueDate ? `Due: ${new Date(action.dueDate).toLocaleDateString()}${action.dueTime ? ` at ${action.dueTime}` : ''}\n` : ''}` +
        `${action.description ? `\nDescription:\n${action.description}\n` : ''}` +
        `\nCreated: ${new Date(action.createdAt).toLocaleDateString()}\n` +
        `${action.completedAt ? `Completed: ${new Date(action.completedAt).toLocaleDateString()}\n` : ''}` +
        `\n✨ Managed with MemoVox AI`;

      await Share.share({
        message: conversationText,
        title: `Task: ${action.title}`,
      });
    } catch (error) {
      console.error('Error sharing task:', error);
    }
  };

  const copyTaskToClipboard = async (action: AgentAction) => {
    try {
      const conversationText = `📋 ${action.title}\n` +
        `Priority: ${action.priority?.toUpperCase()} | Status: ${action.status}\n` +
        `${action.dueDate ? `Due: ${new Date(action.dueDate).toLocaleDateString()}` : 'No due date'}`;
      
      Clipboard.setString(conversationText);
      Alert.alert('✓ Copied', 'Task details copied to clipboard');
    } catch (error) {
      console.error('Error copying task:', error);
    }
  };

  const toggleComplete = async (memo: VoiceMemo) => {
    try {
      if (!user) {
        console.warn('No user logged in');
        return;
      }

      let updatedMemo: VoiceMemo | null;
      
      if (memo.isCompleted) {
        // Uncomplete the memo
        updatedMemo = await VoiceMemoService.uncompleteMemo(memo.id, user.id);
      } else {
        // Complete the memo
        updatedMemo = await VoiceMemoService.completeMemo(memo.id, user.id);
      }

      if (updatedMemo) {
        // Update local state
        setMemos(memos.map(m => m.id === memo.id ? updatedMemo! : m));
        Alert.alert('✓ Updated', memo.isCompleted ? 'Memo marked as incomplete' : 'Memo marked as complete');
      }
    } catch (error) {
      console.error('Error toggling memo completion:', error);
    }
  };

  const shareMemo = async (memo: VoiceMemo) => {
    try {
      // Create shareable text content
      const shareText = `📝 ${memo.title || 'Voice Memo'}\n\n` +
        `${memo.transcription}\n\n` +
        `${memo.aiAnalysis?.actionItems && memo.aiAnalysis.actionItems.length > 0 ? `\n✓ ${memo.aiAnalysis.actionItems.length} action item${memo.aiAnalysis.actionItems.length > 1 ? 's' : ''}\n` : ''}` +
        `\n📱 Shared from MemoVox`;
      
      // Use native share dialog (supports all social media platforms)
      const result = await Share.share({
        message: shareText,
        title: memo.title || 'Voice Memo',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type (iOS)
          console.log('Shared with:', result.activityType);
        } else {
          // Shared (Android)
          console.log('Memo shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
        console.log('Share cancelled');
      }
    } catch (error) {
      console.error('Error sharing memo:', error);
      Alert.alert('Share Failed', 'Unable to share memo. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                 <TouchableOpacity style={{marginRight: 12}} onPress={() => router.push('/settings-screen')}>
                    <Ionicons name="menu" size={28} color={COLORS.textPrimary} />
                 </TouchableOpacity>
                 <View>
                     <Text style={styles.greeting}>Hi {user?.name?.split(' ')[0] || 'There'} 👋</Text>
                     <Text style={styles.subtitle}>Let's be productive today</Text>
                 </View>
              </View>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => setNotificationModalVisible(true)}>
                <Ionicons name="notifications-outline" size={24} color="#000" />
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButton} onPress={() => router.push('/(tabs)/social')}>
                <Ionicons name="people-outline" size={24} color="#000" />
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>2</Text> 
                </View>
            </TouchableOpacity>
          </View>
      </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
            <TextInput
                style={styles.searchInput}
                placeholder="Search tasks..."
                placeholderTextColor={COLORS.gray[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
            />
        </View>

        {/* <GradientHero /> Banner Removed as per user request */}





        {/* Category Filters */}
        <PlanningCategorySelector 
            selectedCategory={selectedCategory} 
            onSelectCategory={(cat) => {
              // First click: start smart planning for this category
              // Double click: just filter
              if (selectedCategory !== cat) {
                setPlanningCategory(cat);
                setShowSmartPlanningModal(true);
              }
              setSelectedCategory(prev => prev === cat ? null : cat);
            }} 
        />

        {/* Important Tasks Dashboard */}
        <View style={styles.section}>
           <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
                <Text style={styles.sectionTitle}>Important Tasks</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
                    <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
           </View>


           {todayActions
               .filter(action => (!selectedCategory || action.category === selectedCategory || (action.smartTemplate && selectedCategory === 'Health' && action.smartTemplate.type === 'health_tracker')) &&
                                 (!searchQuery || action.title.toLowerCase().includes(searchQuery.toLowerCase())))
               .slice(0, 10)
               .map((action, index) => (
               <SmartActionCard
                   key={action.id}
                   action={action}
                   index={index}
                   onPress={() => {
                        setSelectedAction(action);
                        setOptionsModalVisible(true);
                   }}
               />
           ))}
        </View>

        {/* Record Button (Floating-ish) */}
        <View style={styles.section}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/record')}>
                <LinearGradient
                    colors={['#8E2DE2', '#4A00E0'] as any}
                    style={styles.quickAction}
                >
                    <Text style={styles.quickActionIcon}>🎙️</Text>
                    <Text style={styles.quickActionText}>Quick Record</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
      </ScrollView>
      <MemberSelectionModal
        visible={memberModalVisible}
        onClose={() => setMemberModalVisible(false)}
        onSelectMember={handleMemberSelected}
        title="Share Task"
      />
      <TaskOptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        action={selectedAction}
        onAddMember={(actionId) => {
            // Logic to open MemberSelectionModal
            // We need to fetch the action first? Or just pass ID?
            // Existing Logic: handleShareTask(action.id) opens modal
            // But handleShareTask expects actionId string.
            handleShareTask(actionId);
        }}
        onMarkDone={async (actionId) => {
            if (user?.id) {
                // Optimistic Update
                setTodayActions(prev => prev.filter(a => a.id !== actionId));
                
                await AgentService.completeAction(actionId, user.id);
                // Alert.alert('Task Done', 'Great job! 🎉'); // Optional: Remove alert for smoother flow? Or keep it. 
                // User might prefer instant removal without popup. Let's keep a Toast or simple Log.
                // Keeping Alert for positive reinforcement but maybe less intrusive?
                // For now, keep logic but ensure data reloads.
                loadData(); 
            }
        }}
      />
      <NotificationModal
        visible={notificationModalVisible}
        onClose={() => {
            setNotificationModalVisible(false);
            loadData(); // Refresh badge count
        }}
        userId={user?.id || ''}
      />
      
      {/* Smart Planning Modal - Jeetu asks questions */}
      <SmartPlanningModal
        visible={showSmartPlanningModal}
        category={planningCategory}
        onClose={() => {
          setShowSmartPlanningModal(false);
          setPlanningCategory('');
        }}
        onComplete={(answers) => {
          setShowSmartPlanningModal(false);
          setPlanningAnswers(answers);
          
          // Generate suggested tasks based on answers
          let tasks: { title: string; icon: string }[] = [];
          const categoryLower = planningCategory.toLowerCase();
          
          if (categoryLower === 'health') {
            tasks = getHealthTasks(answers);
          } else if (categoryLower === 'ideas') {
            tasks = getIdeasTasks(answers);
          } else if (categoryLower === 'daily') {
            tasks = getDailyTasks(answers);
          } else if (categoryLower === 'chores') {
            tasks = getChoresTasks(answers);
          } else {
            // Default tasks for other categories
            tasks = [
              { title: `Start ${planningCategory} planning`, icon: '📝' },
              { title: 'Set goals', icon: '🎯' },
              { title: 'Create timeline', icon: '📅' },
            ];
          }
          
          setSuggestedTasks(tasks);
          setShowTaskBuilder(true);
        }}
      />
      
      {/* Illustrative Task Builder - Visual task selection */}
      <IllustrativeTaskBuilder
        visible={showTaskBuilder}
        category={planningCategory}
        categoryColor={getCategoryQuestions(planningCategory)?.color || '#8B5CF6'}
        suggestedTasks={suggestedTasks}
        answers={planningAnswers}
        onClose={() => {
          setShowTaskBuilder(false);
          setPlanningCategory('');
          setSuggestedTasks([]);
        }}
        onSave={async (tasks, trackerData) => {
          setShowTaskBuilder(false);
          
          if (!user?.id) return;
          
          try {
            // Create actual tasks from selected items
            for (const task of tasks) {
              await AgentService.createAction({
                id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                userId: user.id,
                type: 'task',
                title: task.title,
                description: `Created from ${planningCategory} planning`,
                category: planningCategory as MemoCategory,
                priority: 'medium',
                status: 'pending',
                dueDate: new Date().toISOString(),
                createdFrom: 'smart_planning',
                createdAt: new Date().toISOString(),
              } as AgentAction, user.id);
            }
            
            // Save tracker data as a special action
            if (trackerData.waterGlasses > 0 || trackerData.mood || trackerData.sleepHours) {
              await AgentService.createAction({
                id: `tracker-${Date.now()}`,
                userId: user.id,
                type: 'task',
                title: `${planningCategory} Tracking - ${new Date().toLocaleDateString()}`,
                description: `Water: ${trackerData.waterGlasses}/8, Sleep: ${trackerData.sleepHours || 'N/A'}, Mood: ${trackerData.mood || 'N/A'}, Productivity: ${trackerData.productivity}/5`,
                category: planningCategory as MemoCategory,
                priority: 'low',
                status: 'completed',
                createdFrom: 'smart_planning',
                createdAt: new Date().toISOString(),
              } as AgentAction, user.id);
            }
            
            Alert.alert(
              '✨ Plan Created!',
              `Added ${tasks.length} tasks to your ${planningCategory} plan.`,
              [{ text: 'Great!', style: 'default' }]
            );
            
            loadData(); // Refresh task list
          } catch (error) {
            console.error('Error saving plan:', error);
            Alert.alert('Error', 'Failed to save your plan. Please try again.');
          }
          
          setPlanningCategory('');
          setSuggestedTasks([]);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 0, // Moved up to maximum (SafeAreaView handles status bar)
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8, // slight adjustment for alignment
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    // Removed background and shadow as requested
  },
  headerIcon: {
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeInactive: {
    backgroundColor: '#8E8E93',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    opacity: 1,
  },
  calendarBannerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  urgencyCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  urgencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
    lineHeight: 24,
  },
  actionItemsContainer: {
    marginBottom: 12,
    gap: 8,
  },
  actionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderRadius: 0,
    marginBottom: 0,
  },
  actionItemBadges: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 8,
  },
  actionItemCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionItemCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  actionItemTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionItemTypeText: {
    fontSize: 12,
  },
  actionItemIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  actionItemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  actionItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 2,
  },
  actionItemSubtitle: {
    fontSize: 12,
    color: COLORS.gray[600],
    lineHeight: 16,
  },
  actionItemChevron: {
    fontSize: 20,
    color: COLORS.gray[400],
    marginLeft: 8,
  },
  actionItemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    overflow: 'hidden',
  },
  actionItemActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    backgroundColor: COLORS.gray[50],
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  deleteIconButton: {
    backgroundColor: '#FF6B6B',
  },
  savedIconButtonActive: {
    backgroundColor: '#FFA500',
  },
  iconButtonText: {
    fontSize: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: COLORS.error || '#FF6B6B',
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyActionText: {
    fontSize: 14,
    color: COLORS.gray[500],
    fontStyle: 'italic',
    marginBottom: 8,
  },
  urgencyLink: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  urgencyLinkText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  keywordsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  keywordChip: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  keywordText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  quickActionText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 28,
    gap: 12,
  },
  quickActionIcon: {
    fontSize: 24,
  },
  clearButton: {
    padding: 4,
  },
  searchResultsHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[800],
  },
  completionCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray[600],
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginBottom: 12,
    marginTop: -4,
  },
  emptyStateCard: {
    backgroundColor: COLORS.white,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.gray[600],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  emptyStateFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingLeft: 16,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
  },
  emptyStateCTA: {
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyStateCTAText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  // Carousel styles
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gray[300],
  },
  activeIndicator: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  bulkActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 12,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    gap: 6,
  },
  bulkActionIcon: {
    fontSize: 16,
  },
  bulkActionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  carouselCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    minHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  carouselCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 16,
  },
  carouselStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  carouselStatItem: {
    alignItems: 'center',
  },
  carouselStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  carouselStatLabel: {
    fontSize: 12,
    color: COLORS.gray[600],
    textTransform: 'uppercase',
  },
  carouselEmptyText: {
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
    marginVertical: 32,
  },
  carouselTasksList: {
    maxHeight: 280,
  },
  carouselTaskItem: {
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  carouselTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  carouselTaskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    flex: 1,
    marginRight: 8,
  },
  carouselPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityHighBadge: {
    backgroundColor: '#FFEBEE',
  },
  priorityMediumBadge: {
    backgroundColor: '#FFF3E0',
  },
  priorityLowBadge: {
    backgroundColor: '#E8F5E9',
  },
  carouselPriorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  carouselTaskTime: {
    fontSize: 12,
    color: COLORS.gray[600],
    marginBottom: 10,
  },
  carouselCompleteButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    alignSelf: 'flex-start',
  },
  carouselCompleteButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completeIconButton: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exampleCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exampleIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  exampleContent: {
    flex: 1,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  exampleDescription: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  notesPreviewContainer: {
    gap: 12,
  },
  notePreviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noteCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  noteCategoryIcon: {
    fontSize: 14,
  },
  noteCategoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteTimeText: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  notePreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  notePreviewText: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  noteActionIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  noteActionText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  memoTaskCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memoTaskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memoTaskBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  typeBadge: {
    backgroundColor: COLORS.secondary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memoPriorityHighBadge: {
    backgroundColor: '#FFEBEE',
  },
  memoPriorityMediumBadge: {
    backgroundColor: '#FFF3E0',
  },
  memoPriorityLowBadge: {
    backgroundColor: '#E8F5E9',
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  memoTaskTime: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  memoTaskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  memoTaskTranscription: {
    fontSize: 14,
    color: COLORS.gray[700],
    lineHeight: 20,
  },
  actionIndicator: {
    backgroundColor: COLORS.green[50],
    padding: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  actionIndicatorText: {
    fontSize: 13,
    color: COLORS.green[700],
    fontWeight: '600',
  },
  memoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  completionBadge: {
    backgroundColor: '#D1E7DD',
    padding: 8,
    borderRadius: 12,
    marginTop: 12,
  },
  // New Styles for Gradient Layout
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  categoryItem: {
    alignItems: 'center',
    width: (width - 64) / 4,
  },
  categoryCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray[800],
    textAlign: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  completionBadgeText: {
    fontSize: 13,
    color: '#0F5132',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
    height: '100%',
  },
});