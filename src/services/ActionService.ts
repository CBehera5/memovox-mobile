// src/services/ActionService.ts

import { Groq } from 'groq-sdk';
import * as Notifications from 'expo-notifications';
import StorageService from './StorageService';
import LanguageService, { SupportedLanguage } from './LanguageService';
import { GROQ_API_KEY } from '../config/env';

export interface ActionRequest {
  type: 'reminder' | 'alarm' | 'notification' | 'calendar' | 'task' | null;
  title: string;
  description: string;
  dueTime?: Date;
  priority?: 'high' | 'medium' | 'low';
  originalUserMessage: string;
  userId?: string;
  createdFrom?: string;
  assignedToName?: string;
  assignedToId?: string;
  sessionId?: string; // Chat session that created this task
  category?: string; // Task category (Health, Work, etc.)
}

export interface ActionResult {
  success: boolean;
  actionType: string;
  message: string;
  actionId?: string;
}

class ActionService {
  private groqClient: Groq | null = null;
  private apiKey: string = GROQ_API_KEY;

  constructor() {
    if (__DEV__) console.log('🔧 ActionService: Initializing...');
    this.initializeGroq();
    this.configureNotifications();
  }

  private initializeGroq(): void {
    if (this.apiKey) {
      try {
        this.groqClient = new Groq({
          apiKey: this.apiKey,
          dangerouslyAllowBrowser: true,
        });
        if (__DEV__) console.log('✅ ActionService: Groq client initialized');
      } catch (error) {
        console.error('❌ ActionService: Error initializing Groq client:', error);
        this.groqClient = null;
      }
    }
  }

  private configureNotifications(): void {
    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    console.log('Notifications configured');
  }

  /**
   * Parse user message to detect and extract action intent
   * Uses AI to understand natural language requests in user's preferred language
   */
  async parseUserRequest(userMessage: string, language?: SupportedLanguage): Promise<ActionRequest> {
    if (!this.groqClient) {
      console.warn('Groq client not initialized');
      return {
        type: null,
        title: '',
        description: userMessage,
        originalUserMessage: userMessage,
      };
    }

    try {
      const systemPrompt = LanguageService.getActionParsingPrompt();

      const response = await this.groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 256,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Parse this user request in ${LanguageService.getLanguageConfig().nativeName} and extract action details: "${userMessage}"
            
            Return ONLY valid JSON (no markdown, no code blocks) with this structure:
            {
              "type": "reminder" | "alarm" | "notification" | "calendar" | "task" | null,
              "title": "string",
              "dueTime": "string (parsed natural language time)",
              "priority": "high" | "medium" | "low"
            }`,
          },
        ],
      });

      const content = response.choices[0].message.content || '';
      console.log('AI parsed action:', content);

      try {
        // Try to parse JSON from response
        const parsed = JSON.parse(content);
        
        // Convert dueTime string to Date object
        let dueDate = this.parseTimeString(parsed.dueTime);

        // INTELLIGENT MOCK TIME (If missing)
        // User Request: "use your intelligence to add a mock time... and remind"
        if (!dueDate) {
            const now = new Date();
            // If it's before 5 PM, schedule for today evening (6 PM)
            if (now.getHours() < 17) {
                dueDate = new Date(now);
                dueDate.setHours(18, 0, 0, 0);
            } else {
                // Otherwise schedule for tomorrow morning (9 AM)
                dueDate = new Date(now);
                dueDate.setDate(dueDate.getDate() + 1);
                dueDate.setHours(9, 0, 0, 0);
            }
            console.log('🤖 AI assigned Mock Time:', dueDate.toLocaleString());
        }

        return {
          type: parsed.type || null,
          title: parsed.title || '',
          description: userMessage,
          dueTime: dueDate,
          priority: parsed.priority || 'medium',
          originalUserMessage: userMessage,
        };
      } catch (jsonError) {
        console.warn('Could not parse AI response as JSON:', content);
        // Return null type if we couldn't parse
        return {
          type: null,
          title: '',
          description: userMessage,
          originalUserMessage: userMessage,
        };
      }
    } catch (error) {
      console.error('Error parsing user request:', error);
      return {
        type: null,
        title: '',
        description: userMessage,
        originalUserMessage: userMessage,
      };
    }
  }

  /**
   * Execute the parsed action
   */
  async executeAction(actionRequest: ActionRequest): Promise<ActionResult> {
    try {
      if (!actionRequest.type) {
        return {
          success: false,
          actionType: 'none',
          message: 'No action detected in your request',
        };
      }

      switch (actionRequest.type) {
        case 'reminder':
          return await this.createReminder(actionRequest);
        case 'alarm':
          return await this.createAlarm(actionRequest);
        case 'notification':
          return await this.sendNotification(actionRequest);
        case 'calendar':
          return await this.createCalendarEvent(actionRequest);
        case 'task':
          return await this.createTask(actionRequest);
        default:
          return {
            success: false,
            actionType: actionRequest.type,
            message: `Action type "${actionRequest.type}" not yet implemented`,
          };
      }
    } catch (error) {
      console.error('Error executing action:', error);
      return {
        success: false,
        actionType: actionRequest.type || 'unknown',
        message: `Failed to execute action: ${error}`,
      };
    }
  }

  /**
   * Create a reminder
   */
  private async createReminder(actionRequest: ActionRequest): Promise<ActionResult> {
    try {
      const reminderId = `reminder_${Date.now()}`;
      const reminder = {
        id: reminderId,
        title: actionRequest.title,
        description: actionRequest.description,
        dueTime: actionRequest.dueTime || new Date(),
        priority: actionRequest.priority,
        createdAt: new Date().toISOString(),
        completed: false,
      };

      // Save to storage
      const reminders = await StorageService.getReminders();
      reminders.push(reminder);
      await StorageService.saveReminders(reminders);

      // Schedule notification if dueTime is set
      if (actionRequest.dueTime) {
        await this.scheduleNotification({
          title: `Reminder: ${actionRequest.title}`,
          body: actionRequest.description,
          triggerTime: actionRequest.dueTime,
          notificationId: reminderId,
        });
      }

      console.log('Reminder created:', reminder);
      return {
        success: true,
        actionType: 'reminder',
        message: `✓ Reminder set: "${actionRequest.title}" at ${actionRequest.dueTime?.toLocaleString() || 'when needed'}`,
        actionId: reminderId,
      };
    } catch (error) {
      console.error('Error creating reminder:', error);
      return {
        success: false,
        actionType: 'reminder',
        message: `Failed to create reminder: ${error}`,
      };
    }
  }

  /**
   * Create an alarm
   */
  private async createAlarm(actionRequest: ActionRequest): Promise<ActionResult> {
    try {
      const alarmId = `alarm_${Date.now()}`;
      const alarm = {
        id: alarmId,
        title: actionRequest.title,
        description: actionRequest.description,
        alarmTime: actionRequest.dueTime || new Date(),
        enabled: true,
        createdAt: new Date().toISOString(),
      };

      // Save to storage
      const alarms = await StorageService.getAlarms();
      alarms.push(alarm);
      await StorageService.saveAlarms(alarms);

      // Schedule notification for alarm
      if (actionRequest.dueTime) {
        await this.scheduleNotification({
          title: `🔔 Alarm: ${actionRequest.title}`,
          body: 'Time to wake up!',
          triggerTime: actionRequest.dueTime,
          notificationId: alarmId,
          sound: 'default',
        });
      }

      console.log('Alarm created:', alarm);
      return {
        success: true,
        actionType: 'alarm',
        message: `✓ Alarm set: ${actionRequest.dueTime?.toLocaleTimeString()} - ${actionRequest.title}`,
        actionId: alarmId,
      };
    } catch (error) {
      console.error('Error creating alarm:', error);
      return {
        success: false,
        actionType: 'alarm',
        message: `Failed to create alarm: ${error}`,
      };
    }
  }

  /**
   * Send a push notification
   */
  private async sendNotification(actionRequest: ActionRequest): Promise<ActionResult> {
    try {
      const notificationId = `notif_${Date.now()}`;

      // If dueTime is specified, schedule for later; otherwise send immediately
      if (actionRequest.dueTime && actionRequest.dueTime > new Date()) {
        await this.scheduleNotification({
          title: actionRequest.title,
          body: actionRequest.description,
          triggerTime: actionRequest.dueTime,
          notificationId: notificationId,
        });
        return {
          success: true,
          actionType: 'notification',
          message: `✓ Notification scheduled: "${actionRequest.title}" at ${actionRequest.dueTime.toLocaleString()}`,
          actionId: notificationId,
        };
      } else {
        // Send immediately
        await Notifications.scheduleNotificationAsync({
          content: {
            title: actionRequest.title,
            body: actionRequest.description,
            sound: 'default',
          },
          trigger: null, // Send immediately
        });
        return {
          success: true,
          actionType: 'notification',
          message: `✓ Notification sent: "${actionRequest.title}"`,
          actionId: notificationId,
        };
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        actionType: 'notification',
        message: `Failed to send notification: ${error}`,
      };
    }
  }

  /**
   * Create a calendar event
   */
  private async createCalendarEvent(actionRequest: ActionRequest): Promise<ActionResult> {
    try {
      const eventId = `event_${Date.now()}`;
      const calendarEvent = {
        id: eventId,
        title: actionRequest.title,
        description: actionRequest.description,
        startTime: actionRequest.dueTime || new Date(),
        endTime: new Date((actionRequest.dueTime || new Date()).getTime() + 60 * 60 * 1000), // +1 hour
        createdAt: new Date().toISOString(),
      };

      // Save to storage
      const events = await StorageService.getCalendarEvents();
      events.push(calendarEvent);
      await StorageService.saveCalendarEvents(events);

      // Schedule notification before event
      if (actionRequest.dueTime) {
        const notificationTime = new Date(actionRequest.dueTime.getTime() - 15 * 60 * 1000); // 15 min before
        if (notificationTime > new Date()) {
          await this.scheduleNotification({
            title: `📅 Upcoming: ${actionRequest.title}`,
            body: `Your event is in 15 minutes`,
            triggerTime: notificationTime,
            notificationId: `${eventId}_reminder`,
          });
        }
      }

      console.log('Calendar event created:', calendarEvent);
      return {
        success: true,
        actionType: 'calendar',
        message: `✓ Event scheduled: "${actionRequest.title}" on ${actionRequest.dueTime?.toLocaleString()}`,
        actionId: eventId,
      };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return {
        success: false,
        actionType: 'calendar',
        message: `Failed to create calendar event: ${error}`,
      };
    }
  }

  /**
   * Create a task
   */
  private async createTask(actionRequest: ActionRequest): Promise<ActionResult> {
    try {
      const taskId = `task_${Date.now()}`;
      const task = {
        id: taskId,
        userId: actionRequest.userId || 'unknown', // Fallback for safety
        type: 'task',
        title: actionRequest.title,
        description: actionRequest.description,
        dueDate: actionRequest.dueTime ? actionRequest.dueTime.toISOString() : new Date().toISOString(),
        priority: actionRequest.priority || 'medium',
        status: 'pending',
        createdFrom: actionRequest.createdFrom || 'chat',
        completed: false,
        createdAt: new Date().toISOString(),
        // Persist assignment details
        assignedToId: actionRequest.assignedToId,
        assignedToName: actionRequest.assignedToName,
        // Chat session that created this task
        sessionId: actionRequest.sessionId,
        category: actionRequest.category,
      };

      // Save to storage
      // Note: We cast to any because AgentAction might have more fields, but we satisfy the required ones
      const tasks = await StorageService.getTasks();
      tasks.push(task as any);
      await StorageService.saveTasks(tasks);

      // PROACTIVE REMINDER using the Mock Time / Set Time
      if (actionRequest.dueTime || task.dueDate) {
          const triggerTime = actionRequest.dueTime || new Date(task.dueDate);
          await this.scheduleNotification({
              title: `Task Reminder: ${task.title}`,
              body: `Time to focus on: ${task.description || task.title}`,
              triggerTime: triggerTime,
              notificationId: `${taskId}_reminder`,
          });
      }

      console.log('Task created:', task);
      return {
        success: true,
        actionType: 'task',
        message: `✓ Task created: "${actionRequest.title}" (${actionRequest.priority} priority)`,
        actionId: taskId,
      };
    } catch (error) {
      console.error('Error creating task:', error);
      return {
        success: false,
        actionType: 'task',
        message: `Failed to create task: ${error}`,
      };
    }
  }

  /**
   * Schedule a notification for a specific time
   */
  private async scheduleNotification(options: {
    title: string;
    body: string;
    triggerTime: Date;
    notificationId: string;
    sound?: string;
  }): Promise<string> {
    try {
      const now = new Date();
      const timeUntil = options.triggerTime.getTime() - now.getTime();

      // Only schedule if time is in the future
      if (timeUntil <= 0) {
        console.warn('Trigger time is in the past, sending immediately');
        return await Notifications.scheduleNotificationAsync({
          content: {
            title: options.title,
            body: options.body,
            sound: options.sound || 'default',
          },
          trigger: null,
        });
      }

      // Schedule for specific time
      const seconds = Math.floor(timeUntil / 1000);
      return await Notifications.scheduleNotificationAsync({
        content: {
          title: options.title,
          body: options.body,
          sound: options.sound || 'default', // Custom sounds need setup
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, seconds), // At least 1 second
          repeats: false,
        },
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Parse natural language time string to Date
   */
  private parseTimeString(timeString: string): Date | undefined {
    const now = new Date();
    const lowerTime = timeString.toLowerCase();

    // Handle "in X minutes/hours/days"
    const inMatch = lowerTime.match(/in\s+(\d+)\s+(minute|hour|day|second)s?/i);
    if (inMatch) {
      const amount = parseInt(inMatch[1]);
      const unit = inMatch[2].toLowerCase();
      const future = new Date(now);

      switch (unit) {
        case 'second':
          future.setSeconds(future.getSeconds() + amount);
          break;
        case 'minute':
          future.setMinutes(future.getMinutes() + amount);
          break;
        case 'hour':
          future.setHours(future.getHours() + amount);
          break;
        case 'day':
          future.setDate(future.getDate() + amount);
          break;
      }
      return future;
    }

    // Handle specific times like "3pm", "15:30"
    const timeMatch = lowerTime.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3];

      let adjustedHours = hours;
      if (ampm?.toLowerCase() === 'pm' && hours !== 12) {
        adjustedHours += 12;
      } else if (ampm?.toLowerCase() === 'am' && hours === 12) {
        adjustedHours = 0;
      }

      const scheduled = new Date(now);
      scheduled.setHours(adjustedHours, minutes, 0, 0);

      // If time is in the past today, set for tomorrow
      if (scheduled < now) {
        scheduled.setDate(scheduled.getDate() + 1);
      }

      return scheduled;
    }

    // Handle "tomorrow", "next monday", etc.
    if (lowerTime.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // Default to 9am
      return tomorrow;
    }

    // Handle day of week
    const dayMatch = lowerTime.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (dayMatch) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(dayMatch[1].toLowerCase());
      const today = now.getDay();
      let daysAhead = targetDay - today;

      if (daysAhead <= 0) {
        daysAhead += 7; // Next week if day already happened
      }

      const nextDate = new Date(now);
      nextDate.setDate(nextDate.getDate() + daysAhead);
      nextDate.setHours(9, 0, 0, 0); // Default to 9am
      return nextDate;
    }

    // If no time parsed, return undefined
    return undefined;
  }
}

export default new ActionService();
