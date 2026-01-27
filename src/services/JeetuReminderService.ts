/**
 * JeetuReminderService
 * Handles proactive task tracking, reminders, and follow-ups for group planning
 * Makes Jeetu act as a true PA by automatically checking deadlines and nudging members
 */

import { supabase } from '../config/supabase';
import { GroupPlanningService } from './GroupPlanningService';
import ChatService from './ChatService';
import NotificationService from './NotificationService';

export interface GroupTask {
  id: string;
  session_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_by: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed';
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

interface TaskExtraction {
  title: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: Date;
  description?: string;
}

class JeetuReminderServiceClass {
  
  /**
   * Extract task details from a message using pattern matching
   * Looks for: task titles, @mentions, due dates
   */
  extractTaskFromMessage(message: string, groupMembers: { id: string; name: string }[]): TaskExtraction | null {
    const lowerMessage = message.toLowerCase();
    
    // Check if message contains task-like patterns
    const taskPatterns = [
      /(?:will|can|should|needs? to|has to|must)\s+([^.!?]+)/i,
      /(?:assign|task|todo|action item)[:\s]+([^.!?]+)/i,
      /(?:please|pls)\s+([^.!?]+)/i,
      /^([^.!?]+)\s+by\s+/i,
    ];
    
    let taskTitle: string | null = null;
    for (const pattern of taskPatterns) {
      const match = message.match(pattern);
      if (match && match[1] && match[1].length > 5 && match[1].length < 100) {
        taskTitle = match[1].trim();
        break;
      }
    }
    
    if (!taskTitle) return null;
    
    // Find assigned member (look for @mentions or names)
    let assignedTo: string | undefined;
    let assignedToName: string | undefined;
    
    // Check for @mentions
    const mentionMatch = message.match(/@(\w+)/);
    if (mentionMatch) {
      const mentionedName = mentionMatch[1].toLowerCase();
      const member = groupMembers.find(m => 
        m.name.toLowerCase().includes(mentionedName) || 
        mentionedName.includes(m.name.toLowerCase())
      );
      if (member) {
        assignedTo = member.id;
        assignedToName = member.name;
      }
    }
    
    // Check for member names in message
    if (!assignedTo) {
      for (const member of groupMembers) {
        if (lowerMessage.includes(member.name.toLowerCase())) {
          assignedTo = member.id;
          assignedToName = member.name;
          break;
        }
      }
    }
    
    // Extract due date
    let dueDate: Date | undefined;
    const datePatterns = [
      { pattern: /by\s+today/i, days: 0 },
      { pattern: /by\s+tonight/i, days: 0 },
      { pattern: /by\s+tomorrow/i, days: 1 },
      { pattern: /by\s+end\s+of\s+day/i, days: 0 },
      { pattern: /by\s+end\s+of\s+week/i, days: 7 },
      { pattern: /in\s+(\d+)\s+hours?/i, hours: true },
      { pattern: /in\s+(\d+)\s+days?/i, daysMatch: true },
      { pattern: /(\d{1,2})\s*(am|pm)/i, time: true },
    ];
    
    for (const { pattern, days, hours, daysMatch, time } of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        dueDate = new Date();
        if (days !== undefined) {
          dueDate.setDate(dueDate.getDate() + days);
          dueDate.setHours(18, 0, 0, 0); // Default to 6 PM
        } else if (hours && match[1]) {
          dueDate.setHours(dueDate.getHours() + parseInt(match[1]));
        } else if (daysMatch && match[1]) {
          dueDate.setDate(dueDate.getDate() + parseInt(match[1]));
          dueDate.setHours(18, 0, 0, 0);
        } else if (time && match[1]) {
          let hour = parseInt(match[1]);
          if (match[2]?.toLowerCase() === 'pm' && hour !== 12) hour += 12;
          if (match[2]?.toLowerCase() === 'am' && hour === 12) hour = 0;
          dueDate.setHours(hour, 0, 0, 0);
        }
        break;
      }
    }
    
    return {
      title: taskTitle,
      assignedTo,
      assignedToName,
      dueDate,
      description: message,
    };
  }
  
  /**
   * Create a task linked to a group planning session
   * Also creates a personal action in the assigned user's memovox
   */
  async createGroupTask(
    sessionId: string,
    createdBy: string,
    task: Omit<GroupTask, 'id' | 'session_id' | 'created_by' | 'created_at' | 'updated_at' | 'reminder_sent' | 'status'>
  ): Promise<GroupTask | null> {
    try {
      // 1. Create the group task first
      const { data: groupTask, error } = await supabase
        .from('group_tasks')
        .insert({
          session_id: sessionId,
          created_by: createdBy,
          title: task.title,
          description: task.description,
          assigned_to: task.assigned_to,
          assigned_to_name: task.assigned_to_name,
          due_date: task.due_date,
          status: 'pending',
          reminder_sent: false,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating group task:', error);
        return null;
      }
      
      // 2. Create a personal action in the assigned user's memovox
      if (task.assigned_to) {
        try {
          const personalAction = {
            user_id: task.assigned_to,
            type: 'task',
            title: task.title,
            description: task.description || `From group chat: ${task.title}`,
            due_date: task.due_date,
            priority: 'high', // Tasks from group chats are important
            status: 'pending',
            completed: false,
            created_from: 'group_chat',
            linked_group_task_id: groupTask.id, // Link to group task
            linked_session_id: sessionId,
          };
          
          const { data: actionData, error: actionError } = await supabase
            .from('agent_actions')
            .insert(personalAction)
            .select()
            .single();
          
          if (actionError) {
            console.error('Error creating personal action:', actionError);
            // Continue even if personal action fails - group task was created
          } else {
            console.log('✅ Personal action created for', task.assigned_to_name, actionData.id);
            
            // Update group task with personal action ID for syncing
            await supabase
              .from('group_tasks')
              .update({ personal_action_id: actionData.id })
              .eq('id', groupTask.id);
          }
        } catch (personalError) {
          console.error('Error creating personal action:', personalError);
        }
      }
      
      return groupTask;
    } catch (error) {
      console.error('Error creating group task:', error);
      return null;
    }
  }
  
  /**
   * Get all tasks for a group session
   */
  async getGroupTasks(sessionId: string): Promise<GroupTask[]> {
    try {
      const { data, error } = await supabase
        .from('group_tasks')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching group tasks:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching group tasks:', error);
      return [];
    }
  }
  
  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'completed'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('group_tasks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      
      if (error) {
        console.error('Error updating task status:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating task status:', error);
      return false;
    }
  }
  
  /**
   * Mark a task as complete from personal actions
   * This syncs the completion back to the group chat
   */
  async markTaskCompleteAndBroadcast(
    personalActionId: string,
    completedByUserId: string,
    completedByName: string
  ): Promise<boolean> {
    try {
      // 1. Find the linked group task
      const { data: groupTask, error: fetchError } = await supabase
        .from('group_tasks')
        .select('*')
        .eq('personal_action_id', personalActionId)
        .single();
      
      if (fetchError || !groupTask) {
        console.log('No linked group task found for personal action:', personalActionId);
        return false;
      }
      
      // 2. Update group task status
      const { error: updateError } = await supabase
        .from('group_tasks')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', groupTask.id);
      
      if (updateError) {
        console.error('Error updating group task:', updateError);
        return false;
      }
      
      // 3. Broadcast completion message to group chat
      const completionMessage = `🎉 **Task Completed!**\n\n@${completedByName} has completed: **${groupTask.title}**\n\nGreat job! One less thing on the list.`;
      
      await GroupPlanningService.sendMessage(
        groupTask.session_id,
        'system',
        'JEETU',
        {
          role: 'assistant',
          content: completionMessage,
          timestamp: new Date().toISOString(),
        }
      );
      
      console.log('✅ Task completion broadcast to group:', groupTask.title);
      return true;
    } catch (error) {
      console.error('Error marking task complete:', error);
      return false;
    }
  }
  
  /**
   * Subscribe to personal action completions for a user
   * When user marks their personal action as done, sync to group
   */
  subscribeToPersonalActionCompletions(userId: string, userName: string) {
    const channel = supabase
      .channel(`personal-actions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agent_actions',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const action = payload.new as any;
          
          // Check if action was just completed and is linked to a group task
          if (action.completed && action.linked_group_task_id) {
            console.log('📤 Personal action completed, syncing to group:', action.title);
            await this.markTaskCompleteAndBroadcast(action.id, userId, userName);
          }
        }
      )
      .subscribe();
    
    return channel;
  }
  
  /**
   * Get tasks that need reminders
   * - Due within 24 hours and reminder not sent
   * - Overdue tasks
   */
  async getTasksNeedingReminders(): Promise<GroupTask[]> {
    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const { data, error } = await supabase
        .from('group_tasks')
        .select('*')
        .neq('status', 'completed')
        .or(`due_date.lte.${in24Hours.toISOString()},due_date.lte.${now.toISOString()}`);
      
      if (error) {
        console.error('Error fetching reminder tasks:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching reminder tasks:', error);
      return [];
    }
  }
  
  /**
   * Generate AI confirmation message for a new task
   */
  generateTaskConfirmation(task: TaskExtraction): string {
    let message = `✅ Got it! I've noted that `;
    
    if (task.assignedToName) {
      message += `**@${task.assignedToName}** will `;
    } else {
      message += `someone needs to `;
    }
    
    message += `**${task.title}**`;
    
    if (task.dueDate) {
      const now = new Date();
      const diff = task.dueDate.getTime() - now.getTime();
      const hours = Math.round(diff / (1000 * 60 * 60));
      const days = Math.round(diff / (1000 * 60 * 60 * 24));
      
      if (hours < 24) {
        message += ` by **${task.dueDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} today**`;
      } else if (days === 1) {
        message += ` by **tomorrow**`;
      } else {
        message += ` by **${task.dueDate.toLocaleDateString()}**`;
      }
    }
    
    if (task.assignedToName) {
      message += `.\n\n📋 I've added this to **@${task.assignedToName}'s** personal tasks. I'll send a reminder before the deadline!`;
    } else {
      message += `.\n\nI'll send a reminder before the deadline 📅`;
    }
    
    return message;
  }
  
  /**
   * Generate reminder message for a task
   */
  generateReminderMessage(task: GroupTask, isOverdue: boolean): string {
    if (isOverdue) {
      return `👋 Hey team, **${task.title}**${task.assigned_to_name ? ` assigned to @${task.assigned_to_name}` : ''} was due. Any updates on this?`;
    }
    
    return `⏰ Reminder: **${task.title}**${task.assigned_to_name ? ` (@${task.assigned_to_name})` : ''} is due soon. Let me know if you need any help!`;
  }
  
  /**
   * Send reminder for a task to the group
   */
  async sendTaskReminder(task: GroupTask): Promise<void> {
    try {
      const now = new Date();
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      const isOverdue = dueDate ? dueDate < now : false;
      
      const reminderMessage = this.generateReminderMessage(task, isOverdue);
      
      // Send to group chat
      await GroupPlanningService.sendMessage(
        task.session_id,
        'system',
        'JEETU',
        {
          role: 'assistant',
          content: reminderMessage,
          timestamp: new Date().toISOString(),
        }
      );
      
      // Mark reminder as sent
      await supabase
        .from('group_tasks')
        .update({ reminder_sent: true })
        .eq('id', task.id);
      
      // Send push notification to assigned member
      if (task.assigned_to) {
        await NotificationService.createNotification({
          userId: task.assigned_to,
          title: isOverdue ? 'Task Overdue!' : 'Task Due Soon',
          message: `${task.title} ${isOverdue ? 'was due' : 'is due soon'}`,
          type: 'assignment',
          data: { sessionId: task.session_id, taskId: task.id },
        });
      }
      
      console.log('✅ Reminder sent for task:', task.title);
    } catch (error) {
      console.error('Error sending task reminder:', error);
    }
  }
  
  /**
   * Check and send all pending reminders
   * Called on app open or periodically
   */
  async checkAndSendReminders(): Promise<number> {
    try {
      const tasks = await this.getTasksNeedingReminders();
      let remindersSent = 0;
      
      for (const task of tasks) {
        if (!task.reminder_sent) {
          await this.sendTaskReminder(task);
          remindersSent++;
        }
      }
      
      console.log(`📬 Sent ${remindersSent} reminders`);
      return remindersSent;
    } catch (error) {
      console.error('Error checking reminders:', error);
      return 0;
    }
  }
  
  /**
   * Process a message and create task if detected
   * Returns confirmation message if task was created
   */
  async processMessageForTasks(
    sessionId: string,
    userId: string,
    message: string,
    groupMembers: { id: string; name: string }[]
  ): Promise<string | null> {
    const extraction = this.extractTaskFromMessage(message, groupMembers);
    
    if (!extraction) return null;
    
    // Create the task (this also creates personal action for assigned user)
    const task = await this.createGroupTask(sessionId, userId, {
      title: extraction.title,
      description: extraction.description,
      assigned_to: extraction.assignedTo,
      assigned_to_name: extraction.assignedToName,
      due_date: extraction.dueDate?.toISOString(),
    });
    
    if (!task) return null;
    
    // Generate and return confirmation message
    return this.generateTaskConfirmation(extraction);
  }
}

export const JeetuReminderService = new JeetuReminderServiceClass();
export default JeetuReminderService;
