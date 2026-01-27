
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Share,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StorageService from '../src/services/StorageService';
import AuthService from '../src/services/AuthService';
import AIService from '../src/services/AIService';
import { User, UserPersona, AIServiceConfig } from '../src/types';
import { COLORS, GRADIENTS, CATEGORY_COLORS } from '../src/constants';
import { getInitials } from '../src/utils';
import GoogleCalendarSync from '../src/components/GoogleCalendarSync';
import { supabase } from '../src/config/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [persona, setPersona] = useState<UserPersona | null>(null);
  const [aiConfig, setAiConfig] = useState<AIServiceConfig>({ provider: 'mock' });
  const [stats, setStats] = useState({
    totalMemos: 0,
    totalDuration: 0,
    avgPerDay: 0,
  });

  // Modal State
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneNumberInput, setPhoneNumberInput] = useState('');

  // Pre-fill phone number when modal opens
  useEffect(() => {
    if (user?.phoneNumber) {
      setPhoneNumberInput(user.phoneNumber);
    }
  }, [user?.phoneNumber, phoneModalVisible]);

  const handleSavePhone = async () => {
    if (!phoneNumberInput.trim()) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    
    try {
      let rawInput = phoneNumberInput.trim().replace(/\D/g, '');
      // If user entered 10 digits (e.g. 9876543210), prepend 91
      // If user entered 12 digits starting with 91, keep it.
      
      let finalNumber = '';
      if (rawInput.length === 10) {
          finalNumber = '+91' + rawInput;
      } else if (rawInput.length > 10 && rawInput.startsWith('91')) {
          finalNumber = '+' + rawInput; 
      } else {
          // Fallback or other country codes manually typed? 
          // For now, assume +91 default behavior as requested.
          finalNumber = '+' + rawInput;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: finalNumber })
        .eq('id', user?.id);

      if (error) throw error;

      Alert.alert('Success', 'Phone number saved!');
      setPhoneModalVisible(false);
      await AuthService.getCurrentUser();
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update phone number');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await StorageService.getUser();
      const personaData = await StorageService.getUserPersona();
      const configData = await StorageService.getAIConfig();
      const memos = await StorageService.getVoiceMemos();

      setUser(userData);
      setPersona(personaData);
      setAiConfig(configData || { provider: 'mock' });

      // Calculate stats
      const totalDuration = memos.reduce((sum, memo) => sum + memo.duration, 0);
      const daysSinceFirst = memos.length > 0
        ? Math.max(1, Math.ceil((Date.now() - new Date(memos[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)))
        : 1;

      setStats({
        totalMemos: memos.length,
        totalDuration,
        avgPerDay: Number((memos.length / daysSinceFirst).toFixed(1)),
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AuthService.logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your memos, persona data, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.clearAllData();
              Alert.alert('Success', 'All data has been cleared');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleToggleAIProvider = async () => {
    const newProvider = aiConfig.provider === 'mock' ? 'anthropic' : 'mock';
    const newConfig: AIServiceConfig = {
      ...aiConfig,
      provider: newProvider,
    };
    
    setAiConfig(newConfig);
    await AIService.setConfig(newConfig);
    
    Alert.alert(
      'AI Provider Updated',
      `Switched to ${newProvider === 'mock' ? 'Mock Mode' : 'Anthropic API'}. ${newProvider === 'anthropic' ? 'You will need to configure your API key.' : ''}`
    );
  };

  const handleInviteFriends = async () => {
    try {
      const message = `🎯 Hey! I'm using MemoVox - an AI-powered voice assistant that turns my voice notes into actionable tasks, reminders, and insights.\n\n✨ Features I love:\n• Voice-to-text transcription\n• Smart task extraction\n• Calendar integration\n• AI-powered suggestions\n\nJoin me on MemoVox!\n\n📥 Download: https://memovox.app/download\n\n${user?.name ? `Invited by ${user.name}` : ''}`;

      await Share.share({
        message,
        title: 'Join me on MemoVox! 🎯',
      });
    } catch (error) {
      if (__DEV__) {
        console.error('Error sharing invite:', error);
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <LinearGradient colors={GRADIENTS.primary} style={styles.header}>
          <TouchableOpacity 
             style={styles.backButton} 
             onPress={() => router.back()}
          >
             <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user ? getInitials(user.name) : '??'}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'email@example.com'}</Text>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalMemos}</Text>
            <Text style={styles.statLabel}>Total Memos</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.avgPerDay}</Text>
            <Text style={styles.statLabel}>Per Day</Text>
          </View>
        </View>

        {/* Persona Section */}
        {persona && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your AI Persona</Text>
            <View style={styles.personaCard}>
              <View style={styles.personaRow}>
                <Text style={styles.personaLabel}>Communication Style:</Text>
                <Text style={styles.personaValue}>{persona.communicationStyle}</Text>
              </View>
              <View style={styles.personaRow}>
                <Text style={styles.personaLabel}>Active Hours:</Text>
                <Text style={styles.personaValue}>
                  {persona.activeHours.start}:00 - {persona.activeHours.end}:00
                </Text>
              </View>
              
              {persona.topKeywords.length > 0 && (
                <View style={styles.personaKeywords}>
                  <Text style={styles.personaLabel}>Top Interests:</Text>
                  <View style={styles.keywordsGrid}>
                    {persona.topKeywords.slice(0, 6).map((kw, idx) => (
                      <View key={idx} style={styles.keywordChip}>
                        <Text style={styles.keywordText}>{kw.word}</Text>
                        <Text style={styles.keywordCount}>×{kw.count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {Object.keys(persona.categoryPreferences).length > 0 && (
                <View style={styles.personaCategories}>
                  <Text style={styles.personaLabel}>Category Distribution:</Text>
                  <View style={styles.categoriesGrid}>
                    {Object.entries(persona.categoryPreferences)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([category, percentage]) => (
                        <View
                          key={category}
                          style={[
                            styles.categoryChip,
                            { backgroundColor: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] },
                          ]}
                        >
                          <Text style={styles.categoryChipText}>
                            {category} {percentage}%
                          </Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          {/* Invite Friends - Prominent Feature */}
          <TouchableOpacity 
            style={styles.inviteButton}
            onPress={handleInviteFriends}
          >
            <View style={styles.inviteButtonContent}>
              <View style={styles.inviteIconContainer}>
                <Text style={styles.inviteIcon}>🎯</Text>
              </View>
              <View style={styles.inviteTextContainer}>
                <Text style={styles.inviteButtonTitle}>Invite Friends</Text>
                <Text style={styles.inviteButtonSubtitle}>
                  Share MemoVox and help your friends stay organized
                </Text>
              </View>
              <Text style={styles.inviteButtonArrow}>→</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>AI Provider</Text>
                <Text style={styles.settingDescription}>
                  {aiConfig.provider === 'mock' ? 'Mock Mode (Demo)' : 'Anthropic Claude'}
                </Text>
              </View>
              <Switch
                value={aiConfig.provider === 'anthropic'}
                onValueChange={handleToggleAIProvider}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>
          </View>

          {/* Google Calendar Sync */}
          <GoogleCalendarSync />

          {/* Phone Number Setting */}
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>
                   Phone Number {user?.phoneNumber ? '✅' : ''}
                </Text>
                {user?.phoneNumber ? (
                    <Text style={[styles.settingDescription, { color: COLORS.primary, fontWeight: '500' }]}>
                        {user.phoneNumber} • Linked
                    </Text>
                ) : (
                    <Text style={styles.settingDescription}>
                        Link your phone to find friends
                    </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  setPhoneNumberInput(user?.phoneNumber || '');
                  setPhoneModalVisible(true);
                }}
              >
                <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                  {user?.phoneNumber ? 'Change' : 'Link'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>


          <TouchableOpacity 
            style={styles.settingButton}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <Text style={styles.settingButtonText}>Notification Settings</Text>
            <Text style={styles.settingButtonIcon}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingButton}
            onPress={() => router.push('/(tabs)/privacy')}
          >
            <Text style={styles.settingButtonText}>Privacy & Data</Text>
            <Text style={styles.settingButtonIcon}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingButton}
            onPress={() => router.push('/(tabs)/about')}
          >
            <Text style={styles.settingButtonText}>About MemoVox</Text>
            <Text style={styles.settingButtonIcon}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleClearData}
          >
            <Text style={styles.dangerButtonText}>Clear All Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>MemoVox v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Your AI-powered voice companion
          </Text>
        </View>
      </ScrollView>

      {/* Phone Number Modal (For Android compatibility) */}
      <Modal
        visible={phoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
        >
            <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Link Phone Number</Text>
                <Text style={styles.modalSubtitle}>
                    Enter your phone number (e.g. +1234567890) so friends can find you.
                </Text>
                
                <View style={styles.phoneInputContainer}>
                    <View style={styles.countryCodeContainer}>
                        <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                        {/* A real app would have a picker here, hardcoded to India default as requested */}
                    </View>
                    <TextInput
                        style={[styles.modalInput, styles.phoneInput]}
                        value={phoneNumberInput}
                        onChangeText={setPhoneNumberInput}
                        placeholder="9876543210"
                        placeholderTextColor={COLORS.gray[400]}
                        keyboardType="phone-pad"
                        autoFocus
                    />
                </View>
                <Text style={styles.helperText}>Default country code is India (+91). Enter 10-digit number.</Text>
                
                <View style={styles.modalButtons}>
                    <TouchableOpacity 
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => setPhoneModalVisible(false)}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.modalButton, styles.saveButton]}
                        onPress={handleSavePhone}
                    >
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 24,
    top: 48,
    zIndex: 10,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 12,
  },
  personaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  personaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  personaLabel: {
    fontSize: 14,
    color: COLORS.gray[600],
    fontWeight: '500',
  },
  personaValue: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '600',
  },
  personaKeywords: {
    marginTop: 8,
  },
  keywordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  keywordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  keywordText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '500',
  },
  keywordCount: {
    fontSize: 10,
    color: COLORS.white,
    opacity: 0.8,
  },
  personaCategories: {
    marginTop: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryChipText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  inviteButton: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  inviteButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteIcon: {
    fontSize: 24,
  },
  inviteTextContainer: {
    flex: 1,
  },
  inviteButtonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  inviteButtonSubtitle: {
    fontSize: 13,
    color: COLORS.gray[600],
    lineHeight: 18,
  },
  inviteButtonArrow: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: '600',
  },
  settingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: COLORS.gray[600],
  },
  settingButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingButtonText: {
    fontSize: 16,
    color: COLORS.dark,
  },
  settingButtonIcon: {
    fontSize: 18,
    color: COLORS.gray[400],
  },
  dangerButton: {
    backgroundColor: COLORS.error,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  logoutButton: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.error,
  },
  footer: {
    alignItems: 'center',
    padding: 32,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.gray[500],
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 11,
    color: COLORS.gray[400],
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.gray[600],
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: COLORS.gray[100],
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.dark,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.gray[100],
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[600],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
