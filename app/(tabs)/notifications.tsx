// app/(tabs)/notifications.tsx

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS, GRADIENTS } from '../../src/constants';
import StorageService from '../../src/services/StorageService';

export default function NotificationSettings() {
  const router = useRouter();
  
  // Notification Settings
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [memoReminders, setMemoReminders] = useState(true);
  const [aiInsights, setAiInsights] = useState(false);
  const [groupPlans, setGroupPlans] = useState(true);
  const [calendarSync, setCalendarSync] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const prefs = await StorageService.getNotificationPreferences();
      if (prefs) {
        setPushEnabled(prefs.pushEnabled ?? true);
        setEmailEnabled(prefs.emailEnabled ?? true);
        setTaskReminders(prefs.taskReminders ?? true);
        setMemoReminders(prefs.memoReminders ?? true);
        setAiInsights(prefs.aiInsights ?? false);
        setGroupPlans(prefs.groupPlans ?? true);
        setCalendarSync(prefs.calendarSync ?? true);
        setDailyDigest(prefs.dailyDigest ?? false);
        setSoundEnabled(prefs.soundEnabled ?? true);
        setVibrationEnabled(prefs.vibrationEnabled ?? true);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async (key: string, value: boolean) => {
    try {
      const prefs = await StorageService.getNotificationPreferences() || {};
      await StorageService.saveNotificationPreferences({ ...prefs, [key]: value });
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const handleToggle = (key: string, value: boolean, setter: (val: boolean) => void) => {
    setter(value);
    saveSettings(key, value);
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={GRADIENTS.primary} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* General Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive push notifications on your device
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(val) => handleToggle('pushEnabled', val, setPushEnabled)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive email updates and reminders
              </Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={(val) => handleToggle('emailEnabled', val, setEmailEnabled)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* Content Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Task Reminders</Text>
              <Text style={styles.settingDescription}>
                Get notified about upcoming tasks and deadlines
              </Text>
            </View>
            <Switch
              value={taskReminders}
              onValueChange={(val) => handleToggle('taskReminders', val, setTaskReminders)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled={!pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Memo Reminders</Text>
              <Text style={styles.settingDescription}>
                Reminders for unprocessed voice memos
              </Text>
            </View>
            <Switch
              value={memoReminders}
              onValueChange={(val) => handleToggle('memoReminders', val, setMemoReminders)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled={!pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>AI Insights</Text>
              <Text style={styles.settingDescription}>
                Get notifications when JEETU has new insights
              </Text>
            </View>
            <Switch
              value={aiInsights}
              onValueChange={(val) => handleToggle('aiInsights', val, setAiInsights)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled={!pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Group Plans</Text>
              <Text style={styles.settingDescription}>
                Updates from shared group planning sessions
              </Text>
            </View>
            <Switch
              value={groupPlans}
              onValueChange={(val) => handleToggle('groupPlans', val, setGroupPlans)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled={!pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Calendar Sync</Text>
              <Text style={styles.settingDescription}>
                Notifications for synced calendar events
              </Text>
            </View>
            <Switch
              value={calendarSync}
              onValueChange={(val) => handleToggle('calendarSync', val, setCalendarSync)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled={!pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Daily Digest</Text>
              <Text style={styles.settingDescription}>
                Daily summary of your tasks and memos (8 AM)
              </Text>
            </View>
            <Switch
              value={dailyDigest}
              onValueChange={(val) => handleToggle('dailyDigest', val, setDailyDigest)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled={!pushEnabled}
            />
          </View>
        </View>

        {/* Notification Style */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Style</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Sound</Text>
              <Text style={styles.settingDescription}>
                Play sound with notifications
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={(val) => handleToggle('soundEnabled', val, setSoundEnabled)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled={!pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Vibration</Text>
              <Text style={styles.settingDescription}>
                Vibrate when notifications arrive
              </Text>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={(val) => handleToggle('vibrationEnabled', val, setVibrationEnabled)}
              trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              thumbColor={COLORS.white}
              disabled={!pushEnabled}
            />
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Some notification permissions may need to be enabled in your device settings.
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.white,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.dark,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: COLORS.gray[600],
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.gray[700],
    lineHeight: 20,
  },
});
