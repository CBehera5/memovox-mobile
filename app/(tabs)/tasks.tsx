import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import StorageService from '../../src/services/StorageService';
import AgentService from '../../src/services/AgentService';
import { AgentAction } from '../../src/types';
import { COLORS, GRADIENTS } from '../../src/constants';
import SmartActionCard from '../../src/components/SmartActionCard';
import CalendarWidget from '../../src/components/CalendarWidget';
import TaskOptionsModal from '../../src/components/TaskOptionsModal';
import MemberSelectionModal from '../../src/components/MemberSelectionModal';

export default function TasksScreen() {
  const router = useRouter();
  const [allActions, setAllActions] = useState<AgentAction[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [selectedAction, setSelectedAction] = useState<AgentAction | null>(null);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadData = async () => {
    try {
      // 1. Get User
      const user = await StorageService.getUser();
      setCurrentUser(user);
      
      // 2. Get Real Actions
      let realActions: AgentAction[] = [];
      if (user) {
          realActions = await AgentService.getUserActions(user.id);
      } else {
          // Fallback if no user loaded yet (rare in tabs)
          console.log('TasksScreen: No user found, loading local/demo only');
      }

      const demoSmartActions = await AgentService.getMockSmartActions();
      
      // 3. Combine and Sort (Prioritize real actions)
      // Filter out demo actions if they conflict or just merge
      const realIds = new Set(realActions.map(a => a.id));
      const filteredDemo = demoSmartActions.filter(a => !realIds.has(a.id));

      const combined = [...filteredDemo, ...realActions].sort((a, b) => {
        // 1. Completion Status (Active first)
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;

        // 2. Priority (High > Medium > Low)
        const priorityWeights = { high: 3, medium: 2, low: 1 };
        const pA = priorityWeights[a.priority] || 0;
        const pB = priorityWeights[b.priority] || 0;
        if (pA !== pB) return pB - pA;

        // 3. Date
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      });

      setAllActions(combined);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const filteredActions = allActions.filter(action => {
    // 1. Status Filter
    if (selectedFilter !== 'all' && action.status !== selectedFilter) return false;

    // 2. Date Filter
    const s = new Date(selectedDate);
    s.setHours(0,0,0,0);

    // Filter Logic:
    // A. If Completed tab -> Show tasks COMPLETED on this date (or due on this date if match)
    if (selectedFilter === 'completed' && action.completedAt) {
        const c = new Date(action.completedAt);
        c.setHours(0,0,0,0);
        if (c.getTime() === s.getTime()) return true;
        // Fallback: If completedAt invalid, check dueDate
    }

    // B. Check Due Date
    if (action.dueDate) {
        const d = new Date(action.dueDate);
        d.setHours(0,0,0,0);
        
        // Show if Due Date matches Selected Date
        if (d.getTime() === s.getTime()) return true;
        
        // Overdue handling for Pending/All: 
        // If date is in past AND selected date is TODAY, show overdue? 
        // Logic: Calendar View usually shows strict dates. 
        // But users want to see overdue tasks. 
        // Let's stick to strict date for Calendar consistency, 
        // BUT if filtering 'pending' and due date < today and selected is today, maybe show?
        // For simplicity: Strict match on Due Date.
    } 
    
    // C. Handling Undated Tasks
    if (!action.dueDate) {
        // If no due date, show on Creation Date? Or always on "Today"?
        // Let's show on Creation Date only.
        const c = new Date(action.createdAt);
        c.setHours(0,0,0,0);
        if (c.getTime() === s.getTime()) return true;
        
        // Also show on Today if it's pending and created in past? (Backlog)
        // Only if selected date is Today
        const today = new Date();
        today.setHours(0,0,0,0);
        if (s.getTime() === today.getTime() && action.status === 'pending') return true;
    }

    return false;
  });

  const { taskId } = useLocalSearchParams();

  // Handle Deep Linking to specific task
  useEffect(() => {
    if (taskId && allActions.length > 0) {
      const task = allActions.find(a => a.id === taskId);
      if (task) {
        setSelectedAction(task);
        setOptionsModalVisible(true);
        // Clear param to avoid reopening? (Optional, but usually router params stick)
      }
    }
  }, [taskId, allActions]);

  const handleShareTask = (actionId: string) => {
      setMemberModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tasks</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => Alert.alert('New Task', 'Use "Record" or "Plan with AI" to create tasks.')}>
             <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Calendar Strip */}
        <CalendarWidget 
            actions={allActions}
            onDatePress={setSelectedDate}
        />

        {/* Search & Filter */}
        <View style={styles.controlsContainer}>
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search..."
                    placeholderTextColor={COLORS.gray[400]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>
            
            <View style={styles.filterTabs}>
                {['all', 'pending', 'completed'].map((f) => (
                    <TouchableOpacity 
                        key={f} 
                        style={[styles.filterTab, selectedFilter === f && styles.activeFilterTab]}
                        onPress={() => setSelectedFilter(f as any)}
                    >
                        <Text style={[styles.filterTabText, selectedFilter === f && styles.activeFilterTabText]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        {/* Task List */}
        <View style={styles.taskList}>
            {filteredActions.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.gray[300]} />
                    <Text style={styles.emptyText}>No tasks for this day</Text>
                </View>
            ) : (
                filteredActions.map(action => (
                    <SmartActionCard
                        key={action.id}
                        action={action}
                        onPress={() => {
                             setSelectedAction(action);
                             setOptionsModalVisible(true);
                        }}
                        onPressMenu={() => {
                             setSelectedAction(action);
                             setOptionsModalVisible(true);
                        }}
                    />
                ))
            )}
        </View>
      </ScrollView>
      <MemberSelectionModal
        visible={memberModalVisible}
        onClose={() => setMemberModalVisible(false)}
        onSelectMember={async (userId, userName) => {
            if (selectedAction && currentUser) {
                const success = await AgentService.shareAction(
                    selectedAction.id,
                    userId,
                    userName,
                    currentUser.full_name || currentUser.email || 'A friend'
                );
                
                if (success) {
                    Alert.alert("Success", `Shared task with ${userName}`);
                } else {
                    Alert.alert("Error", "Failed to share task. Please try again.");
                }
            }
        }}
        title="Share Task"
      />
      <TaskOptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        action={selectedAction}
        onAddMember={() => {
           setMemberModalVisible(true);
        }}
        onMarkDone={async (actionId) => {
            if (currentUser?.id) {
                // Optimistic Update
                setAllActions(prev => prev.map(a => a.id === actionId ? { ...a, status: 'completed' } : a));
                
                await AgentService.completeAction(actionId, currentUser.id);
                // Alert.alert('Task Done', 'Great job! 🎉');
                loadData(); 
            }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  controlsContainer: {
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: COLORS.dark,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[200],
    borderRadius: 8,
    padding: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFilterTab: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray[600],
  },
  activeFilterTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  taskList: {
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.gray[500],
    fontSize: 16,
  },
});
