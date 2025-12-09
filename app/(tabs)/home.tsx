// app/(tabs)/home.tsx

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import StorageService from '../../src/services/StorageService';
import PersonaService from '../../src/services/PersonaService';
import VoiceMemoService from '../../src/services/VoiceMemoService';
import AuthService from '../../src/services/AuthService';
import { User, VoiceMemo, UserPersona } from '../../src/types';
import { COLORS, GRADIENTS, CATEGORY_COLORS, CATEGORY_ICONS, TYPE_BADGES } from '../../src/constants';
import { formatRelativeTime, sortByDate } from '../../src/utils';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<string>('');
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [savedMemos, setSavedMemos] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

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
    } catch (error) {
      console.error('Error loading data:', error);
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

  const saveMemoForLater = (memoId: string, title: string) => {
    try {
      const newSavedMemos = new Set(savedMemos);
      if (newSavedMemos.has(memoId)) {
        newSavedMemos.delete(memoId);
        Alert.alert('Removed', `"${title}" removed from saved items`);
      } else {
        newSavedMemos.add(memoId);
        Alert.alert('Saved!', `"${title}" saved for later use`, [
          {
            text: 'View Saved',
            onPress: () => {
              // Navigate to saved/bookmarks section when available
              console.log('Navigate to saved memos');
            },
          },
          { text: 'OK', style: 'default' },
        ]);
      }
      setSavedMemos(newSavedMemos);
      // Save to storage
      if (user?.id) {
        StorageService.setSavedMemos(user.id, Array.from(newSavedMemos));
      }
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };

  const shareInsight = async (memo: VoiceMemo) => {
    try {
      const shareMessage = `📝 ${memo.title || 'My Memo'}\n\n${memo.transcription || 'Check out this memo!'}\n\n✨ Created with MemoVox AI`;
      
      await Share.share({
        message: shareMessage,
        title: `Share "${memo.title || 'Memo'}"`,
        url: undefined, // Optional: add a deeplink if needed
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Unable to share at this moment');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <LinearGradient colors={GRADIENTS.primary} style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.name || 'there'}! 👋</Text>
          <Text style={styles.subtitle}>
            What would you like to capture today?
          </Text>
        </LinearGradient>

        {/* Urgency Level with Action Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ You might want to pay attention</Text>
          <View style={styles.urgencyCard}>
            <Text style={styles.urgencyText}>{urgencyLevel}</Text>
            
            {/* Action Items List */}
            {getActionItems(memos).length > 0 ? (
              <View style={styles.actionItemsContainer}>
                {getActionItems(memos).slice(0, 3).map((item, idx) => (
                  <View 
                    key={item.id}
                    style={styles.actionItemCard}
                  >
                    <View style={styles.actionItemRow}>
                      <View style={styles.actionItemBadges}>
                        <View
                          style={[
                            styles.actionItemCategoryBadge,
                            { backgroundColor: CATEGORY_COLORS[item.category] },
                          ]}
                        >
                          <Text style={styles.actionItemCategoryText}>
                            {CATEGORY_ICONS[item.category]}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.actionItemTypeBadge,
                            { backgroundColor: TYPE_BADGES[item.type].color },
                          ]}
                        >
                          <Text style={styles.actionItemTypeText}>
                            {TYPE_BADGES[item.type].icon}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.actionItemContent}>
                        <Text style={styles.actionItemTitle} numberOfLines={1}>
                          {item.title || 'Untitled'}
                        </Text>
                        <Text style={styles.actionItemSubtitle} numberOfLines={2}>
                          {item.transcription?.substring(0, 60) || 'No details'}
                        </Text>
                      </View>
                      <Text style={styles.actionItemChevron}>›</Text>
                    </View>
                    
                    {/* Get Insight, Share, Save, and Delete Actions */}
                    <View style={styles.actionItemActions}>
                      <TouchableOpacity 
                        style={styles.iconButton}
                        onPress={() => router.push({
                          pathname: '/(tabs)/chat',
                          params: { memoId: item.id }
                        })}
                      >
                        <Text style={styles.iconButtonText}>💡</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={styles.iconButton}
                        onPress={() => shareInsight(item)}
                      >
                        <Text style={styles.iconButtonText}>📤</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={[
                          styles.iconButton,
                          savedMemos.has(item.id) && styles.savedIconButtonActive
                        ]}
                        onPress={() => saveMemoForLater(item.id, item.title || 'Untitled')}
                      >
                        <Text style={styles.iconButtonText}>
                          {savedMemos.has(item.id) ? '💾' : '🔖'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.iconButton, styles.deleteIconButton]}
                        onPress={() => deleteMemo(item.id)}
                      >
                        <Text style={styles.iconButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyActionText}>No action items yet. Keep recording!</Text>
            )}
            
            {memos.length > 0 && (
              <TouchableOpacity 
                onPress={() => router.push('/(tabs)/notes')}
                style={styles.urgencyLink}
              >
                <Text style={styles.urgencyLinkText}>View all memos →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Persona Insight - Removed */}

        {/* Quick Action */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/record')}
          >
            <LinearGradient
              colors={GRADIENTS.primary}
              style={styles.quickAction}
            >
              <Text style={styles.quickActionIcon}>🎙️</Text>
              <Text style={styles.quickActionText}>Start Recording</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  header: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 32,
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
});