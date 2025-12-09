// src/services/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Notification, VoiceMemo } from '../types';
import StorageService from './StorageService';

// Configure notifications - wrap in try-catch to handle permission errors and web platform
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn('Error setting notification handler:', error);
  }
}

class NotificationService {
  async initialize(): Promise<void> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Notification permission not granted');
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
      throw error;
    }
  }

  async scheduleNotification(notification: Notification): Promise<string> {
    try {
      // Skip notifications on web platform
      if (Platform.OS === 'web') {
        console.log('Notifications not available on web platform');
        return 'web-skipped';
      }

      const scheduledDate = new Date(notification.scheduledFor);
      const now = new Date();

      if (scheduledDate <= now) {
        // If the time has passed, schedule for immediate delivery
        return await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title,
            body: notification.body,
            data: { notificationId: notification.id, memoId: notification.memoId },
          },
          trigger: null, // Immediate
        });
      }

      return await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: { notificationId: notification.id, memoId: notification.memoId },
        },
        trigger: scheduledDate as any,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  async createReminderNotification(memo: VoiceMemo): Promise<void> {
    try {
      if (memo.type !== 'reminder' || !memo.metadata?.reminderDate) {
        return;
      }

      const reminderDate = new Date(memo.metadata.reminderDate);
      
      // Validate that reminderDate is a valid Date
      if (isNaN(reminderDate.getTime())) {
        console.warn('Invalid reminder date, skipping notification:', memo.metadata.reminderDate);
        return;
      }

      const notification: Notification = {
        id: `reminder_${memo.id}_${Date.now()}`,
        userId: memo.userId,
        memoId: memo.id,
        type: 'reminder',
        title: '⏰ Reminder',
        body: memo.title || memo.transcription.substring(0, 100),
        scheduledFor: memo.metadata.reminderDate,
        sent: false,
        createdAt: new Date().toISOString(),
      };

      await StorageService.saveNotification(notification);
      await this.scheduleNotification(notification);
    } catch (error) {
      console.error('Error creating reminder notification:', error);
    }
  }

  async createEventNotification(memo: VoiceMemo): Promise<void> {
    try {
      if (memo.type !== 'event' || !memo.metadata?.eventDate) {
        return;
      }

      const eventDate = new Date(memo.metadata.eventDate);
      
      // Validate that eventDate is a valid Date
      if (isNaN(eventDate.getTime())) {
        console.warn('Invalid event date, skipping notification:', memo.metadata.eventDate);
        return;
      }

      const reminderDate = new Date(eventDate.getTime() - 3600000); // 1 hour before

      const notification: Notification = {
        id: `event_${memo.id}_${Date.now()}`,
        userId: memo.userId,
        memoId: memo.id,
        type: 'reminder',
        title: '📅 Upcoming Event',
        body: memo.title || memo.transcription.substring(0, 100),
        scheduledFor: reminderDate.toISOString(),
        sent: false,
        createdAt: new Date().toISOString(),
      };

      await StorageService.saveNotification(notification);
      await this.scheduleNotification(notification);
    } catch (error) {
      console.error('Error creating event notification:', error);
    }
  }

  async createFollowUpNotification(memo: VoiceMemo, followUpText: string, daysFromNow: number = 7): Promise<void> {
    try {
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + daysFromNow);

      const notification: Notification = {
        id: `followup_${memo.id}_${Date.now()}`,
        userId: memo.userId,
        memoId: memo.id,
        type: 'followup',
        title: '💡 Follow-up Suggestion',
        body: followUpText,
        scheduledFor: followUpDate.toISOString(),
        sent: false,
        createdAt: new Date().toISOString(),
      };

      await StorageService.saveNotification(notification);
      await this.scheduleNotification(notification);
    } catch (error) {
      console.error('Error creating follow-up notification:', error);
    }
  }

  async createInsightNotification(userId: string, insight: string): Promise<void> {
    try {
      const notification: Notification = {
        id: `insight_${userId}_${Date.now()}`,
        userId,
        memoId: '',
        type: 'insight',
        title: '✨ MemoVox Insight',
        body: insight,
        scheduledFor: new Date().toISOString(),
        sent: false,
        createdAt: new Date().toISOString(),
      };

      await StorageService.saveNotification(notification);
      await this.scheduleNotification(notification);
    } catch (error) {
      console.error('Error creating insight notification:', error);
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  async getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  setupNotificationListener(callback: (notification: Notifications.Notification) => void): void {
    Notifications.addNotificationReceivedListener(callback);
  }

  setupNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void): void {
    Notifications.addNotificationResponseReceivedListener(callback);
  }
}

export default new NotificationService();