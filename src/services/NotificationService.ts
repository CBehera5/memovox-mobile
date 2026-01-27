// src/services/NotificationService.ts

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Notification, VoiceMemo } from '../types';
import StorageService from './StorageService';
import AgentService from './AgentService';
import { supabase } from '../config/supabase';

// Define notification categories with actions
if (Platform.OS !== 'web') {
  try {
    // Set up notification categories with actions
    Notifications.setNotificationCategoryAsync('task-actions', [
      {
        identifier: 'complete',
        buttonTitle: '✓ Complete',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'snooze-10',
        buttonTitle: 'Snooze 10m',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'snooze-1h',
        buttonTitle: 'Snooze 1h',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    Notifications.setNotificationCategoryAsync('reminder-actions', [
      {
        identifier: 'complete',
        buttonTitle: '✓ Done',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'snooze-30',
        buttonTitle: 'Snooze 30m',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  } catch (error) {
    console.warn('Error setting notification categories:', error);
  }
}

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

  /**
   * Create a generic notification
   */
  async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    type: 'system' | 'reminder' | 'insight' | 'followup' | 'assignment' | 'group_invite';
    data?: any;
  }): Promise<void> {
    try {
      const notification: Notification = {
        id: `notify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: params.userId,
        memoId: params.data?.memoId || '',
        type: params.type,
        title: params.title,
        body: params.message,
        scheduledFor: new Date().toISOString(),
        sent: false,
        createdAt: new Date().toISOString(),
        // Add extra data if needed, but Notification type might need extension if 'data' is not standard
      };

      // Persist to Supabase if needed, or at least StorageService
      // Assuming StorageService syncs or we use Supabase directly here?
      // Existing methods use StorageService.saveNotification.
      // But we also want to ensure it reaches the user via Supabase for multi-device/push.
      
      // 1. Save to Supabase (so it syncs to user's other devices/shows in list)
      const { error } = await supabase.from('notifications').insert({
        id: notification.id,
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        is_read: false,
        created_at: notification.createdAt,
        data: params.data
      });

      if (error) {
        console.error('Error creating notification in Supabase:', error);
      }

      // 2. Schedule local notification immediately (if on the device)
      // Note: This only works if we are the target user. 
      // Since shareMemo runs on Sender's device, we CANNOT schedule a local notification for the Recipient here.
      // The Recipient needs a real Push Notification service or a listener on Supabase changes.
      // For now, inserting into Supabase is the "Signal". 
      // The recipient's app (via Realtime or periodic fetch) would pick it up.
      // HOWEVER, the standard `scheduleNotification` is for LOCAL only.
      
      // The user requested: "added member should get the notification".
      // Writing to Supabase 'notifications' table is the correct step for an MVP without Push Server.
      // The recipient's home.tsx polls for unread count, so the badge will update.
      // To get a Pop-up on recipient device requires Supabase Realtime or true Push.
      // I will assume Supabase persistence satisfies the "get the notification" (in the list/badge) requirement for now,
      // as setting up FCM/APNS requires server-side keys which we don't have fully configured in this context.
      
    } catch (error) {
      console.error('Error creating generic notification:', error);
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

  /**
   * Snooze a notification for a specified duration
   */
  async snoozeNotification(notificationId: string, minutes: number): Promise<string> {
    try {
      // Get the notification from storage
      const notifications = await StorageService.getNotifications();
      const notification = notifications.find(n => n.id === notificationId);

      if (!notification) {
        throw new Error('Notification not found');
      }

      // Cancel the existing scheduled notification
      await this.cancelNotification(notificationId);

      // Calculate new scheduled time
      const snoozeDate = new Date();
      snoozeDate.setMinutes(snoozeDate.getMinutes() + minutes);

      // Update notification
      const updatedNotification: Notification = {
        ...notification,
        scheduledFor: snoozeDate.toISOString(),
        snoozedCount: (notification.snoozedCount || 0) + 1,
        originalScheduledFor: notification.originalScheduledFor || notification.scheduledFor,
      };

      // Save updated notification
      await StorageService.saveNotification(updatedNotification);

      // Reschedule
      const newNotificationId = await this.scheduleNotification(updatedNotification);

      console.log(`✅ Notification snoozed for ${minutes} minutes`);
      return newNotificationId;
    } catch (error) {
      console.error('Error snoozing notification:', error);
      throw error;
    }
  }

  /**
   * Schedule a recurring notification
   */
  async scheduleRecurringNotification(notification: Notification): Promise<string[]> {
    try {
      if (Platform.OS === 'web') {
        console.log('Recurring notifications not available on web platform');
        return ['web-skipped'];
      }

      if (!notification.recurring || !notification.recurring.enabled) {
        throw new Error('Recurring configuration not provided');
      }

      const { frequency, interval, daysOfWeek, endDate } = notification.recurring;
      const notificationIds: string[] = [];

      switch (frequency) {
        case 'daily':
          const dailyTrigger: Notifications.CalendarTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            hour: new Date(notification.scheduledFor).getHours(),
            minute: new Date(notification.scheduledFor).getMinutes(),
            repeats: true,
          };
          const dailyId = await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.title,
              body: notification.body,
              data: { 
                notificationId: notification.id, 
                memoId: notification.memoId,
                actionId: notification.actionData?.actionId 
              },
              categoryIdentifier: notification.actionData?.canComplete ? 'task-actions' : undefined,
              sound: notification.soundName || 'default',
            },
            trigger: dailyTrigger,
          });
          notificationIds.push(dailyId);
          break;

        case 'weekly':
          if (daysOfWeek && daysOfWeek.length > 0) {
            for (const day of daysOfWeek) {
              const weeklyTrigger: Notifications.CalendarTriggerInput = {
                type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                weekday: day + 1, // Expo uses 1-7 (Sunday-Saturday)
                hour: new Date(notification.scheduledFor).getHours(),
                minute: new Date(notification.scheduledFor).getMinutes(),
                repeats: true,
              };
              const weeklyId = await Notifications.scheduleNotificationAsync({
                content: {
                  title: notification.title,
                  body: notification.body,
                  data: { 
                    notificationId: notification.id, 
                    memoId: notification.memoId,
                    actionId: notification.actionData?.actionId 
                  },
                  categoryIdentifier: notification.actionData?.canComplete ? 'task-actions' : undefined,
                  sound: notification.soundName || 'default',
                },
                trigger: weeklyTrigger,
              });
              notificationIds.push(weeklyId);
            }
          }
          break;

        case 'monthly':
          const monthlyTrigger: Notifications.CalendarTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            day: new Date(notification.scheduledFor).getDate(),
            hour: new Date(notification.scheduledFor).getHours(),
            minute: new Date(notification.scheduledFor).getMinutes(),
            repeats: true,
          };
          const monthlyId = await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.title,
              body: notification.body,
              data: { 
                notificationId: notification.id, 
                memoId: notification.memoId,
                actionId: notification.actionData?.actionId 
              },
              categoryIdentifier: notification.actionData?.canComplete ? 'task-actions' : undefined,
              sound: notification.soundName || 'default',
            },
            trigger: monthlyTrigger,
          });
          notificationIds.push(monthlyId);
          break;

        default:
          throw new Error(`Unsupported frequency: ${frequency}`);
      }

      console.log(`✅ Scheduled ${notificationIds.length} recurring notifications`);
      return notificationIds;
    } catch (error) {
      console.error('Error scheduling recurring notification:', error);
      throw error;
    }
  }

  /**
   * Schedule an enhanced notification with actions and custom sound
   */
  async scheduleEnhancedNotification(notification: Notification): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        console.log('Notifications not available on web platform');
        return 'web-skipped';
      }

      // Handle recurring notifications
      if (notification.recurring?.enabled) {
        const ids = await this.scheduleRecurringNotification(notification);
        return ids[0]; // Return first ID
      }

      const scheduledDate = new Date(notification.scheduledFor);
      const now = new Date();

      // Determine category based on action data
      let categoryIdentifier: string | undefined;
      if (notification.actionData?.canComplete) {
        categoryIdentifier = notification.type === 'reminder' ? 'reminder-actions' : 'task-actions';
      }

      const trigger = scheduledDate <= now ? null : scheduledDate;

      return await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: { 
            notificationId: notification.id, 
            memoId: notification.memoId,
            actionId: notification.actionData?.actionId,
            canComplete: notification.actionData?.canComplete,
            canSnooze: notification.actionData?.canSnooze,
          },
          categoryIdentifier,
          sound: notification.soundName || 'default',
        },
        trigger: trigger as any,
      });
    } catch (error) {
      console.error('Error scheduling enhanced notification:', error);
      throw error;
    }
  }

  /**
   * Handle notification action response (complete or snooze)
   */
  async handleNotificationAction(
    actionIdentifier: string, 
    notification: Notifications.Notification
  ): Promise<void> {
    try {
      const data = notification.request.content.data;
      const notificationId = data.notificationId as string;
      const actionId = data.actionId as string;

      console.log(`🔔 Notification action: ${actionIdentifier}`);

      if (actionIdentifier === 'complete') {
        // Mark action as complete
        if (actionId) {
          await AgentService.updateActionStatus(actionId, 'completed');
          console.log(`✅ Task ${actionId} marked as complete from notification`);
        }
      } else if (actionIdentifier.startsWith('snooze-')) {
        // Extract snooze duration
        const duration = actionIdentifier.split('-')[1];
        let minutes = 10; // default

        if (duration === '10') minutes = 10;
        else if (duration === '30') minutes = 30;
        else if (duration === '1h') minutes = 60;

        // Snooze the notification
        await this.snoozeNotification(notificationId, minutes);
        console.log(`⏰ Notification snoozed for ${minutes} minutes`);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  }

  /**
   * Get custom sound options for notifications
   */
  getAvailableSounds(): { label: string; value: string }[] {
    return [
      { label: '🔔 Default', value: 'default' },
      { label: '📢 Attention', value: 'attention' },
      { label: '✨ Gentle', value: 'gentle' },
      { label: '⚡ Urgent', value: 'urgent' },
      { label: '🎵 Melody', value: 'melody' },
    ];
  }

  /**
   * Get unread notification count
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadNotificationCount:', error);
      return 0;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markNotificationsAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking notifications as read:', error);
      }
    } catch (error) {
      console.error('Error in markNotificationsAsRead:', error);
    }
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(userId: string, limit = 20): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  }
}

export default new NotificationService();