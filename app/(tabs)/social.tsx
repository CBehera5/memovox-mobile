
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import GroupService, { GroupSession } from '../../src/services/GroupService';
import StorageService from '../../src/services/StorageService';
import { COLORS } from '../../src/constants';
import Svg, { Circle } from 'react-native-svg';
import Link from 'expo-router/link';
import MemberSelectionModal from '../../src/components/MemberSelectionModal';
import AgentService from '../../src/services/AgentService';
import GroupOptionsModal from '../../src/components/GroupOptionsModal';

const { width } = Dimensions.get('window');

// Mock function to generate consistent random progress for demo
const getMockProgress = (id: string) => {
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (sum % 80) + 10; // 10% to 90%
};

// Progress Ring Component
const ProgressRing = ({ progress }: { progress: number }) => {
    const size = 60;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size}>
                {/* Background Circle */}
                <Circle
                    stroke="rgba(255,255,255,0.3)"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                />
                {/* Progress Circle */}
                <Circle
                    stroke="#FFFFFF"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>{progress}%</Text>
                <Text style={{ color: '#FFF', fontSize: 8 }}>Completed</Text>
            </View>
        </View>
    );
};

export default function SocialScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Create Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  // Menu & Member Modal State
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupSession | null>(null);

  const loadGroups = async () => {
    // ... (existing loadGroups logic)
    try {
      const user = await StorageService.getUser();
      if (!user) return;
      
      const userGroups = await GroupService.getUserGroups(user.id);
      setGroups(userGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    
    setCreating(true);
    try {
      const user = await StorageService.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      await GroupService.createGroup(newGroupName, user);
      setCreateModalVisible(false);
      setNewGroupName('');
      loadGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleGroupOptions = (group: GroupSession) => {
      setSelectedGroup(group);
      setOptionsModalVisible(true);
  };

  const handleMarkComplete = async (group: GroupSession) => {
      // For demo visual, we might just alert, or actually archive.
      // If we archive, it disappears.
      // Let's ask user.
      Alert.alert(
          'Complete Group?',
          'This will mark all tasks as done and archive the group.',
          [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Complete', onPress: async () => {
                   // Mock completion
                   Alert.alert('Success', `Group "${group.title}" marked as complete!`);
                   // In real app: GroupService.endSession(group.id);
                   // Refresh list
                   // loadGroups(); 
              }}
          ]
      );
  };

  const handleAddMember = async (userId: string, userName: string) => {
      if (!selectedGroup) return;
      
      try {
          const success = await GroupService.addMember(selectedGroup.id, {
              id: userId,
              name: userName
          });

          if (success) {
              Alert.alert('Success', `${userName} added to group!`);
              setMemberModalVisible(false);
              loadGroups(); // Refresh member count
          } else {
              Alert.alert('Error', 'Failed to add member');
          }
      } catch (error) {
          console.error('Add member error:', error);
          Alert.alert('Error', 'Failed to add member');
      }
  };

  const renderGroupItem = ({ item, index }: { item: GroupSession, index: number }) => {
    // Generate different gradients based on index
    const gradients = [
        ['#4facfe', '#00f2fe'], // Blue
        ['#667eea', '#764ba2'], // Purple
        ['#30cfd0', '#330867'], // Teal/Dark
        ['#f093fb', '#f5576c'], // Pink
    ];
    const gradient = gradients[index % gradients.length];
    const progress = getMockProgress(item.id);
    
    // Mock future date for demo visuals
    const date = new Date(item.created_at);
    date.setDate(date.getDate() + 7); // Event is 1 week after creation
    const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

    return (
      <TouchableOpacity 
          style={styles.groupCard}
          onPress={() => handleGroupOptions(item)}
      >
        <LinearGradient
          colors={gradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDate}>On {dateStr} @ {timeStr}</Text>
              
              <View style={styles.membersRow}>
                  <Ionicons name="people" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.membersText}>{item.members?.length || 1} people</Text>
              </View>
          </View>

          <View style={styles.cardRight}>
               <ProgressRing progress={progress} />
               {/* Menu removed implies card click handles options */}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };
    // ... (rest of return)


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
             <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
             <Text style={styles.headerTitle}>Smart Planning with</Text>
             <View style={styles.aiBadge}>
                 <Text style={styles.aiText}>AI</Text>
                 <Ionicons name="sparkles" size={12} color={COLORS.primary} style={{marginLeft: 2}} />
             </View>
          </View>
          <View style={styles.headerRight}>
             <TouchableOpacity style={styles.iconButton}>
                 <Ionicons name="notifications" size={24} color={COLORS.dark} />
                 <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
             </TouchableOpacity>
             <TouchableOpacity style={styles.iconButton} onPress={() => setCreateModalVisible(true)}>
                 <Ionicons name="add-circle" size={28} color={COLORS.dark} />
             </TouchableOpacity>
          </View>
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.gray[500]} />
            <TextInput 
                placeholder="Search.." 
                style={styles.searchInput}
                placeholderTextColor={COLORS.gray[400]}
            />
            <Ionicons name="options-outline" size={20} color={COLORS.gray[400]} />
        </View>

        {/* Upgrade Banner */}
        <LinearGradient
            colors={['#667eea', '#764ba2', '#ff9a9e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upgradeBanner}
        >
            <View style={styles.upgradeContent}>
                <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                <Text style={styles.upgradeSub}>Don't settle for basic—experience the best with Premium</Text>
                <TouchableOpacity style={styles.startNowButton} onPress={() => router.push('/(tabs)/profile?showUpgrade=true')}>
                    <Text style={styles.startNowText}>Start Now</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.upgradeImageContainer}>
                 {/* Placeholder for 3D illustration */}
                 <Ionicons name="rocket" size={80} color="rgba(255,255,255,0.9)" />
            </View>
        </LinearGradient>

        {/* Groups List */}
        <View style={styles.groupsHeader}>
            <Text style={styles.sectionTitle}>Groups</Text>
            <TouchableOpacity style={styles.sortButton}>
                <Text style={styles.sortText}>Sort</Text>
                <Ionicons name="arrow-down" size={14} color={COLORS.gray[600]} />
                <Ionicons name="arrow-up" size={14} color={COLORS.gray[600]} />
            </TouchableOpacity>
        </View>

        {loading ? (
            <ActivityIndicator style={{marginTop: 40}} size="large" color={COLORS.primary} />
        ) : (
            <FlatList
                data={groups}
                renderItem={renderGroupItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No groups found. Create one!</Text>
                    </View>
                }
            />
        )}
      </View>

      {/* Create Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Create New Group</Text>
                <TextInput
                    style={styles.modalInput}
                    placeholder="Group Name"
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    autoFocus
                />
                <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.modalCancel} onPress={() => setCreateModalVisible(false)}>
                        <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalCreate} onPress={handleCreateGroup} disabled={creating}>
                        <Text style={styles.modalCreateText}>{creating ? 'Creating...' : 'Create'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Group Options Modal */}
      <GroupOptionsModal
        visible={optionsModalVisible}
        onClose={() => setOptionsModalVisible(false)}
        group={selectedGroup}
        onAddMembers={(groupId) => {
            setMemberModalVisible(true);
        }}
        onMarkComplete={handleMarkComplete}
      />

      {/* Member Selection Modal */}
      <MemberSelectionModal
        visible={memberModalVisible}
        onClose={() => setMemberModalVisible(false)}
        onSelectMember={handleAddMember}
        title={`Add Members to ${selectedGroup?.title}`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  headerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: COLORS.dark,
  },
  aiBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.primary,
      borderRadius: 6,
      paddingHorizontal: 4,
      marginLeft: 4,
  },
  aiText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: COLORS.primary,
  },
  headerRight: {
      flexDirection: 'row',
      gap: 16,
  },
  iconButton: {
      position: 'relative',
  },
  badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: '#FF3B30',
      width: 14,
      height: 14,
      borderRadius: 7,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#FFF',
  },
  badgeText: {
      color: '#FFF',
      fontSize: 8,
      fontWeight: 'bold',
  },
  content: {
      flex: 1,
      paddingHorizontal: 20,
  },
  searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F5F5F5',
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 48,
      marginBottom: 24,
  },
  searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: COLORS.dark,
  },
  upgradeBanner: {
      borderRadius: 20,
      padding: 24,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 32,
      height: 160,
  },
  upgradeContent: {
      flex: 1,
  },
  upgradeTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#FFF',
      marginBottom: 8,
  },
  upgradeSub: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.9)',
      marginBottom: 16,
      lineHeight: 16,
  },
  startNowButton: {
      backgroundColor: '#FFF',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignSelf: 'flex-start',
  },
  startNowText: {
      color: COLORS.primary, // Approximate
      fontWeight: 'bold',
      fontSize: 12,
  },
  upgradeImageContainer: {
      width: 100,
      alignItems: 'center',
      justifyContent: 'center',
  },
  groupsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
  },
  sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: COLORS.dark,
  },
  sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
  },
  sortText: {
      fontSize: 14,
      color: COLORS.gray[600],
  },
  listContent: {
      paddingBottom: 40,
      gap: 16,
  },
  groupCard: {
      borderRadius: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
  },
  cardGradient: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 20,
      borderRadius: 24,
      minHeight: 110,
  },
  cardContent: {
      flex: 1,
      justifyContent: 'center',
  },
  cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFF',
      marginBottom: 4,
  },
  cardDate: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
      marginBottom: 16,
      fontStyle: 'italic',
  },
  membersRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
  },
  membersText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.9)',
      fontWeight: '500',
  },
  cardRight: {
      alignItems: 'flex-end',
      justifyContent: 'space-between',
  },
  menuButton: {
      padding: 4,
  },
  emptyContainer: {
      alignItems: 'center',
      marginTop: 40,
  },
  emptyText: {
      color: COLORS.gray[500],
      fontSize: 16,
  },
  // Modal Styles
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
  },
  modalContainer: {
      width: '100%',
      backgroundColor: '#FFF',
      borderRadius: 20,
      padding: 24,
      elevation: 5,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
  },
  modalInput: {
      backgroundColor: '#F5F5F5',
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
  },
  modalButtons: {
      flexDirection: 'row',
      gap: 12,
  },
  modalCancel: {
      flex: 1,
      padding: 16,
      alignItems: 'center',
      backgroundColor: '#F0F0F0',
      borderRadius: 12,
  },
  modalCreate: {
      flex: 1,
      padding: 16,
      alignItems: 'center',
      backgroundColor: COLORS.primary,
      borderRadius: 12,
  },
  modalCancelText: {
      fontWeight: '600',
      color: '#666',
  },
  modalCreateText: {
      fontWeight: '600',
      color: '#FFF',
  },
});
