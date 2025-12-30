import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { VoiceMemo } from '../types';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class ReminderService {
  private static instance: ReminderService;

  private constructor() {}

  static getInstance(): ReminderService {
    if (!ReminderService.instance) {
      ReminderService.instance = new ReminderService();
    }
    return ReminderService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }
    return true;
  }

  async scheduleMemoReminder(memo: VoiceMemo, title: string, body: string, secondsFromNow: number = 2) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: { memoId: memo.id },
        sound: true,
      },
      trigger: {
        seconds: secondsFromNow,
      } as any, 
    });
    console.log(`Scheduled reminder for memo: ${memo.id} in ${secondsFromNow} seconds`);
  }

  async scheduleSmartReminder(title: string, body: string, hoursLater: number = 4) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // Convert hours to seconds for testing, but in production use hours * 3600
    // For demo/testing purposes, let's make it 10 seconds if it's "4 hours"
    // In real app: seconds: hoursLater * 60 * 60
    const triggerSeconds = hoursLater * 60 * 60;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: {
        seconds: triggerSeconds, 
      } as any,
    });
    console.log(`Scheduled smart reminder: "${title}" in ${triggerSeconds} seconds`);
  }

  async getAllScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export default ReminderService.getInstance();
