import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import NotificationService from '../services/NotificationService';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

const NotificationItem = ({ item, onPress }: { item: any, onPress: () => void }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment': return 'checkbox-outline';
      case 'group_invite': return 'people-outline';
      case 'reminder': return 'alarm-outline';
      default: return 'notifications-outline';
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'assignment': return COLORS.primary; // Indigo
      case 'group_invite': return '#E91E63'; // Pink
      case 'reminder': return '#FF9800'; // Orange
      default: return COLORS.gray[500];
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.itemContainer, 
        !item.is_read && styles.unreadItem
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: getColor(item.type) + '20' }]}>
        <Ionicons name={getIcon(item.type) as any} size={24} color={getColor(item.type)} />
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, !item.is_read && styles.boldTitle]}>{item.title}</Text>
          <Text style={styles.itemTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

export default function NotificationModal({ visible, onClose, userId }: NotificationModalProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mentions'>('all');

  useEffect(() => {
    if (visible && userId) {
      loadNotifications();
    }
  }, [visible, userId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getNotifications(userId);
      setNotifications(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await NotificationService.markAsRead(id);
  };

  const clearAll = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await NotificationService.markNotificationsAsRead(userId);
  };

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === 'assignment' || n.type === 'mention');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
         <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Notifications</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
               <TouchableOpacity 
                 style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                 onPress={() => setActiveTab('all')}
               >
                 <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={[styles.tab, activeTab === 'mentions' && styles.activeTab]}
                 onPress={() => setActiveTab('mentions')}
               >
                 <Text style={[styles.tabText, activeTab === 'mentions' && styles.activeTabText]}>Mentions</Text>
               </TouchableOpacity>
               
               <TouchableOpacity style={styles.markReadButton} onPress={clearAll}>
                 <Text style={styles.markReadText}>Mark all read</Text>
               </TouchableOpacity>
            </View>

            {/* Content */}
            {loading && !refreshing ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                  data={filteredNotifications}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <NotificationItem 
                      item={item} 
                      onPress={() => {
                          handleMarkAsRead(item.id);
                          
                          // Navigation Logic
                          console.log('🔔 Notification pressed:', item.type, item.data);
                          
                          if (item.type === 'assignment' && item.data?.taskId) {
                              onClose();
                              // Navigate to Tasks tab with deep link param
                              router.push({ pathname: '/(tabs)/tasks', params: { taskId: item.data.taskId } });
                          } 
                          else if (item.type === 'group_invite' && item.data?.groupId) {
                              onClose();
                              // Navigate to Group Chat
                              router.push({ pathname: '/(tabs)/chat', params: { mode: 'group', groupId: item.data.groupId } });
                          }
                          else if (item.MemoId) { // Fallback for reminder/memo
                              onClose();
                              router.push({ pathname: '/(tabs)/chat', params: { memoId: item.MemoId } });
                          }
                      }}
                    />
                  )}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={48} color={COLORS.gray[300]} />
                        <Text style={styles.emptyText}>No notifications yet</Text>
                    </View>
                  }
                  contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
         </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.gray[50],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    alignItems: 'center',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: COLORS.gray[100],
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.gray[600],
    fontWeight: '600',
  },
  activeTabText: {
    color: COLORS.white,
  },
  markReadButton: {
    marginLeft: 'auto',
  },
  markReadText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
    alignItems: 'flex-start',
  },
  unreadItem: {
    backgroundColor: '#F0F7FF', // Very light blue
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    marginRight: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    flex: 1,
  },
  boldTitle: {
    fontWeight: '700',
  },
  itemTime: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginLeft: 8,
  },
  itemBody: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.gray[500],
    fontSize: 16,
  },
});
