// app/(tabs)/home.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import StorageService from '../../src/services/StorageService';
import PersonaService from '../../src/services/PersonaService';
import VoiceMemoService from '../../src/services/VoiceMemoService';
import AuthService from '../../src/services/AuthService';
import AgentService from '../../src/services/AgentService';
import { User, VoiceMemo, UserPersona, AgentAction, CompletionStats } from '../../src/types';
import { COLORS, GRADIENTS, CATEGORY_COLORS, CATEGORY_ICONS, TYPE_BADGES } from '../../src/constants';
import { formatRelativeTime, sortByDate } from '../../src/utils';
import CompletionRing from '../../src/components/CompletionRing';
import CalendarWidget from '../../src/components/CalendarWidget';
import SmartTaskCard from '../../src/components/SmartTaskCard';
import AnimatedIconButton from '../../src/components/AnimatedIconButton';
import AnimatedActionButton from '../../src/components/AnimatedActionButton';
import TaskMenu from '../../src/components/TaskMenu';
import TrialBanner from '../../src/components/TrialBanner';
import GoogleCalendarSync from '../../src/components/GoogleCalendarSync';

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
  const [smartSuggestions, setSmartSuggestions] = useState<AgentAction[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [allActions, setAllActions] = useState<AgentAction[]>([]);
  
  // Audio playback state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Audio playback functions
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

  const loadData = async () => {
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
  };

  const loadAgentData = async (userId: string) => {
    try {
      // Get today's actions
      const today = await AgentService.getTodayActions(userId);
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
      setAllActions(sortedActions);

      // Get smart suggestions (old/unacted tasks)
      const suggestions = await AgentService.getSmartSuggestions(userId);
      setSmartSuggestions(suggestions.slice(0, 3)); // Show top 3
    } catch (error) {
      console.error('Error loading agent data:', error);
    }
  };

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

  const renderCarouselCard = (index: number) => {
    if (index === 0) {
      // Progress Card
      return (
        <View style={styles.carouselCard}>
          <Text style={styles.carouselCardTitle}>📊 Your Progress</Text>
          {completionStats && completionStats.totalTasks > 0 ? (
            <>
              <CompletionRing percentage={completionStats.percentage} size={100} />
              <View style={styles.carouselStatsGrid}>
                <View style={styles.carouselStatItem}>
                  <Text style={styles.carouselStatValue}>{completionStats.completedTasks}</Text>
                  <Text style={styles.carouselStatLabel}>Done</Text>
                </View>
                <View style={styles.carouselStatItem}>
                  <Text style={styles.carouselStatValue}>{completionStats.totalTasks - completionStats.completedTasks}</Text>
                  <Text style={styles.carouselStatLabel}>Pending</Text>
                </View>
                <View style={styles.carouselStatItem}>
                  <Text style={styles.carouselStatValue}>
                    {completionStats.trend === 'up' ? '📈' : completionStats.trend === 'down' ? '📉' : '➡️'}
                  </Text>
                  <Text style={styles.carouselStatLabel}>Trend</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.carouselEmptyText}>No tasks yet. Create some to track progress!</Text>
          )}
        </View>
      );
    } else if (index === 1) {
      // Today's Tasks Card
      return (
        <View style={styles.carouselCard}>
          <Text style={styles.carouselCardTitle}>📅 Today's Tasks</Text>
          {todayActions.length > 0 ? (
            <ScrollView style={styles.carouselTasksList} showsVerticalScrollIndicator={false}>
              {todayActions.slice(0, 3).map((action) => (
                <View key={action.id} style={styles.carouselTaskItem}>
                  <View style={styles.carouselTaskHeader}>
                    <Text style={styles.carouselTaskTitle} numberOfLines={1}>{action.title}</Text>
                    <View style={[
                      styles.carouselPriorityBadge,
                      action.priority === 'high' && styles.priorityHighBadge,
                      action.priority === 'medium' && styles.priorityMediumBadge,
                      action.priority === 'low' && styles.priorityLowBadge,
                    ]}>
                      <Text style={styles.carouselPriorityText}>{action.priority?.toUpperCase()}</Text>
                    </View>
                  </View>
                  {action.dueTime && (
                    <Text style={styles.carouselTaskTime}>⏰ {action.dueTime}</Text>
                  )}
                  <TouchableOpacity
                    style={styles.carouselCompleteButton}
                    onPress={async () => {
                      if (user) {
                        await AgentService.completeAction(action.id, user.id);
                        await loadAgentData(user.id);
                        Alert.alert('✓ Done!', `"${action.title}" completed`);
                      }
                    }}
                  >
                    <Text style={styles.carouselCompleteButtonText}>✓ Complete</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.carouselEmptyText}>Nothing due today! 🎉</Text>
          )}
        </View>
      );
    } else {
      // This Week Calendar Card
      return (
        <View style={styles.carouselCard}>
          <Text style={styles.carouselCardTitle}>📅 This Week</Text>
          <CalendarWidget 
            actions={[...todayActions, ...upcomingActions]}
            onDatePress={(date) => {
              const dateActions = [...todayActions, ...upcomingActions].filter(action => {
                if (!action.dueDate) return false;
                const actionDate = new Date(action.dueDate);
                return (
                  actionDate.getDate() === date.getDate() &&
                  actionDate.getMonth() === date.getMonth() &&
                  actionDate.getFullYear() === date.getFullYear()
                );
              });
              
              if (dateActions.length > 0) {
                const taskList = dateActions.map((a, idx) => `${idx + 1}. ${a.title}`).join('\n');
                Alert.alert(
                  `📅 ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
                  `${dateActions.length} task(s):\n\n${taskList}`,
                  [{ text: 'OK' }]
                );
              } else {
                Alert.alert(
                  `📅 ${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
                  'No tasks scheduled for this date.'
                );
              }
            }}
          />
        </View>
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Trial Banner */}
        <TrialBanner />

        {/* Header with Icons */}
        <LinearGradient colors={GRADIENTS.primary as any} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'}! 👋</Text>
              <Text style={styles.subtitle}>
                What would you like to capture today?
              </Text>
            </View>
            
            <View style={styles.headerIcons}>
              {/* Notifications Icon - Shows today's action items count */}
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={() => {
                  // Filter actions for today and overdue
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  const todayActions = allActions.filter(action => {
                    if (!action.dueDate) return false;
                    const dueDate = new Date(action.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate.getTime() === today.getTime();
                  });
                  
                  const overdueActions = allActions.filter(action => {
                    if (!action.dueDate) return false;
                    const dueDate = new Date(action.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    return dueDate.getTime() < today.getTime() && action.status === 'pending';
                  });
                  
                  const totalCount = todayActions.length + overdueActions.length;
                  
                  if (totalCount === 0) {
                    Alert.alert(
                      '✅ All Clear!',
                      'You have no action items due today or overdue.\n\nGreat job staying on top of things! 🎉',
                      [{ text: 'Awesome!' }]
                    );
                  } else {
                    let message = '';
                    
                    if (overdueActions.length > 0) {
                      message += `⚠️ OVERDUE (${overdueActions.length}):\n`;
                      message += overdueActions.slice(0, 3).map(a => `• ${a.title}`).join('\n');
                      if (overdueActions.length > 3) {
                        message += `\n• ...and ${overdueActions.length - 3} more`;
                      }
                      message += '\n\n';
                    }
                    
                    if (todayActions.length > 0) {
                      message += `📅 TODAY (${todayActions.length}):\n`;
                      message += todayActions.slice(0, 3).map(a => `• ${a.title}`).join('\n');
                      if (todayActions.length > 3) {
                        message += `\n• ...and ${todayActions.length - 3} more`;
                      }
                    }
                    
                    Alert.alert(
                      `📋 ${totalCount} Task${totalCount > 1 ? 's' : ''}`,
                      message,
                      [
                        { text: 'Dismiss', style: 'cancel' },
                        {
                          text: 'View All Tasks',
                          onPress: () => {
                            // Scroll to "Let's get this done" section
                            // User can see all tasks there
                          }
                        }
                      ]
                    );
                  }
                }}
              >
                <Text style={styles.headerIcon}>🔔</Text>
                {(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  const count = allActions.filter(action => {
                    if (!action.dueDate || action.status !== 'pending') return false;
                    const dueDate = new Date(action.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    // Include today's tasks and overdue tasks
                    return dueDate.getTime() <= today.getTime();
                  }).length;
                  
                  return count > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{count}</Text>
                    </View>
                  ) : null;
                })()}
              </TouchableOpacity>

              {/* Messages Icon - Shows group plans count (placeholder for future feature) */}
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={() => {
                  Alert.alert(
                    'Group Plans',
                    'Collaborate with others on shared tasks! This feature is coming soon.\n\n💡 You\'ll be able to:\n• Share memos with groups\n• Collaborate on tasks\n• Track team progress',
                    [{ text: 'Got it!' }]
                  );
                }}
              >
                <Text style={styles.headerIcon}>💬</Text>
                {/* Placeholder badge - will show actual count when feature is implemented */}
                <View style={[styles.badge, styles.badgeInactive]}>
                  <Text style={styles.badgeText}>0</Text>
                </View>
              </TouchableOpacity>

              {/* Settings Icon */}
              <TouchableOpacity 
                style={styles.headerIconButton}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Text style={styles.headerIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Google Calendar Connect Banner */}
        <View style={styles.calendarBannerSection}>
          <GoogleCalendarSync />
        </View>

        {/* Empty State for New Users */}
        {memos.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>🎙️</Text>
            <Text style={styles.emptyStateTitle}>Welcome to MemoVox!</Text>
            <Text style={styles.emptyStateText}>
              Start by recording your first voice memo. JEETU will transcribe, organize, and extract tasks automatically.
            </Text>
            
            <View style={styles.emptyStateFeatures}>
              <View style={styles.featureItem}>
                <Text style={styles.featureEmoji}>✨</Text>
                <Text style={styles.featureText}>AI-powered transcription</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureEmoji}>🤖</Text>
                <Text style={styles.featureText}>Smart task extraction</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureEmoji}>📊</Text>
                <Text style={styles.featureText}>Automatic organization</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.emptyStateCTA}
              onPress={() => router.push('/(tabs)/record')}
            >
              <Text style={styles.emptyStateCTAText}>🎤 Record Your First Memo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Show content only if user has memos */}
        {memos.length > 0 && (
          <>
        {/* Carousel: Progress & Today's Tasks & This Week */}
        <View style={styles.section}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / (width - 32));
              setCarouselIndex(newIndex);
            }}
            scrollEventThrottle={16}
          >
            <View style={{ width: width - 32 }}>
              {renderCarouselCard(0)}
            </View>
            <View style={{ width: width - 32 }}>
              {renderCarouselCard(1)}
            </View>
            <View style={{ width: width - 32 }}>
              {renderCarouselCard(2)}
            </View>
          </ScrollView>
          
          {/* Carousel Indicators */}
          <View style={styles.carouselIndicators}>
            <View style={[styles.indicator, carouselIndex === 0 && styles.activeIndicator]} />
            <View style={[styles.indicator, carouselIndex === 1 && styles.activeIndicator]} />
            <View style={[styles.indicator, carouselIndex === 2 && styles.activeIndicator]} />
          </View>
        </View>

        {/* Pending Tasks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>✅ Let's get this done</Text>
            {allActions.filter(action => action.status === 'pending').length > 0 && (
              <Text style={styles.taskCount}>
                {allActions.filter(action => action.status === 'pending').length} task{allActions.filter(action => action.status === 'pending').length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
          
          <View style={styles.urgencyCard}>
            <Text style={styles.urgencyText}>{urgencyLevel}</Text>
            
            {/* Pending Tasks */}
            {allActions.filter(action => action.status === 'pending').length > 0 ? (
              <View style={styles.actionItemsContainer}>
                {allActions
                  .filter(action => action.status === 'pending')
                  .sort((a, b) => {
                    // Sort by priority: high > medium > low
                    const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
                    const aPriority = priorityOrder[a.priority] || 1;
                    const bPriority = priorityOrder[b.priority] || 1;
                    if (bPriority !== aPriority) return bPriority - aPriority;
                    // Then by due date
                    if (a.dueDate && b.dueDate) {
                      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }
                    return 0;
                  })
                  .map((action) => {
                    // Find the linked memo for this action
                    const linkedMemo = memos.find(m => m.id === action.linkedMemoId);
                    
                    return (
                      <View key={action.id} style={styles.memoTaskCard}>
                        {/* Task Header with Menu */}
                        <View style={styles.memoTaskHeader}>
                          <View style={styles.memoTaskBadges}>
                            <View
                              style={[
                                styles.typeBadge,
                                action.type === 'reminder' && { backgroundColor: '#FF9500' },
                                action.type === 'calendar_event' && { backgroundColor: '#5AC8FA' },
                                action.type === 'task' && { backgroundColor: '#007AFF' },
                              ]}
                            >
                              <Text style={styles.typeBadgeText}>
                                {action.type === 'reminder' && '⏰'}
                                {action.type === 'calendar_event' && '📅'}
                                {action.type === 'task' && '✅'}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.priorityBadge,
                                action.priority === 'high' && styles.memoPriorityHighBadge,
                                action.priority === 'medium' && styles.memoPriorityMediumBadge,
                                action.priority === 'low' && styles.memoPriorityLowBadge,
                              ]}
                            >
                              <Text style={styles.priorityBadgeText}>
                                {action.priority.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.memoTaskTime}>
                              {action.dueDate ? formatRelativeTime(action.dueDate) : formatRelativeTime(action.createdAt)}
                            </Text>
                            <TaskMenu
                              menuItems={[
                                {
                                  icon: '💡',
                                  label: 'Insight',
                                  backgroundColor: COLORS.primary,
                                  onPress: () => {
                                    // If has linked memo, show memo context
                                    if (action.linkedMemoId) {
                                      router.push({
                                        pathname: '/(tabs)/chat',
                                        params: { 
                                          memoId: action.linkedMemoId,
                                          mode: 'memo-insight'
                                        }
                                      });
                                    } else {
                                      // Otherwise, show task context
                                      router.push({
                                        pathname: '/(tabs)/chat',
                                        params: { 
                                          taskId: action.id,
                                          taskTitle: action.title,
                                          taskDescription: action.description || '',
                                          mode: 'task-insight'
                                        }
                                      });
                                    }
                                  },
                                },
                                {
                                  icon: '💾',
                                  label: 'Save for Later',
                                  backgroundColor: '#34C759',
                                  onPress: async () => {
                                    // Mark action as completed (saved for later)
                                    await AgentService.completeAction(action.id, user?.id || '');
                                    await loadData();
                                    Alert.alert('Saved!', `"${action.title}" saved for later.`);
                                  },
                                },
                                {
                                  icon: '🗑️',
                                  label: 'Delete',
                                  backgroundColor: '#FF3B30',
                                  destructive: true,
                                  onPress: async () => {
                                    Alert.alert(
                                      'Delete Task',
                                      `Are you sure you want to delete "${action.title}"?`,
                                      [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                          text: 'Delete',
                                          style: 'destructive',
                                          onPress: async () => {
                                            await AgentService.deleteAction(action.id, user?.id || '');
                                            await loadData();
                                          },
                                        },
                                      ]
                                    );
                                  },
                                },
                              ]}
                            />
                          </View>
                        </View>

                        {/* Task Title & Description */}
                        <Text style={styles.memoTaskTitle} numberOfLines={2}>
                          {action.title}
                        </Text>
                        {action.description && (
                          <Text style={styles.memoTaskTranscription} numberOfLines={2}>
                            {action.description}
                          </Text>
                        )}

                        {/* Due Date/Time Indicator */}
                        {action.dueDate && (
                          <View style={styles.actionIndicator}>
                            <Text style={styles.actionIndicatorText}>
                              📅 Due: {new Date(action.dueDate).toLocaleDateString()}
                              {action.dueTime && ` at ${action.dueTime}`}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
              </View>
            ) : (
              <Text style={styles.emptyActionText}>No pending tasks. Great job! 🎉</Text>
            )}
          </View>
        </View>

        {/* Record Button */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/record')}
          >
            <LinearGradient
              colors={GRADIENTS.primary as any}
              style={styles.quickAction}
            >
              <Text style={styles.quickActionIcon}>🎙️</Text>
              <Text style={styles.quickActionText}>Start Recording</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Import Conversations */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Import Conversations',
                'Import text files or conversations from your local drive to analyze with AI',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Choose File', 
                    onPress: () => {
                      // TODO: Implement file picker
                      Alert.alert('Coming Soon', 'File import feature will be available soon!');
                    }
                  }
                ]
              );
            }}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6'] as any}
              style={styles.quickAction}
            >
              <Text style={styles.quickActionIcon}>📁</Text>
              <Text style={styles.quickActionText}>Import Conversations</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Try These Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Try these examples</Text>
          <TouchableOpacity
            style={styles.exampleCard}
            onPress={() => router.push('/(tabs)/record')}
          >
            <Text style={styles.exampleIcon}>🎤</Text>
            <View style={styles.exampleContent}>
              <Text style={styles.exampleTitle}>Quick Voice Note</Text>
              <Text style={styles.exampleDescription}>
                "Remind me to call the client tomorrow at 2 PM"
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exampleCard}
            onPress={() => router.push('/(tabs)/chat')}
          >
            <Text style={styles.exampleIcon}>💬</Text>
            <View style={styles.exampleContent}>
              <Text style={styles.exampleTitle}>AI Planning</Text>
              <Text style={styles.exampleDescription}>
                "Help me plan my presentation for next week"
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerIcon: {
    fontSize: 22,
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
    borderColor: '#fff',
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
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.9,
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
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
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
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
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
    borderRadius: 12,
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
    borderRadius: 20,
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
    borderRadius: 8,
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
    borderRadius: 16,
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
  completionBadgeText: {
    fontSize: 13,
    color: '#0F5132',
    fontWeight: '600',
  },
});