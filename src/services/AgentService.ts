// src/services/AgentService.ts

import { AgentAction, AgentSuggestion, VoiceMemo, CompletionStats } from '../types';
import StorageService from './StorageService';
import AIService from './AIService';
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '../config/env';

class AgentService {
  private groqClient: Groq | null = null;
  private readonly ACTIONS_KEY = 'memovox_agent_actions';

  constructor() {
    // Initialize Groq client with API key
    try {
      this.groqClient = new Groq({
        apiKey: GROQ_API_KEY,
        dangerouslyAllowBrowser: true,
      });
    } catch (error) {
      console.error('Error initializing Groq client in AgentService:', error);
    }
  }

  /**
   * Parse relative date strings like "today", "tomorrow" into Date objects
   */
  private parseActionDate(dateString: string): Date | null {
    if (!dateString) return null;
    
    const dateLower = dateString.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateLower === 'today') {
      return today;
    } else if (dateLower === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    } else if (dateLower === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    } else {
      // Try parsing as ISO date or other standard format
      try {
        const parsed = new Date(dateString);
        // Check if valid date
        if (isNaN(parsed.getTime())) {
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    }
  }

  /**
   * Analyze memo and suggest actions using AI
   */
  async suggestActions(memo: VoiceMemo): Promise<AgentSuggestion[]> {
    try {
      if (!this.groqClient) {
        console.warn('Groq client not available, returning empty suggestions');
        return [];
      }

      const prompt = `Analyze this voice memo and suggest concrete actions the user should take.

Memo Details:
- Title: ${memo.title}
- Transcription: ${memo.transcription}
- Category: ${memo.category}
- Type: ${memo.type}
- Existing Action Items: ${memo.aiAnalysis?.actionItems?.join(', ') || 'None'}
- Date/Time: ${memo.metadata?.eventDate || 'Not specified'} ${memo.metadata?.eventTime || ''}

Based on this memo, suggest 1-3 actionable tasks. Return ONLY valid JSON array:
[
  {
    "type": "reminder|calendar_event|task",
    "title": "Clear, actionable title",
    "description": "Brief description",
    "dueDate": "YYYY-MM-DD format if date mentioned, else empty",
    "dueTime": "HH:MM format if time mentioned, else empty",
    "priority": "low|medium|high",
    "reason": "Why this action is suggested",
    "confidence": 0.0-1.0
  }
]

Rules:
- Only suggest actions that make sense from the memo
- If memo mentions a date/time, use calendar_event
- If memo says "remind me", use reminder
- Otherwise use task
- Set priority based on urgency keywords
- Confidence based on how clear the action is
- Return empty array [] if no clear actions

Return ONLY valid JSON array, no additional text.`;

      const response = await this.groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.4,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = response.choices[0].message.content || '[]';
      console.log('Agent suggestions response:', responseText);

      // Parse JSON response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in response');
        return [];
      }

      const suggestions = JSON.parse(jsonMatch[0]);
      
      // Convert to AgentSuggestion format
      return suggestions.map((sug: any, index: number) => ({
        action: {
          id: `action-${Date.now()}-${index}`,
          userId: memo.userId,
          type: sug.type || 'task',
          title: sug.title,
          description: sug.description,
          dueDate: sug.dueDate || undefined,
          dueTime: sug.dueTime || undefined,
          priority: sug.priority || 'medium',
          status: 'pending',
          createdFrom: memo.id,
          createdAt: new Date().toISOString(),
          linkedMemoId: memo.id,
        },
        reason: sug.reason,
        confidence: sug.confidence || 0.7,
      }));
    } catch (error) {
      console.error('Error generating action suggestions:', error);
      return [];
    }
  }

  /**
   * Create an action with user permission
   */
  async createAction(action: AgentAction, userId: string): Promise<AgentAction> {
    try {
      const actions = await this.getUserActions(userId);
      
      const newAction: AgentAction = {
        ...action,
        id: action.id || `action-${Date.now()}`,
        userId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      actions.push(newAction);
      await this.saveActions(userId, actions);

      console.log('Action created:', newAction);
      return newAction;
    } catch (error) {
      console.error('Error creating action:', error);
      throw error;
    }
  }

  /**
   * Get all actions for a user
   */
  async getUserActions(userId: string): Promise<AgentAction[]> {
    try {
      const key = `${this.ACTIONS_KEY}_${userId}`;
      const data = await StorageService.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting user actions:', error);
      return [];
    }
  }

  /**
   * Save actions to storage
   */
  private async saveActions(userId: string, actions: AgentAction[]): Promise<void> {
    try {
      const key = `${this.ACTIONS_KEY}_${userId}`;
      await StorageService.setItem(key, JSON.stringify(actions));
    } catch (error) {
      console.error('Error saving actions:', error);
      throw error;
    }
  }

  /**
   * Complete an action
   */
  async completeAction(actionId: string, userId: string): Promise<AgentAction> {
    try {
      const actions = await this.getUserActions(userId);
      const action = actions.find(a => a.id === actionId);
      
      if (!action) {
        throw new Error(`Action not found: ${actionId}`);
      }
      
      action.status = 'completed';
      action.completedAt = new Date().toISOString();
      await this.saveActions(userId, actions);
      console.log('Action completed:', actionId);
      
      return action;
    } catch (error) {
      console.error('Error completing action:', error);
      throw error;
    }
  }

  /**
   * Cancel an action
   */
  async cancelAction(actionId: string, userId: string): Promise<void> {
    try {
      const actions = await this.getUserActions(userId);
      const action = actions.find(a => a.id === actionId);
      
      if (action) {
        action.status = 'cancelled';
        await this.saveActions(userId, actions);
        console.log('Action cancelled:', actionId);
      }
    } catch (error) {
      console.error('Error cancelling action:', error);
      throw error;
    }
  }

  /**
   * Get today's actions
   */
  async getTodayActions(userId: string): Promise<AgentAction[]> {
    try {
      const actions = await this.getUserActions(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      return actions.filter(action => {
        if (action.status !== 'pending') return false;
        if (!action.dueDate) return false;
        
        const actionDate = this.parseActionDate(action.dueDate);
        if (!actionDate) return false;
        
        const actionDateStr = actionDate.toISOString().split('T')[0];
        return actionDateStr === todayStr;
      });
    } catch (error) {
      console.error('Error getting today actions:', error);
      return [];
    }
  }

  /**
   * Get pending actions (not completed, not cancelled)
   */
  async getPendingActions(userId: string): Promise<AgentAction[]> {
    try {
      const actions = await this.getUserActions(userId);
      return actions.filter(action => action.status === 'pending');
    } catch (error) {
      console.error('Error getting pending actions:', error);
      return [];
    }
  }

  /**
   * Get overdue actions
   */
  async getOverdueActions(userId: string): Promise<AgentAction[]> {
    try {
      const actions = await this.getUserActions(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      return actions.filter(action => {
        if (action.status !== 'pending') return false;
        if (!action.dueDate) return false;
        
        const actionDate = this.parseActionDate(action.dueDate);
        if (!actionDate) return false;
        
        const actionDateStr = actionDate.toISOString().split('T')[0];
        return actionDateStr < todayStr;
      });
    } catch (error) {
      console.error('Error getting overdue actions:', error);
      return [];
    }
  }

  /**
   * Calculate completion statistics
   */
  async getCompletionStats(userId: string): Promise<CompletionStats> {
    try {
      const actions = await this.getUserActions(userId);
      
      const total = actions.length;
      const completed = actions.filter(a => a.status === 'completed').length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Weekly completion
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyActions = actions.filter(a => new Date(a.createdAt) > oneWeekAgo);
      const weeklyCompleted = weeklyActions.filter(a => a.status === 'completed').length;
      const weeklyCompletion = weeklyActions.length > 0 
        ? Math.round((weeklyCompleted / weeklyActions.length) * 100) 
        : 0;

      // Monthly completion
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const monthlyActions = actions.filter(a => new Date(a.createdAt) > oneMonthAgo);
      const monthlyCompleted = monthlyActions.filter(a => a.status === 'completed').length;
      const monthlyCompletion = monthlyActions.length > 0 
        ? Math.round((monthlyCompleted / monthlyActions.length) * 100) 
        : 0;

      // Determine trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (weeklyCompletion > monthlyCompletion) trend = 'up';
      else if (weeklyCompletion < monthlyCompletion) trend = 'down';

      return {
        totalTasks: total,
        completedTasks: completed,
        percentage,
        trend,
        weeklyCompletion,
        monthlyCompletion,
      };
    } catch (error) {
      console.error('Error calculating completion stats:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        percentage: 0,
        trend: 'stable',
        weeklyCompletion: 0,
        monthlyCompletion: 0,
      };
    }
  }

  /**
   * Delete an action
   */
  async deleteAction(actionId: string, userId: string): Promise<void> {
    try {
      const actions = await this.getUserActions(userId);
      const filtered = actions.filter(a => a.id !== actionId);
      await this.saveActions(userId, filtered);
      console.log('Action deleted:', actionId);
    } catch (error) {
      console.error('Error deleting action:', error);
      throw error;
    }
  }

  /**
   * Get upcoming actions (next N days)
   */
  async getUpcomingActions(userId: string, days: number = 7): Promise<AgentAction[]> {
    try {
      const actions = await this.getUserActions(userId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + days);

      return actions.filter(action => {
        if (action.status !== 'pending') return false;
        if (!action.dueDate) return false;
        
        const actionDate = this.parseActionDate(action.dueDate);
        if (!actionDate) return false;
        
        return actionDate >= today && actionDate <= futureDate;
      }).sort((a, b) => {
        const dateA = this.parseActionDate(a.dueDate!);
        const dateB = this.parseActionDate(b.dueDate!);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });
    } catch (error) {
      console.error('Error getting upcoming actions:', error);
      return [];
    }
  }

  /**
   * Get smart suggestions (old/unacted tasks that need attention)
   */
  async getSmartSuggestions(userId: string): Promise<AgentAction[]> {
    try {
      const actions = await this.getUserActions(userId);
      const today = new Date();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(today.getDate() - 3);

      // Find old pending actions (created > 3 days ago, still pending, high priority)
      const oldActions = actions.filter(action => {
        if (action.status !== 'pending') return false;
        
        const createdDate = new Date(action.createdAt);
        const isOld = createdDate < threeDaysAgo;
        const isHighPriority = action.priority === 'high' || action.priority === 'medium';
        
        // Check if overdue using safe date parsing
        let isOverdue = false;
        if (action.dueDate) {
          const actionDate = this.parseActionDate(action.dueDate);
          isOverdue = actionDate ? actionDate < today : false;
        }
        
        return (isOld && isHighPriority) || isOverdue;
      });

      // Sort by priority and age
      return oldActions.sort((a, b) => {
        // First by overdue status
        const aDate = a.dueDate ? this.parseActionDate(a.dueDate) : null;
        const bDate = b.dueDate ? this.parseActionDate(b.dueDate) : null;
        const aOverdue = aDate ? aDate < today : false;
        const bOverdue = bDate ? bDate < today : false;
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
        
        // Then by priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority || 'low'];
        const bPriority = priorityOrder[b.priority || 'low'];
        if (aPriority !== bPriority) return bPriority - aPriority;
        
        // Finally by age (older first)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    } catch (error) {
      console.error('Error getting smart suggestions:', error);
      return [];
    }
  }
}

export default new AgentService();
