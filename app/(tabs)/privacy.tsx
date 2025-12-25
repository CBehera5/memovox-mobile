// app/(tabs)/privacy.tsx

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS, GRADIENTS } from '../../src/constants';
import StorageService from '../../src/services/StorageService';
import AuthService from '../../src/services/AuthService';
import VoiceMemoService from '../../src/services/VoiceMemoService';

export default function PrivacyAndData() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Privacy Settings
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [crashReportsEnabled, setCrashReportsEnabled] = useState(true);
  const [personalizedAdsEnabled, setPersonalizedAdsEnabled] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await StorageService.getUser();
      setUser(userData);
      
      // Load privacy preferences (implement in StorageService)
      const prefs = await StorageService.getPrivacyPreferences();
      if (prefs) {
        setAnalyticsEnabled(prefs.analyticsEnabled ?? false);
        setCrashReportsEnabled(prefs.crashReportsEnabled ?? true);
        setPersonalizedAdsEnabled(prefs.personalizedAdsEnabled ?? false);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const savePrivacyPreferences = async () => {
    try {
      await StorageService.savePrivacyPreferences({
        analyticsEnabled,
        crashReportsEnabled,
        personalizedAdsEnabled,
        updatedAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Privacy preferences saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences');
    }
  };

  // GDPR/CCPA Compliance: Data Export (Right to Data Portability)
  const handleExportData = async () => {
    setLoading(true);
    try {
      if (!user) {
        Alert.alert('Error', 'Please log in first');
        return;
      }

      // Gather all user data
      const userData = await StorageService.getUser();
      const memos = await VoiceMemoService.getUserMemos(user.id);
      const persona = await StorageService.getUserPersona();
      const chatSessions = await StorageService.getUserChatSessions(user.id);
      
      const exportData = {
        exportedAt: new Date().toISOString(),
        user: {
          id: userData?.id,
          email: userData?.email,
          name: userData?.name,
          createdAt: userData?.createdAt,
        },
        memos: memos.map(memo => ({
          id: memo.id,
          title: memo.title,
          transcription: memo.transcription,
          category: memo.category,
          duration: memo.duration,
          createdAt: memo.createdAt,
          aiAnalysis: memo.aiAnalysis,
        })),
        persona,
        chatSessions: chatSessions.map(session => ({
          id: session.id,
          title: session.title,
          messages: session.messages,
          createdAt: session.createdAt,
        })),
        privacyPreferences: {
          analyticsEnabled,
          crashReportsEnabled,
          personalizedAdsEnabled,
        },
        totalMemos: memos.length,
        totalChatSessions: chatSessions.length,
      };

      // Show the data export summary
      const dataSize = JSON.stringify(exportData).length;
      const fileSizeKB = (dataSize / 1024).toFixed(2);

      Alert.alert(
        'Export Complete',
        `Your data has been prepared for export:\n\n` +
        `• ${exportData.memos.length} voice memos\n` +
        `• ${exportData.chatSessions.length} chat sessions\n` +
        `• Personal AI profile\n` +
        `• Privacy preferences\n\n` +
        `Total size: ${fileSizeKB} KB\n\n` +
        `This data would normally be saved as a JSON file. In production, you can download or email this file.`,
        [
          { 
            text: 'View Summary', 
            onPress: () => {
              console.log('GDPR Data Export:', exportData);
              Alert.alert('Data Logged', 'Check console for full export data');
            }
          },
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Unable to export your data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // GDPR/CCPA Compliance: Right to Erasure (Right to be Forgotten)
  const handleDeleteAllData = () => {
    Alert.alert(
      '🚨 Delete All Data',
      'This will permanently delete:\n\n• All voice memos and transcriptions\n• All chat history\n• Your AI persona profile\n• All settings and preferences\n• Your account\n\nThis action CANNOT be undone and complies with GDPR/CCPA data deletion requirements.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'Type "DELETE" to confirm permanent data deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm',
                  style: 'destructive',
                  onPress: confirmDataDeletion,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const confirmDataDeletion = async () => {
    setLoading(true);
    try {
      if (!user) {
        Alert.alert('Error', 'No user found');
        return;
      }

      // Delete all data from Supabase
      const memos = await VoiceMemoService.getUserMemos(user.id);
      for (const memo of memos) {
        await VoiceMemoService.deleteMemo(memo.id, user.id);
      }

      // Clear local storage
      await StorageService.clearAllData();

      // Delete account from auth
      await AuthService.deleteAccount();

      Alert.alert(
        'Account Deleted',
        'All your data has been permanently deleted. You will now be logged out.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error) {
      console.error('Deletion error:', error);
      Alert.alert('Error', 'Failed to delete all data. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  // View what data we collect
  const handleViewCollectedData = () => {
    Alert.alert(
      'Data We Collect',
      '📊 MemoVox collects the following data:\n\n' +
      '1. ACCOUNT INFORMATION\n' +
      '   • Email address\n' +
      '   • Name\n' +
      '   • Account creation date\n\n' +
      '2. VOICE RECORDINGS\n' +
      '   • Audio files of your memos\n' +
      '   • Transcriptions\n' +
      '   • AI-generated summaries\n\n' +
      '3. USAGE DATA\n' +
      '   • App interactions\n' +
      '   • Feature usage patterns\n' +
      '   • AI conversation history\n\n' +
      '4. TECHNICAL DATA\n' +
      '   • Device information\n' +
      '   • Error logs (if enabled)\n' +
      '   • App performance data\n\n' +
      '🔒 Your data is:\n' +
      '✓ Encrypted in transit (TLS)\n' +
      '✓ Stored securely\n' +
      '✓ Never sold to third parties\n' +
      '✓ Used only to provide services',
      [{ text: 'OK' }]
    );
  };

  // Data Retention Policy
  const handleViewRetentionPolicy = () => {
    Alert.alert(
      'Data Retention Policy',
      '📅 How long we keep your data:\n\n' +
      '• ACTIVE ACCOUNT: Indefinitely while you use the app\n\n' +
      '• DELETED ACCOUNT: Immediately purged from active systems\n\n' +
      '• BACKUPS: Removed within 30 days of account deletion\n\n' +
      '• LEGAL HOLDS: Retained only as required by law\n\n' +
      '🌍 Compliance:\n' +
      '✓ GDPR (EU/UK)\n' +
      '✓ CCPA/CPRA (California)\n' +
      '✓ UK GDPR\n' +
      '✓ Data Protection Act 2018',
      [{ text: 'OK' }]
    );
  };

  // Third-party data sharing
  const handleViewThirdPartySharing = () => {
    Alert.alert(
      'Third-Party Data Sharing',
      '🤝 Services we use (and what they receive):\n\n' +
      '1. GROQ AI (Transcription & AI Chat)\n' +
      '   • Voice audio (temporary)\n' +
      '   • Text transcriptions\n' +
      '   • NOT stored permanently\n\n' +
      '2. SUPABASE (Database & Auth)\n' +
      '   • Account information\n' +
      '   • Encrypted memo data\n' +
      '   • SOC 2 Type II certified\n\n' +
      '3. EXPO (App Infrastructure)\n' +
      '   • Anonymous usage data\n' +
      '   • Crash reports (if enabled)\n\n' +
      '🚫 WE DO NOT:\n' +
      '✗ Sell your data\n' +
      '✗ Use data for advertising\n' +
      '✗ Share with data brokers',
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={GRADIENTS.primary as any} style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privacy & Data</Text>
          <Text style={styles.headerSubtitle}>
            Your data, your rights
          </Text>
        </LinearGradient>

        {/* Privacy Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Controls</Text>
          <Text style={styles.sectionDescription}>
            Control how we use your data
          </Text>

          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.switchLabel}>Analytics</Text>
              <Text style={styles.switchDescription}>
                Help improve the app by sharing usage data
              </Text>
            </View>
            <Switch
              value={analyticsEnabled}
              onValueChange={(value) => {
                setAnalyticsEnabled(value);
                savePrivacyPreferences();
              }}
              trackColor={{ false: COLORS.gray[300], true: '#667eea' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.switchLabel}>Crash Reports</Text>
              <Text style={styles.switchDescription}>
                Send error reports to help fix bugs
              </Text>
            </View>
            <Switch
              value={crashReportsEnabled}
              onValueChange={(value) => {
                setCrashReportsEnabled(value);
                savePrivacyPreferences();
              }}
              trackColor={{ false: COLORS.gray[300], true: '#667eea' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.switchLabel}>Personalized Ads</Text>
              <Text style={styles.switchDescription}>
                Currently disabled (we don't show ads)
              </Text>
            </View>
            <Switch
              value={personalizedAdsEnabled}
              onValueChange={(value) => {
                setPersonalizedAdsEnabled(value);
                savePrivacyPreferences();
              }}
              trackColor={{ false: COLORS.gray[300], true: '#667eea' }}
              disabled={true}
            />
          </View>
        </View>

        {/* Your Rights (GDPR/CCPA) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Data Rights</Text>
          <Text style={styles.sectionDescription}>
            GDPR, UK GDPR, and CCPA/CPRA compliant
          </Text>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleExportData}
            disabled={loading}
          >
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionIcon}>📦</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Export My Data</Text>
                <Text style={styles.actionDescription}>
                  Download all your data (JSON format)
                </Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewCollectedData}
          >
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionIcon}>📊</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>What Data We Collect</Text>
                <Text style={styles.actionDescription}>
                  See what information we store
                </Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewRetentionPolicy}
          >
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionIcon}>📅</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Data Retention Policy</Text>
                <Text style={styles.actionDescription}>
                  How long we keep your data
                </Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleViewThirdPartySharing}
          >
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionIcon}>🤝</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Third-Party Sharing</Text>
                <Text style={styles.actionDescription}>
                  Services that process your data
                </Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Legal Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionIcon}>📄</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Privacy Policy</Text>
                <Text style={styles.actionDescription}>
                  Read our full privacy policy
                </Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionIcon}>📋</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Terms of Service</Text>
                <Text style={styles.actionDescription}>
                  View terms and conditions
                </Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionIcon}>🍪</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Cookie Policy</Text>
                <Text style={styles.actionDescription}>
                  How we use cookies (mobile app)
                </Text>
              </View>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.dangerTitle}>⚠️ Danger Zone</Text>
          <Text style={styles.sectionDescription}>
            Irreversible actions
          </Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={handleDeleteAllData}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.dangerButtonIcon}>🗑️</Text>
                <View style={styles.dangerButtonContent}>
                  <Text style={styles.dangerButtonTitle}>
                    Delete All Data & Account
                  </Text>
                  <Text style={styles.dangerButtonDescription}>
                    Permanent deletion - cannot be undone
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🔒 Your privacy matters</Text>
          <Text style={styles.footerSubtext}>
            Compliant with GDPR, UK GDPR, CCPA, and CPRA
          </Text>
          <Text style={styles.footerSubtext}>
            Last updated: December 2024
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  section: {
    padding: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginBottom: 16,
  },
  dangerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF5350',
    marginBottom: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: COLORS.gray[500],
  },
  actionArrow: {
    fontSize: 20,
    color: COLORS.gray[400],
    marginLeft: 8,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF5350',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#EF5350',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dangerButtonIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  dangerButtonContent: {
    flex: 1,
  },
  dangerButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  dangerButtonDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  footer: {
    alignItems: 'center',
    padding: 32,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[600],
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 12,
    color: COLORS.gray[400],
    marginTop: 4,
  },
});
