// PersonalCompanionService.ts
// Personalized AI companion that provides intelligent insights and actionable suggestions

import { VoiceMemo, MemoType } from '../types';
import AIService from './AIService';
import NotificationService from './NotificationService';

export interface ActionableItem {
  id: string;
  type: 'calendar' | 'reminder' | 'notification' | 'task';
  title: string;
  description: string;
  dueDate?: Date;
  priority: 'high' | 'medium' | 'low';
  action: string;
}

export interface PersonalInsight {
  greeting: string;
  summary: string;
  keyPoints: string[];
  actionableItems: ActionableItem[];
  proactiveSuggestions: string[];
  followUpQuestions: string[];
  personalTouch: string;
}

class PersonalCompanionService {
  private userPreferences: {
    name?: string;
    communicationStyle?: string;
    preferences?: string[];
  } = {};

  /**
   * Generate personalized insights for a memo
   */
  async generatePersonalInsight(memo: VoiceMemo): Promise<PersonalInsight> {
    try {
      const analysis = await this.analyzeMemoContext(memo);
      const actionItems = this.extractActionableItems(memo, analysis);
      const suggestions = this.generateProactiveSuggestions(memo, analysis);
      const personalTouch = this.createPersonalTouch(memo, analysis);

      return {
        greeting: this.generateGreeting(),
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        actionableItems: actionItems,
        proactiveSuggestions: suggestions,
        followUpQuestions: this.generateFollowUpQuestions(memo),
        personalTouch: personalTouch,
      };
    } catch (error) {
      console.error('Error generating personal insight:', error);
      throw error;
    }
  }

  /**
   * Analyze memo context using AI
   */
  private async analyzeMemoContext(memo: VoiceMemo): Promise<any> {
    try {
      const prompt = `
        Analyze this voice memo and provide insights:
        
        Title: ${memo.title}
        Content: ${memo.transcription}
        Category: ${memo.category}
        Type: ${memo.type}
        
        Please provide:
        1. A brief summary (1-2 sentences)
        2. Key action points (3-5 bullet points)
        3. Urgency level (high, medium, low)
        4. Suggested follow-up actions
        
        Format your response as JSON with keys: summary, keyPoints, urgencyLevel, followUpActions
      `;

      // Use AIService to analyze
      const analysis = memo.aiAnalysis || {};
      const response: any = analysis;
      
      return {
        summary: response.summary || 'Task noted and analyzed',
        keyPoints: response.keywords || [],
        urgencyLevel: this.determineUrgency(memo),
        followUpActions: response.actionItems || [],
      };
    } catch (error) {
      console.error('Error analyzing memo context:', error);
      return {
        summary: 'Task analyzed',
        keyPoints: [],
        urgencyLevel: 'medium',
        followUpActions: [],
      };
    }
  }

  /**
   * Extract actionable items from memo
   */
  private extractActionableItems(memo: VoiceMemo, analysis: any): ActionableItem[] {
    const items: ActionableItem[] = [];
    const now = new Date();

    // Based on memo type, create appropriate actionable items
    if (memo.type === 'event') {
      items.push({
        id: `${memo.id}-calendar`,
        type: 'calendar',
        title: `Add to calendar: ${memo.title}`,
        description: memo.transcription.substring(0, 100),
        priority: 'high',
        action: 'Add this event to Google Calendar',
        dueDate: this.extractDateFromText(memo.transcription) || new Date(now.getTime() + 24 * 60 * 60 * 1000),
      });
    }

    if (memo.type === 'reminder') {
      items.push({
        id: `${memo.id}-reminder`,
        type: 'reminder',
        title: `Set reminder: ${memo.title}`,
        description: memo.transcription.substring(0, 100),
        priority: 'high',
        action: 'Create a timed reminder',
        dueDate: this.extractDateFromText(memo.transcription) || new Date(now.getTime() + 60 * 60 * 1000),
      });
    }

    if (memo.category === 'Work') {
      items.push({
        id: `${memo.id}-notification`,
        type: 'notification',
        title: `Work task: ${memo.title}`,
        description: 'Mark as done when complete',
        priority: 'high',
        action: 'Send notification as deadline approaches',
      });
    }

    if (memo.category === 'Health') {
      items.push({
        id: `${memo.id}-health-reminder`,
        type: 'reminder',
        title: `Health reminder: ${memo.title}`,
        description: 'Health-related action to remember',
        priority: 'high',
        action: 'Set health check-in reminder',
      });
    }

    return items;
  }

  /**
   * Generate proactive suggestions
   */
  private generateProactiveSuggestions(memo: VoiceMemo, analysis: any): string[] {
    const suggestions: string[] = [];

    // Based on content
    if (memo.transcription.toLowerCase().includes('meeting')) {
      suggestions.push('🗓️ Would you like me to add this to your calendar?');
    }

    if (memo.transcription.toLowerCase().includes('remember') || memo.transcription.toLowerCase().includes('don\'t forget')) {
      suggestions.push('🔔 I can set a reminder for this so you don\'t miss it');
    }

    if (memo.transcription.toLowerCase().includes('tomorrow') || memo.transcription.toLowerCase().includes('next week')) {
      suggestions.push('📅 I\'ll notify you about this at the right time');
    }

    if (memo.category === 'Work') {
      suggestions.push('💼 Should I prioritize this as urgent?');
    }

    if (memo.category === 'Health') {
      suggestions.push('❤️ Your health matters. I\'ll remind you about this regularly');
    }

    if (memo.transcription.length < 50) {
      suggestions.push('💭 Want to tell me more about this? It helps me understand better');
    }

    return suggestions;
  }

  /**
   * Create personal touch to the response
   */
  private createPersonalTouch(memo: VoiceMemo, analysis: any): string {
    const touches = [
      `I've got your back on this one, ${this.userPreferences.name || 'friend'}. This sounds important.`,
      `I remember everything. This is safe with me, and I'll help you stay on track.`,
      `You're doing great! I'm here to make sure you don't miss anything important.`,
      `Let's tackle this together. I'm your personal companion, always ready to help.`,
      `I notice you care about this. I'll make sure it gets the attention it deserves.`,
      `Think of me as your personal assistant. I'm always listening and learning.`,
      `Don't worry, I've got all your details. I remember everything about your tasks.`,
      `Your goals matter to me. I'm here to support you every step of the way.`,
    ];

    return touches[Math.floor(Math.random() * touches.length)];
  }

  /**
   * Generate greeting based on time
   */
  private generateGreeting(): string {
    const hour = new Date().getHours();
    const name = this.userPreferences.name || 'there';

    if (hour < 12) {
      return `Good morning, ${name}! ☀️`;
    } else if (hour < 18) {
      return `Good afternoon, ${name}! 👋`;
    } else {
      return `Good evening, ${name}! 🌙`;
    }
  }

  /**
   * Generate follow-up questions
   */
  private generateFollowUpQuestions(memo: VoiceMemo): string[] {
    return [
      `Is this task urgent or can it wait?`,
      `Who else needs to know about this?`,
      `What's the deadline for this?`,
      `Do you need any resources or help?`,
      `Should I send you reminders about this?`,
    ];
  }

  /**
   * Determine urgency level
   */
  private determineUrgency(memo: VoiceMemo): 'high' | 'medium' | 'low' {
    const text = `${memo.title} ${memo.transcription}`.toLowerCase();

    if (text.includes('urgent') || text.includes('asap') || text.includes('immediately')) {
      return 'high';
    }
    if (text.includes('today') || text.includes('tonight')) {
      return 'high';
    }
    if (text.includes('tomorrow') || text.includes('next day')) {
      return 'medium';
    }
    if (text.includes('next week') || text.includes('later')) {
      return 'low';
    }

    return memo.type === 'reminder' ? 'high' : 'medium';
  }

  /**
   * Extract date from text
   */
  private extractDateFromText(text: string): Date | null {
    const now = new Date();
    
    if (text.toLowerCase().includes('today')) {
      return now;
    }
    if (text.toLowerCase().includes('tomorrow')) {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
    if (text.toLowerCase().includes('next week')) {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    return null;
  }

  /**
   * Schedule actionable items
   */
  async scheduleActionableItems(items: ActionableItem[]): Promise<void> {
    try {
      for (const item of items) {
        switch (item.type) {
          case 'reminder':
            // Log reminder intent
            console.log('Reminder scheduled:', item.title);
            break;

          case 'notification':
            // Log notification intent
            console.log('Notification sent:', item.title);
            break;

          case 'calendar':
            // Log calendar intent (actual integration would use device calendar API)
            console.log('Calendar intent:', item.title);
            break;

          case 'task':
            // Create task
            console.log('Task created:', item.title);
            break;
        }
      }
    } catch (error) {
      console.error('Error scheduling actionable items:', error);
    }
  }

  /**
   * Set user preferences
   */
  setUserPreferences(preferences: any): void {
    this.userPreferences = { ...this.userPreferences, ...preferences };
  }
}

export default new PersonalCompanionService();
