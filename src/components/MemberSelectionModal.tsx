import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import { Search, UserPlus, X, Share2 } from 'lucide-react-native';
import { COLORS } from '../constants';
import { supabase } from '../config/supabase';
import { User } from '../types';

interface MemberSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMember: (userId: string, userName: string) => void;
  title?: string;
}

export default function MemberSelectionModal({
  visible,
  onClose,
  onSelectMember,
  title = 'Add Member',
}: MemberSelectionModalProps) {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'search' | 'contacts'>('search');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Contacts State
  const [contacts, setContacts] = useState<any[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  // General State
  const [loading, setLoading] = useState(false);

  // --- CURRENT USER STATE ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = require('expo-router').useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  // --- SEARCH LOGIC ---
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Search profiles by email or name
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery && activeTab === 'search') {
        searchUsers(searchQuery);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  // --- CONTACTS LOGIC ---
  const fetchContacts = async () => {
    // For testing/MVP, we skip the strict phone_confirmed_at check.
    // Ideally we should check if they have a phone number in their profile.
    
    setLoading(true);
    try {
      // Lazy load ContactService
      const ContactService = require('../services/ContactService').default;
      const contactsData = await ContactService.getContacts();
      
      if (contactsData.length > 0) {
        setPermissionGranted(true);
        // Find matches
        const matches = await ContactService.findMemoVoxUsers(contactsData);
        setContacts(matches);
      } else {
        // Permission might be denied or no contacts
        setContacts([]);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'contacts') {
      fetchContacts();
    }
  }, [activeTab, currentUser]); // Added currentUser dependency

  // --- HANDLERS ---
  const handleSelect = (user: any) => {
    onSelectMember(user.id, user.full_name || user.email);
    onClose();
  };

  const handleSelectContact = (contact: any) => {
    if (contact.isRegistered && contact.userId) {
      onSelectMember(contact.userId, contact.name);
      onClose();
    } else {
      // Invitation flow
      handleInvite(contact.phoneNumber);
    }
  };

  const handleInvite = async (phoneNumber?: string) => {
    try {
      const message =
        'Hey! Join me on MemoVox to collaborate on tasks and plans. Download here: https://memovox.app/download';
      
      const result = await Share.share({
        message: message,
        title: 'Join MemoVox',
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={COLORS.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* TABS */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'search' && styles.activeTab]}
              onPress={() => setActiveTab('search')}
            >
              <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>Search ID</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'contacts' && styles.activeTab]}
              onPress={() => setActiveTab('contacts')}
            >
              <Text style={[styles.tabText, activeTab === 'contacts' && styles.activeTabText]}>Phone Contacts</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'search' ? (
            <>
              <View style={styles.searchContainer}>
                <Search size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by exact name or email..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  ListEmptyComponent={
                    searchQuery ? (
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No users found</Text>
                      </View>
                    ) : (
                      <View style={styles.placeholderContainer}>
                        <UserPlus size={48} color={COLORS.gray[300]} />
                        <Text style={styles.placeholderText}>
                          Search for people to add to this task
                        </Text>
                      </View>
                    )
                  }
                  renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => handleSelect(item)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(item.full_name || item.email || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.full_name || 'Unknown'}</Text>
                      <Text style={styles.userEmail}>{item.email}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.listContent}
              />
              )}
            </>
          ) : (
            // CONTACTS TAB LIST
            <>
              <View style={styles.searchContainer}>
                <Search size={20} color={COLORS.gray[400]} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Filter contacts..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.loader} />
              ) : (
                <FlatList
                  data={contacts.filter(c => 
                     (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                     (c.phoneNumber || '').includes(searchQuery)
                  )}
                  keyExtractor={(item, index) => item.contactId || index.toString()}
                  keyboardShouldPersistTaps="handled"
                  ListEmptyComponent={
                    <View style={styles.placeholderContainer}>
                       <Text style={styles.placeholderText}>
                         {contacts.length === 0 
                            ? (permissionGranted ? 'No contacts found.' : 'Grant permission to find friends.')
                            : 'No matching contacts.'
                         }
                       </Text>
                       {!permissionGranted && contacts.length === 0 && (
                         <TouchableOpacity onPress={fetchContacts} style={[styles.inviteButton, { marginTop: 16 }]}>
                            <Text style={styles.inviteButtonText}>Sync Contacts</Text>
                         </TouchableOpacity>
                       )}
                    </View>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.userItem}
                      onPress={() => handleSelectContact(item)}
                    >
                      <View style={[styles.avatar, !item.isRegistered && { backgroundColor: COLORS.gray[200] }]}>
                        <Text style={[styles.avatarText, !item.isRegistered && { color: COLORS.gray[500] }]}>
                          {item.name?.charAt(0) || '?'}
                        </Text>
                      </View>
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.name}</Text>
                        <Text style={styles.userEmail}>{item.phoneNumber}</Text>
                      </View>
                      <View style={styles.actionButton}>
                        {item.isRegistered ? (
                           <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>ADD</Text>
                        ) : (
                           <Text style={{ color: COLORS.gray[500], fontSize: 12 }}>INVITE</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                  contentContainerStyle={styles.listContent}
                />
              )}
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[100],
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 20,
    height: 48,
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
  loader: {
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.gray[500],
    marginBottom: 16,
    fontSize: 14,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  placeholderText: {
    color: COLORS.gray[400],
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray[500],
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionButton: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
});
