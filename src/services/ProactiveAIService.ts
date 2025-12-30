// src/services/ProactiveAIService.ts

import { ChatMessage } from './ChatService';
import LanguageService from './LanguageService';
import { GROQ_API_KEY } from '../config/env';

export interface MissingInfo {
  field: string;
  question: string;
  importance: 'high' | 'medium' | 'low';
}

export interface ActionItem {
  title: string;
  type: 'task' | 'reminder' | 'event';
  description?: string;
  assignedTo?: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface FollowUp {
  title: string;
  when: string; // relative time like "1 day before", "on the day"
  message: string;
}

/**
 * Proactive AI Service
 * Makes JEETU intelligent and proactive by:
 * - Analyzing conversations for missing information
 * - Generating relevant clarifying questions
 * - Detecting when to create tasks automatically
 * - Extracting actionable items from discussions
 * - Scheduling smart follow-ups
 */
class ProactiveAIService {
  private apiKey: string = GROQ_API_KEY;
  private apiEndpoint: string = 'https://api.groq.com/openai/v1/chat/completions';

  /**
   * Analyze conversation context to identify missing information
   */
  analyzeContext(conversation: ChatMessage[], eventType?: string): MissingInfo[] {
    const missingInfo: MissingInfo[] = [];
    const conversationText = conversation.map(m => m.content).join(' ').toLowerCase();

    // Time-related information
    if (!this.hasTimeInfo(conversationText)) {
      missingInfo.push({
        field: 'time',
        question: LanguageService.getCurrentLanguage() === 'en'
          ? '⏰ What time works best for you?'
          : '⏰ आपके लिए कौन सा समय सबसे अच्छा है?',
        importance: 'high',
      });
    }

    // Date-related information
    if (!this.hasSpecificDate(conversationText)) {
      missingInfo.push({
        field: 'date',
        question: LanguageService.getCurrentLanguage() === 'en'
          ? '📅 Which specific date are you thinking?'
          : '📅 आप कौन सी विशेष तारीख सोच रहे हैं?',
        importance: 'high',
      });
    }

    // Location for events/meetings
    if (this.isLocationRelevant(conversationText, eventType) && !this.hasLocation(conversationText)) {
      missingInfo.push({
        field: 'location',
        question: LanguageService.getCurrentLanguage() === 'en'
          ? '📍 Where should this take place?'
          : '📍 यह कहां होना चाहिए?',
        importance: 'high',
      });
    }

    // People/attendees for events
    if (this.isGroupEvent(conversationText) && !this.hasAttendeeCount(conversationText)) {
      missingInfo.push({
        field: 'attendees',
        question: LanguageService.getCurrentLanguage() === 'en'
          ? '👥 How many people will be involved?'
          : '👥 कितने लोग शामिल होंगे?',
        importance: 'medium',
      });
    }

    // Duration
    if (!this.hasDuration(conversationText)) {
      missingInfo.push({
        field: 'duration',
        question: LanguageService.getCurrentLanguage() === 'en'
          ? '⏱️ How long do you expect this to take?'
          : '⏱️ आप उम्मीद करते हैं कि इसमें कितना समय लगेगा?',
        importance: 'medium',
      });
    }

    // Purpose/goal for complex events
    if (this.isComplexEvent(conversationText) && !this.hasPurpose(conversationText)) {
      missingInfo.push({
        field: 'purpose',
        question: LanguageService.getCurrentLanguage() === 'en'
          ? '🎯 What\'s the main goal or purpose?'
          : '🎯 मुख्य लक्ष्य या उद्देश्य क्या है?',
        importance: 'low',
      });
    }

    return missingInfo;
  }

  /**
   * Generate relevant questions based on missing information
   */
  generateQuestions(missingInfo: MissingInfo[]): string[] {
    // Sort by importance
    const sortedInfo = [...missingInfo].sort((a, b) => {
      const importanceOrder = { high: 0, medium: 1, low: 2 };
      return importanceOrder[a.importance] - importanceOrder[b.importance];
    });

    // Return top 3-4 most important questions
    return sortedInfo.slice(0, 4).map(info => info.question);
  }

  /**
   * Determine if conversation has enough information to create tasks
   */
  shouldCreateTasks(conversation: ChatMessage[]): boolean {
    const conversationText = conversation.map(m => m.content).join(' ').toLowerCase();
    
    // Must have at least some action-oriented language
    const hasActionWords = /\b(need to|should|must|have to|let's|plan to|going to)\b/.test(conversationText);
    
    // Must have some specifics (date or time mentioned)
    const hasSpecifics = this.hasTimeInfo(conversationText) || this.hasSpecificDate(conversationText);
    
    // User should have confirmed or agreed
    const hasConfirmation = /\b(yes|okay|sure|correct|right|go ahead|create|do it|sounds good)\b/.test(conversationText);
    
    return hasActionWords && hasSpecifics && hasConfirmation;
  }

  /**
   * Extract actionable items from conversation using AI
   */
  async extractActionItems(conversation: ChatMessage[], context?: any): Promise<ActionItem[]> {
    try {
      const conversationText = conversation
        .map(msg => `${msg.role === 'user' ? 'User' : 'JEETU'}: ${msg.content}`)
        .join('\n');

      const systemPrompt = `You are an expert at extracting actionable tasks from conversations. 
Analyze the conversation and extract specific, actionable tasks.

Rules:
1. Each task must be specific and clear
2. Include reasonable due dates based on context
3. Assign priorities (high/medium/low) based on urgency
4. Provide reasoning for why each task is important
5. Return ONLY valid JSON, no markdown formatting
6. If user mentions specific people, include them in assignedTo

Return format:
{
  "tasks": [
    {
      "title": "Clear task title",
      "type": "task|reminder|event",
      "description": "Brief description",
      "assignedTo": "Person name if mentioned",
      "dueDate": "YYYY-MM-DD or relative like 'in 2 days'",
      "priority": "high|medium|low",
      "reasoning": "Why this task matters"
    }
  ]
}`;

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 2048,
          temperature: 0.3, // Lower temperature for more consistent extraction
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Conversation:\n\n${conversationText}\n\nExtract actionable tasks as JSON.` },
          ],
        }),
      });

      if (!response.ok) {
        console.error('Error extracting action items:', response.status);
        return [];
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Clean up the response - remove markdown code blocks if present
      const jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const result = JSON.parse(jsonContent);
      return result.tasks || [];
    } catch (error) {
      console.error('Error extracting action items:', error);
      return [];
    }
  }

  /**
   * Generate smart follow-ups for an event
   */
  scheduleSmartFollowUps(event: {
    title: string;
    date: string;
    type: string;
    tasks?: ActionItem[];
  }): FollowUp[] {
    const followUps: FollowUp[] = [];
    const eventDate = new Date(event.date);
    const now = new Date();
    const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // One week before (if event is more than a week away)
    if (daysUntilEvent > 7) {
      followUps.push({
        title: `${event.title} - 1 Week Reminder`,
        when: '7 days before',
        message: `🔔 Just a heads up - ${event.title} is coming up in one week. Are preparations on track?`,
      });
    }

    // Two days before
    if (daysUntilEvent > 2) {
      followUps.push({
        title: `${event.title} - 2 Day Reminder`,
        when: '2 days before',
        message: `⏰ ${event.title} is in 2 days! Here's a quick checklist:\n${this.generateChecklistFromTasks(event.tasks)}`,
      });
    }

    // Day before
    if (daysUntilEvent > 1) {
      followUps.push({
        title: `${event.title} - Tomorrow`,
        when: '1 day before',
        message: `📅 Tomorrow is ${event.title}! Final check - is everything ready?`,
      });
    }

    // Morning of event
    followUps.push({
      title: `${event.title} - Today`,
      when: 'on the day',
      message: `🎉 Today's the day for ${event.title}! Good luck, you've got this!`,
    });

    // Day after for feedback
    followUps.push({
      title: `${event.title} - Follow-up`,
      when: '1 day after',
      message: `💭 Hope ${event.title} went well! Want to capture any notes or action items from it?`,
    });

    return followUps;
  }

  /**
   * Generate a context-aware greeting based on entry mode
   */
  async generateContextGreeting(
    mode: 'insight' | 'plan',
    context?: {
      taskTitle?: string;
      taskDescription?: string;
      memoContent?: string;
      dueDate?: string;
    }
  ): Promise<string> {
    const language = LanguageService.getCurrentLanguage();
    
    if (mode === 'insight' && context) {
      // Context-aware greeting for task insights
      let greeting = language === 'en'
        ? `Hello! I'm JEETU, your AI companion. I can see you want to discuss:`
        : `नमस्ते! मैं JEETU हूं, आपका AI साथी। मैं देख सकता हूं कि आप चर्चा करना चाहते हैं:`;
      
      greeting += `\n\n📋 **${context.taskTitle}**\n`;
      
      if (context.taskDescription) {
        greeting += `\n${context.taskDescription.substring(0, 200)}${context.taskDescription.length > 200 ? '...' : ''}\n`;
      }
      
      if (context.dueDate) {
        greeting += `\n📅 Due: ${new Date(context.dueDate).toLocaleDateString()}\n`;
      }
      
      greeting += language === 'en'
        ? `\n💡 I can help you:\n• Break this down into steps\n• Set up reminders\n• Answer questions\n• Create action items\n\nWhat would you like to know?`
        : `\n💡 मैं आपकी मदद कर सकता हूं:\n• इसे चरणों में विभाजित करें\n• रिमाइंडर सेट करें\n• सवालों के जवाब दें\n• कार्य आइटम बनाएं\n\nआप क्या जानना चाहेंगे?`;
      
      return greeting;
    } else {
      // General greeting for planning mode
      const greeting = language === 'en'
        ? `Hello! I'm JEETU 🤖

I'm here to help you organize your thoughts and plans - whether it's daily tasks or big events!

✨ **We can work on:**
• Plan events and meetings
• Create detailed task lists  
• Set up reminders and follow-ups
• Coordinate group activities
• Manage entire projects

💬 **Just tell me** what you'd like to plan, or ask me anything. I can work with voice or text!

What are we planning today?`
        : `नमस्ते! मैं JEETU हूं, आपका AI योजना साथी 🤖

मैं आपको कुछ भी योजना बनाने में मदद करने के लिए यहां हूं!

✨ **मैं क्या कर सकता हूं:**
• कार्यक्रम और बैठकें योजना बनाएं
• विस्तृत कार्य सूची बनाएं
• रिमाइंडर सेट करें
• समूह गतिविधियों का समन्वय करें
• संपूर्ण परियोजनाओं का प्रबंधन करें

💬 **बस मुझे बताएं** कि आप क्या योजना बनाना चाहते हैं!

आज हम क्या योजना बना रहे हैं?`;
      
      return greeting;
    }
  }

  // Helper methods

  private hasTimeInfo(text: string): boolean {
    return /\b(\d{1,2}:\d{2}|am|pm|o'clock|morning|afternoon|evening|night)\b/i.test(text);
  }

  private hasSpecificDate(text: string): boolean {
    return /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/i.test(text);
  }

  private hasLocation(text: string): boolean {
    return /\b(at|in|on|location|place|venue|address|office|home|restaurant|cafe|park)\b/i.test(text);
  }

  private isLocationRelevant(text: string, eventType?: string): boolean {
    const locationKeywords = /\b(meeting|appointment|visit|event|party|gathering|conference)\b/i;
    return locationKeywords.test(text) || eventType === 'event';
  }

  private hasAttendeeCount(text: string): boolean {
    return /\b(\d+\s*(people|person|attendee|guest|participant)|team|group)\b/i.test(text);
  }

  private isGroupEvent(text: string): boolean {
    return /\b(team|group|everyone|all|meeting|conference|party|gathering)\b/i.test(text);
  }

  private hasDuration(text: string): boolean {
    return /\b(\d+\s*(hour|minute|day|week|month)|all day|half day|quick|brief|long)\b/i.test(text);
  }

  private isComplexEvent(text: string): boolean {
    return /\b(project|event|conference|workshop|training|offsite|retreat)\b/i.test(text);
  }

  private hasPurpose(text: string): boolean {
    return /\b(for|to|goal|purpose|objective|aim|because|reason)\b/i.test(text);
  }

  private generateChecklistFromTasks(tasks?: ActionItem[]): string {
    if (!tasks || tasks.length === 0) {
      return '• Final preparations\n• Confirm attendance';
    }
    
    return tasks
      .slice(0, 5) // Max 5 items in checklist
      .map(task => `• ${task.title}`)
      .join('\n');
  }
}

export default new ProactiveAIService();
