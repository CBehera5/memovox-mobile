// app/(tabs)/notes.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Share,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import StorageService from '../../src/services/StorageService';
import VoiceMemoService from '../../src/services/VoiceMemoService';
import AuthService from '../../src/services/AuthService';
import { VoiceMemo, MemoCategory, MemoType } from '../../src/types';
import {
  COLORS,
  GRADIENTS,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  TYPE_BADGES,
} from '../../src/constants';
import { formatRelativeTime, sortByDate } from '../../src/utils';
import AnimatedActionButton from '../../src/components/AnimatedActionButton';
import TaskMenu from '../../src/components/TaskMenu';

const ALL_CATEGORIES: (MemoCategory | 'All')[] = [
  'All',
  'Personal',
  'Work',
  'Ideas',
  'Shopping',
  'Health',
  'Learning',
  'Travel',
  'Finance',
  'Hobbies',
  'Notes',
];

const ALL_TYPES: (MemoType | 'All')[] = ['All', 'event', 'reminder', 'note'];

export default function Notes() {
  const router = useRouter();
  const [memos, setMemos] = useState<VoiceMemo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<MemoCategory | 'All'>('All');
  const [selectedType, setSelectedType] = useState<MemoType | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Audio playback state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingMemoId, setPlayingMemoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadMemos();
  }, []);

  // Reload memos when screen comes into focus (e.g., after creating tasks in chat)
  useFocusEffect(
    useCallback(() => {
      console.log('Notes screen focused - reloading memos...');
      loadMemos();
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

  const loadMemos = async () => {
    try {
      // Get current user
      const user = await AuthService.getCurrentUser();
      if (!user) {
        console.warn('No user logged in');
        setMemos([]);
        return;
      }

      // Get memos from Supabase
      const allMemos = await VoiceMemoService.getUserMemos(user.id);
      const sorted = sortByDate(allMemos);
      console.log('Loaded memos from Supabase:', allMemos.length);
      setMemos(sorted);
    } catch (error) {
      console.error('Error loading memos:', error);
      setMemos([]);
    }
  };

  // PERFORMANCE IMPROVEMENT: Memoize filtered memos instead of using useEffect
  const filteredMemos = useMemo(() => {
    let filtered = [...memos];

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(memo => memo.category === selectedCategory);
    }

    // Filter by type
    if (selectedType !== 'All') {
      filtered = filtered.filter(memo => memo.type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        memo =>
          memo.transcription.toLowerCase().includes(query) ||
          memo.title?.toLowerCase().includes(query) ||
          memo.aiAnalysis?.keywords?.some(kw => kw.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [memos, selectedCategory, selectedType, searchQuery]);

  const deleteMemo = useCallback(async (memoId: string) => {
    try {
      const user = await AuthService.getCurrentUser();
      if (!user) {
        console.warn('No user logged in');
        return;
      }
      await VoiceMemoService.deleteMemo(memoId, user.id);
      // Remove from local state
      setMemos(prev => prev.filter(memo => memo.id !== memoId));
    } catch (error) {
      console.error('Error deleting memo:', error);
    }
  }, []);

  const toggleComplete = useCallback(async (memo: VoiceMemo) => {
    try {
      const user = await AuthService.getCurrentUser();
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
        setMemos(prev => prev.map(m => m.id === memo.id ? updatedMemo! : m));
      }
    } catch (error) {
      console.error('Error toggling memo completion:', error);
    }
  }, []);

  const shareMemo = useCallback(async (memo: VoiceMemo) => {
    try {
      // Create shareable text content
      const shareText = `Check out my memo: "${memo.title || 'Untitled Memo'}"\n\n${memo.transcription.substring(0, 500)}${memo.transcription.length > 500 ? '...' : ''}`;
      
      // Use native share dialog (works on iOS/Android)
      await Share.share({
        message: shareText,
        title: memo.title || 'Share Memo',
      });
    } catch (error) {
      console.error('Error sharing memo:', error);
      // Fallback: Show alert with message to copy
      Alert.alert('Share', 'Unable to share. Please copy the memo text manually.');
    }
  }, []);

  const renderMemoItem = ({ item, index }: { item: VoiceMemo; index: number }) => (
    <TouchableOpacity
      onPress={() => {
        router.push({
          pathname: '/(tabs)/chat',
          params: { memoId: item.id }
        });
      }}
      onLongPress={() => shareMemo(item)}
      activeOpacity={0.7}
    >
      <View style={styles.memoCard}>
      <View style={styles.memoHeader}>
        <View style={styles.memoBadges}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: CATEGORY_COLORS[item.category] },
            ]}
          >
            <Text style={styles.categoryBadgeText}>
              {CATEGORY_ICONS[item.category]} {item.category}
            </Text>
          </View>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: (TYPE_BADGES[item.type] || TYPE_BADGES.note).color },
            ]}
          >
            <Text style={styles.typeBadgeText}>
              {(TYPE_BADGES[item.type] || TYPE_BADGES.note).icon}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.memoTime}>{formatRelativeTime(item.createdAt)}</Text>
          <TaskMenu
            menuItems={[
              {
                icon: playingMemoId === item.id && isPlaying ? "⏸" : "▶️",
                label: playingMemoId === item.id && isPlaying ? "Pause" : "Play",
                backgroundColor: "#FF9500",
                onPress: () => playAudio(item),
              },
              {
                icon: '💡',
                label: 'Insight',
                backgroundColor: COLORS.primary,
                onPress: () => {
                  router.push({
                    pathname: '/(tabs)/chat',
                    params: { memoId: item.id }
                  });
                },
              },
              {
                icon: item.isCompleted ? "✓" : "☐",
                label: item.isCompleted ? "Done" : "Complete",
                backgroundColor: item.isCompleted ? "#34C759" : "#8E8E93",
                onPress: () => toggleComplete(item),
              },
              {
                icon: '📤',
                label: 'Share',
                backgroundColor: '#007AFF',
                onPress: () => shareMemo(item),
              },
              {
                icon: '🗑️',
                label: 'Delete',
                backgroundColor: '#FF3B30',
                destructive: true,
                onPress: () => deleteMemo(item.id),
              },
            ]}
          />
        </View>
      </View>

      <Text style={styles.memoTitle} numberOfLines={1}>
        {item.title || 'Untitled Memo'}
      </Text>
      <Text style={styles.memoTranscript} numberOfLines={3}>
        {item.transcription}
      </Text>

      {item.aiAnalysis?.keywords && item.aiAnalysis.keywords.length > 0 && (
        <View style={styles.keywordsContainer}>
          {item.aiAnalysis.keywords.slice(0, 3).map((keyword, idx) => (
            <View key={idx} style={styles.keywordChip}>
              <Text style={styles.keywordText}>{keyword}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.memoFooter}>
        <Text style={styles.memoDuration}>
          {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
        </Text>
        {item.aiAnalysis?.actionItems && item.aiAnalysis.actionItems.length > 0 && (
          <View style={styles.actionIndicator}>
            <Text style={styles.actionIndicatorText}>
              ✓ {item.aiAnalysis.actionItems.length} action{item.aiAnalysis.actionItems.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Completion Badge */}
      {item.isCompleted && item.completedAt && (
        <View style={styles.completionBadge}>
          <Text style={styles.completionBadgeText}>
            ✓ Completed {formatRelativeTime(item.completedAt)}
          </Text>
        </View>
      )}
    </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={GRADIENTS.primary} style={styles.header}>
        <Text style={styles.headerTitle}>Your Memos</Text>
        <Text style={styles.headerSubtitle}>
          {filteredMemos.length} memo{filteredMemos.length !== 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search memos..."
            placeholderTextColor={COLORS.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {ALL_CATEGORIES.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterChip,
              selectedCategory === category && styles.filterChipActive,
              selectedCategory === category &&
                category !== 'All' && {
                  backgroundColor: CATEGORY_COLORS[category as MemoCategory],
                },
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === category && styles.filterChipTextActive,
              ]}
            >
              {category !== 'All' && CATEGORY_ICONS[category as MemoCategory]}{' '}
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {ALL_TYPES.map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterChip,
              selectedType === type && styles.filterChipActive,
              selectedType === type &&
                type !== 'All' && {
                  backgroundColor: TYPE_BADGES[type as MemoType].color,
                },
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === type && styles.filterChipTextActive,
              ]}
            >
              {type !== 'All' && TYPE_BADGES[type as MemoType].icon} {type === 'All' ? 'All' : TYPE_BADGES[type as MemoType].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Memos List */}
      {filteredMemos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>
            {searchQuery || selectedCategory !== 'All' || selectedType !== 'All'
              ? '�'
              : '📝'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery || selectedCategory !== 'All' || selectedType !== 'All'
              ? 'No memos found'
              : 'No memos yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || selectedCategory !== 'All' || selectedType !== 'All'
              ? 'Try adjusting your filters or search terms'
              : 'Record your first voice memo to see it here'}
          </Text>
          
          {/* Clear Filters Button or Record CTA */}
          {(searchQuery || selectedCategory !== 'All' || selectedType !== 'All') ? (
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedType('All');
              }}
            >
              <Text style={styles.emptyStateButtonText}>Clear All Filters</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.emptyStateCTA}
              onPress={() => router.push('/(tabs)/record')}
            >
              <Text style={styles.emptyStateCTAText}>🎤 Record Now</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredMemos}
          renderItem={renderMemoItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          // PERFORMANCE IMPROVEMENT: FlatList optimization props
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={21}  // Optimal range is 21-100, ensures proper buffer of rendered items
        />
      )}
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
    paddingBottom: 24,
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.dark,
  },
  clearIcon: {
    fontSize: 18,
    color: COLORS.gray[400],
    padding: 4,
  },
  filterRow: {
    maxHeight: 50,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.gray[700],
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
  },
  memoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memoBadges: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  memoTime: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  memoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  memoTranscript: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 20,
    marginBottom: 12,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  keywordChip: {
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  keywordText: {
    fontSize: 11,
    color: COLORS.gray[600],
  },
  memoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memoDuration: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  actionIndicator: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  actionIndicatorText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  memoActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
    backgroundColor: COLORS.gray[50],
    justifyContent: 'flex-end',
  },
  completionBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
    borderRadius: 6,
  },
  completionBadgeText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  memoIconButton: {
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
  memoIconButtonText: {
    fontSize: 20,
  },
  deleteButton: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  emptyStateButton: {
    backgroundColor: COLORS.gray[200],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
  emptyStateCTA: {
    backgroundColor: '#667eea',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyStateCTAText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});