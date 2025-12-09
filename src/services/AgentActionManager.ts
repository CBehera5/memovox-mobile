// src/services/AgentActionManager.ts

/**
 * AgentActionManager
 * Manages AI-generated action items and pushes them to the UI
 * Handles reminders, tasks, and action tracking for the home and notes pages
 */

import { Groq } from 'groq-sdk';
import StorageService from './StorageService';
import ActionService, { ActionRequest, ActionResult } from './ActionService';
import LanguageService from './LanguageService';

export interface ActionItem {
  id: string;
  type: 'reminder' | 'alarm' | 'notification' | 'calendar' | 'task';
  title: string;
  description: string;
  dueTime: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  createdBy: 'chat' | 'voice' | 'manual';
  memoId?: string; // If action was created from a specific memo
  memoTitle?: string;
  result?: ActionResult;
}

export interface ActionStats {
  totalActions: number;
  pendingActions: number;
  completedActions: number;
  highPriorityCount: number;
}

class AgentActionManager {
  private groqClient: Groq | null = null;
  private apiKey: string = '***REMOVED***';
  private actionListeners: Set<(actions: ActionItem[]) => void> = new Set();

  constructor() {
    this.initializeGroq();
  }

  private initializeGroq(): void {
    if (this.apiKey) {
      try {
        this.groqClient = new Groq({
          apiKey: this.apiKey,
          dangerouslyAllowBrowser: true,
        });
        console.log('AgentActionManager Groq client initialized');
      } catch (error) {
        console.error('Error initializing AgentActionManager Groq client:', error);
      }
    }
  }

  /**
   * Process user message and extract multiple actions
   * Returns all actions found in the message
   */
  async processMessageForActions(
    userMessage: string,
    context?: { memoId?: string; memoTitle?: string; userId?: string }
  ): Promise<ActionItem[]> {
    try {
      console.log('Processing message for actions:', userMessage);

      const actionKeywords = [
        'remind',
        'alarm',
        'notification',
        'schedule',
        'create',
        'set',
        'task',
        'event',
        'meeting',
        'call',
        'email',
        'follow up',
      ];

      const hasActionKeyword = actionKeywords.some((keyword) =>
        userMessage.toLowerCase().includes(keyword)
      );

      if (!hasActionKeyword) {
        console.log('No action keywords found');
        return [];
      }

      // Use AI to extract multiple action requests from the message
      const actions = await this.extractActionsFromMessage(userMessage);

      // Process each action
      const createdActions: ActionItem[] = [];
      for (const actionReq of actions) {
        try {
          // Execute the action
          const result = await ActionService.executeAction(actionReq);

          if (result.success) {
            // Create action item to track it
            const actionItem: ActionItem = {
              id: result.actionId || `action_${Date.now()}`,
              type: actionReq.type!,
              title: actionReq.title,
              description: actionReq.description,
              dueTime: actionReq.dueTime || new Date(),
              priority: actionReq.priority || 'medium',
              status: 'pending',
              createdAt: new Date().toISOString(),
              createdBy: 'chat',
              memoId: context?.memoId,
              memoTitle: context?.memoTitle,
              result,
            };

            // Save action item
            await this.saveActionItem(actionItem);

            // Push to action tracking
            createdActions.push(actionItem);

            console.log('Action created and tracked:', actionItem);
          }
        } catch (error) {
          console.error('Error processing individual action:', error);
        }
      }

      // Notify listeners (UI components)
      if (createdActions.length > 0) {
        await this.notifyListeners();
      }

      return createdActions;
    } catch (error) {
      console.error('Error processing message for actions:', error);
      return [];
    }
  }

  /**
   * Extract multiple action requests from a user message using AI
   */
  private async extractActionsFromMessage(userMessage: string): Promise<ActionRequest[]> {
    if (!this.groqClient) {
      console.warn('Groq client not initialized');
      return [];
    }

    try {
      const systemPrompt = `You are an action extractor that finds ALL action requests in a user message.
Extract multiple actions if present. For each action, determine:
1. Action type: 'reminder', 'alarm', 'notification', 'calendar', 'task'
2. Title: What needs to be done
3. Description: Details about the action
4. Due time: When it should happen (natural language)
5. Priority: 'high', 'medium', or 'low'

Return a JSON array of actions found. If no actions, return empty array [].

Example:
"Remind me to call John tomorrow at 3pm and send an email to Sarah by Friday"
Returns:
[
  {"type": "reminder", "title": "Call John", "dueTime": "tomorrow at 3pm", "priority": "high"},
  {"type": "reminder", "title": "Send email to Sarah", "dueTime": "by Friday", "priority": "medium"}
]`;

      const response = await this.groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 512,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Extract all action requests from this message:\n"${userMessage}"\n\nReturn ONLY a valid JSON array, no other text.`,
          },
        ],
      });

      const content = response.choices[0].message.content || '[]';
      console.log('AI extracted actions:', content);

      try {
        const parsedActions = JSON.parse(content);
        
        if (!Array.isArray(parsedActions)) {
          return [];
        }

        // Convert to ActionRequest objects
        const actionRequests: ActionRequest[] = parsedActions.map((action) => ({
          type: action.type || null,
          title: action.title || '',
          description: action.description || action.title || '',
          dueTime: action.dueTime ? ActionService['parseTimeString'](action.dueTime) : undefined,
          priority: action.priority || 'medium',
          originalUserMessage: userMessage,
        }));

        return actionRequests;
      } catch (parseError) {
        console.warn('Could not parse extracted actions as JSON:', content);
        return [];
      }
    } catch (error) {
      console.error('Error extracting actions from message:', error);
      return [];
    }
  }

  /**
   * Save action item to storage
   */
  private async saveActionItem(actionItem: ActionItem): Promise<void> {
    try {
      const actions = await StorageService.getActionItems?.() || [];
      actions.push(actionItem);
      await StorageService.saveActionItems?.(actions);
      console.log('Action item saved:', actionItem.id);
    } catch (error) {
      console.error('Error saving action item:', error);
    }
  }

  /**
   * Get all action items
   */
  async getAllActionItems(): Promise<ActionItem[]> {
    try {
      return (await StorageService.getActionItems?.()) || [];
    } catch (error) {
      console.error('Error getting action items:', error);
      return [];
    }
  }

  /**
   * Get pending action items (for home page)
   */
  async getPendingActionItems(): Promise<ActionItem[]> {
    try {
      const actions = await this.getAllActionItems();
      return actions.filter((a) => a.status === 'pending').sort((a, b) => {
        // Sort by priority and due time
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.dueTime).getTime() - new Date(b.dueTime).getTime();
      });
    } catch (error) {
      console.error('Error getting pending action items:', error);
      return [];
    }
  }

  /**
   * Get action items for a specific memo
   */
  async getActionItemsForMemo(memoId: string): Promise<ActionItem[]> {
    try {
      const actions = await this.getAllActionItems();
      return actions.filter((a) => a.memoId === memoId);
    } catch (error) {
      console.error('Error getting action items for memo:', error);
      return [];
    }
  }

  /**
   * Mark action as completed
   */
  async completeAction(actionId: string): Promise<void> {
    try {
      const actions = await this.getAllActionItems();
      const action = actions.find((a) => a.id === actionId);
      if (action) {
        action.status = 'completed';
        await StorageService.saveActionItems?.(actions);
        await this.notifyListeners();
        console.log('Action marked as completed:', actionId);
      }
    } catch (error) {
      console.error('Error completing action:', error);
    }
  }

  /**
   * Cancel action
   */
  async cancelAction(actionId: string): Promise<void> {
    try {
      const actions = await this.getAllActionItems();
      const action = actions.find((a) => a.id === actionId);
      if (action) {
        action.status = 'cancelled';
        await StorageService.saveActionItems?.(actions);
        await this.notifyListeners();
        console.log('Action cancelled:', actionId);
      }
    } catch (error) {
      console.error('Error cancelling action:', error);
    }
  }

  /**
   * Delete action
   */
  async deleteAction(actionId: string): Promise<void> {
    try {
      const actions = await this.getAllActionItems();
      const filtered = actions.filter((a) => a.id !== actionId);
      await StorageService.saveActionItems?.(filtered);
      await this.notifyListeners();
      console.log('Action deleted:', actionId);
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  }

  /**
   * Get action statistics for dashboard
   */
  async getActionStats(): Promise<ActionStats> {
    try {
      const actions = await this.getAllActionItems();
      return {
        totalActions: actions.length,
        pendingActions: actions.filter((a) => a.status === 'pending').length,
        completedActions: actions.filter((a) => a.status === 'completed').length,
        highPriorityCount: actions.filter(
          (a) => a.status === 'pending' && a.priority === 'high'
        ).length,
      };
    } catch (error) {
      console.error('Error getting action stats:', error);
      return { totalActions: 0, pendingActions: 0, completedActions: 0, highPriorityCount: 0 };
    }
  }

  /**
   * Subscribe to action updates
   */
  subscribeToActions(listener: (actions: ActionItem[]) => void): () => void {
    this.actionListeners.add(listener);
    return () => this.actionListeners.delete(listener);
  }

  /**
   * Notify all listeners of action updates
   */
  private async notifyListeners(): Promise<void> {
    try {
      const actions = await this.getAllActionItems();
      this.actionListeners.forEach((listener) => listener(actions));
    } catch (error) {
      console.error('Error notifying listeners:', error);
    }
  }
}

export default new AgentActionManager();
