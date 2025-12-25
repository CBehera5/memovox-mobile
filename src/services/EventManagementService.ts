// src/services/EventManagementService.ts

import AgentService from './AgentService';
import NotificationService from './NotificationService';
import ProactiveAIService, { ActionItem, FollowUp } from './ProactiveAIService';
import { ChatMessage } from './ChatService';
import { AgentAction } from '../types';

export type EventPhase = 'planning' | 'preparation' | 'execution' | 'follow-up' | 'completed';

export interface ManagedEvent {
  id: string;
  userId: string;
  title: string;
  description: string;
  eventDate: string;
  eventTime?: string;
  location?: string;
  attendees?: string[];
  phase: EventPhase;
  tasks: string[]; // Task IDs
  followUps: FollowUp[];
  conversationHistory: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Event Management Service
 * Manages the complete lifecycle of events:
 * - Planning phase: Gathering information
 * - Preparation phase: Creating tasks, setting reminders
 * - Execution phase: Day-of coordination
 * - Follow-up phase: Post-event feedback
 */
class EventManagementService {
  /**
   * Create a new managed event from planning conversation
   */
  async createManagedEvent(
    userId: string,
    conversation: ChatMessage[],
    extractedInfo: {
      title: string;
      description?: string;
      eventDate: string;
      eventTime?: string;
      location?: string;
      attendees?: string[];
    }
  ): Promise<ManagedEvent> {
    const event: ManagedEvent = {
      id: `event_${userId}_${Date.now()}`,
      userId,
      title: extractedInfo.title,
      description: extractedInfo.description || '',
      eventDate: extractedInfo.eventDate,
      eventTime: extractedInfo.eventTime,
      location: extractedInfo.location,
      attendees: extractedInfo.attendees || [],
      phase: 'planning',
      tasks: [],
      followUps: [],
      conversationHistory: conversation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Generate smart follow-ups
    event.followUps = ProactiveAIService.scheduleSmartFollowUps({
      title: event.title,
      date: event.eventDate,
      type: 'event',
    });

    console.log('✅ Created managed event:', event.id);
    return event;
  }

  /**
   * Extract tasks from conversation and create them for event
   */
  async createEventTasks(
    event: ManagedEvent,
    actionItems: ActionItem[]
  ): Promise<AgentAction[]> {
    const createdTasks: AgentAction[] = [];

    for (const item of actionItems) {
      try {
        // Create task using AgentService
        const task = await AgentService.createAction(
          {
            id: `task_${event.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: event.userId,
            type: item.type === 'event' ? 'calendar_event' : item.type,
            title: item.title,
            description: item.description || item.reasoning,
            dueDate: this.parseDueDate(item.dueDate, event.eventDate),
            priority: item.priority || 'medium',
            status: 'pending',
            createdFrom: 'ai-event-planning',
            createdAt: new Date().toISOString(),
          },
          event.userId
        );

        if (task) {
          createdTasks.push(task);
          event.tasks.push(task.id);

          // Schedule notification for this task
          if (task.dueDate) {
            await NotificationService.scheduleEnhancedNotification({
              id: `task_${task.id}_${Date.now()}`,
              userId: event.userId,
              memoId: '',
              type: 'reminder',
              title: `⏰ Task: ${task.title}`,
              body: task.description || 'Time to work on this task',
              scheduledFor: new Date(task.dueDate).toISOString(),
              sent: false,
              createdAt: new Date().toISOString(),
              actionData: {
                actionId: task.id,
                canComplete: true,
                canSnooze: true,
              },
              soundName: task.priority === 'high' ? 'urgent' : 'default',
            });
          }
        }
      } catch (error) {
        console.error('Error creating event task:', error);
      }
    }

    // Move event to preparation phase
    event.phase = 'preparation';
    event.updatedAt = new Date().toISOString();

    console.log(`✅ Created ${createdTasks.length} tasks for event:`, event.title);
    return createdTasks;
  }

  /**
   * Schedule all follow-ups for an event
   */
  async scheduleEventFollowUps(event: ManagedEvent): Promise<void> {
    const eventDate = new Date(event.eventDate);

    for (const followUp of event.followUps) {
      try {
        const notificationDate = this.calculateFollowUpDate(eventDate, followUp.when);

        await NotificationService.scheduleEnhancedNotification({
          id: `followup_${event.id}_${Date.now()}_${Math.random()}`,
          userId: event.userId,
          memoId: '',
          type: 'reminder',
          title: followUp.title,
          body: followUp.message,
          scheduledFor: notificationDate.toISOString(),
          sent: false,
          createdAt: new Date().toISOString(),
          actionData: {
            canSnooze: true,
          },
        });
      } catch (error) {
        console.error('Error scheduling follow-up:', error);
      }
    }

    console.log(`✅ Scheduled ${event.followUps.length} follow-ups for:`, event.title);
  }

  /**
   * Update event phase based on current date
   */
  updateEventPhase(event: ManagedEvent): EventPhase {
    const now = new Date();
    const eventDate = new Date(event.eventDate);
    const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilEvent < 0) {
      // Event has passed
      return 'completed';
    } else if (daysUntilEvent === 0) {
      // Event is today
      return 'execution';
    } else if (event.tasks.length > 0) {
      // Tasks created, in preparation
      return 'preparation';
    } else {
      // Still planning
      return 'planning';
    }
  }

  /**
   * Generate event day message
   */
  generateEventDayMessage(event: ManagedEvent): string {
    let message = `🎉 Today's the day for ${event.title}!\n\n`;

    if (event.eventTime) {
      message += `⏰ Time: ${event.eventTime}\n`;
    }

    if (event.location) {
      message += `📍 Location: ${event.location}\n`;
    }

    if (event.attendees && event.attendees.length > 0) {
      message += `👥 Attendees: ${event.attendees.length} people\n`;
    }

    message += `\n✨ Here's your checklist:\n`;

    if (event.tasks.length > 0) {
      message += `• ${event.tasks.length} tasks tracked\n`;
    }

    message += `\nI'll be here if you need anything. Have a great event! 🚀`;

    return message;
  }

  /**
   * Generate post-event feedback prompt
   */
  generatePostEventMessage(event: ManagedEvent): string {
    return `💭 Hope ${event.title} went well!\n\n` +
      `Quick follow-up:\n` +
      `• How did everything go?\n` +
      `• Any feedback to capture?\n` +
      `• New action items from the event?\n\n` +
      `I can help you create tasks from your feedback!`;
  }

  /**
   * Get all active events for a user
   */
  async getUserEvents(userId: string): Promise<ManagedEvent[]> {
    // This would typically query a database
    // For now, returning empty array - implement storage later
    return [];
  }

  /**
   * Get upcoming event (next one chronologically)
   */
  async getUpcomingEvent(userId: string): Promise<ManagedEvent | null> {
    const events = await this.getUserEvents(userId);
    const now = new Date();

    const upcomingEvents = events
      .filter(e => new Date(e.eventDate) >= now)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

    return upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  }

  // Helper methods

  /**
   * Parse relative or absolute due dates
   */
  private parseDueDate(dueDate?: string, eventDate?: string): string {
    if (!dueDate) {
      return new Date().toISOString();
    }

    // Relative dates like "in 2 days", "1 week before"
    const relativeMatch = dueDate.match(/in (\d+) (day|week|month)s?/i);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      const date = new Date();

      if (unit === 'day') {
        date.setDate(date.getDate() + amount);
      } else if (unit === 'week') {
        date.setDate(date.getDate() + amount * 7);
      } else if (unit === 'month') {
        date.setMonth(date.getMonth() + amount);
      }

      return date.toISOString();
    }

    // "X days before event"
    const beforeMatch = dueDate.match(/(\d+) (day|week)s? before/i);
    if (beforeMatch && eventDate) {
      const amount = parseInt(beforeMatch[1]);
      const unit = beforeMatch[2].toLowerCase();
      const date = new Date(eventDate);

      if (unit === 'day') {
        date.setDate(date.getDate() - amount);
      } else if (unit === 'week') {
        date.setDate(date.getDate() - amount * 7);
      }

      return date.toISOString();
    }

    // Try parsing as direct date
    try {
      return new Date(dueDate).toISOString();
    } catch {
      // Default to tomorrow if can't parse
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString();
    }
  }

  /**
   * Calculate follow-up date from relative time
   */
  private calculateFollowUpDate(eventDate: Date, when: string): Date {
    const date = new Date(eventDate);

    if (when.includes('day before')) {
      const days = parseInt(when) || 1;
      date.setDate(date.getDate() - days);
      date.setHours(9, 0, 0, 0); // 9 AM
    } else if (when === 'on the day') {
      date.setHours(7, 0, 0, 0); // 7 AM on event day
    } else if (when.includes('day after')) {
      const days = parseInt(when) || 1;
      date.setDate(date.getDate() + days);
      date.setHours(10, 0, 0, 0); // 10 AM
    }

    return date;
  }
}

export default new EventManagementService();
