// src/services/ChatService.ts

import { Platform } from 'react-native';
import StorageService from './StorageService';
import AIService from './AIService';
import LanguageService from './LanguageService';
import PersonalCompanionService from './PersonalCompanionService';

import { GROQ_API_KEY } from '../config/env';

// Conditionally import expo-speech only on native platforms
let Speech: any = null;
if (Platform.OS !== 'web') {
  try {
    Speech = require('expo-speech');
  } catch (error) {
    console.warn('expo-speech not available on this platform');
  }
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioUri?: string; // For voice messages
  timestamp: string;
  memoId?: string; // Link to voice memo if created from memo
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  contextMemoId?: string; // Link to a specific memo for context-aware chat
  contextTaskId?: string; // Link to a specific task for context-aware chat
  chatMode?: 'general' | 'task-focused' | 'planning'; // Chat mode for different behaviors
}

class ChatService {
  private currentSession: ChatSession | null = null;
  private apiKey: string = GROQ_API_KEY;
  private apiEndpoint: string = 'https://api.groq.com/openai/v1/chat/completions';

  constructor() {
    if (__DEV__) {
      console.log('=== ChatService Initialized ===');
      console.log('🔑 API Key status:', GROQ_API_KEY ? `Present (${GROQ_API_KEY.substring(0, 15)}...)` : '❌ MISSING');
    }
    
    if (!this.apiKey) {
      console.error('❌ CRITICAL: GROQ API KEY IS MISSING!');
      console.error('   Please check your .env.local file');
      console.error('   Make sure EXPO_PUBLIC_GROQ_API_KEY is set');
      console.error('   You may need to restart with: npx expo start --clear');
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(
    userId: string, 
    title: string = 'New Chat',
    options?: {
      contextMemoId?: string;
      contextTaskId?: string;
      chatMode?: 'general' | 'task-focused' | 'planning';
    }
  ): Promise<ChatSession> {
    const session: ChatSession = {
      id: `chat_${userId}_${Date.now()}`,
      userId,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      contextMemoId: options?.contextMemoId,
      contextTaskId: options?.contextTaskId,
      chatMode: options?.chatMode || 'general',
    };

    try {
      await StorageService.saveChatSession(session);
      this.currentSession = session;
      console.log('Chat session created:', session.id);
      return session;
    } catch (error) {
      console.error('Error creating chat session:', error);
      throw error;
    }
  }

  /**
   * Load an existing chat session
   */
  async loadSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const session = await StorageService.getChatSession(sessionId);
      this.currentSession = session || null;
      return session;
    } catch (error) {
      console.error('Error loading chat session:', error);
      return null;
    }
  }

  /**
   * Send a user message and get AI response
   */
  async sendMessage(
    userMessage: string,
    userAudioUri?: string
  ): Promise<{ userMessage: ChatMessage; aiResponse: ChatMessage }> {
    console.log('=== SendMessage Called ===');
    console.log('Current session exists:', !!this.currentSession);
    console.log('API key exists:', !!this.apiKey);
    
    if (!this.currentSession) {
      console.error('❌ No active chat session');
      throw new Error('No active chat session');
    }

    if (!this.apiKey) {
      console.error('❌ API key is missing');
      console.error('   This usually means the app needs to be restarted');
      console.error('   Try: npx expo start --clear');
      throw new Error('AI service not configured. Please restart the app.');
    }

    try {
      // Create user message
      const userMsg: ChatMessage = {
        id: `msg_${this.currentSession.id}_${Date.now()}`,
        role: 'user',
        content: userMessage,
        audioUri: userAudioUri,
        timestamp: new Date().toISOString(),
      };

      // Build conversation history for context
      const conversationHistory = this.currentSession.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      // Get language-aware system prompt
      const baseSystemPrompt = LanguageService.getSystemPrompt();
      
      // Enhanced system prompt with scope restrictions and persona
      const personaContext = await PersonalCompanionService.getPersonaContext(this.currentSession.userId);

      const enhancedSystemPrompt = `${baseSystemPrompt}
${personaContext}

IMPORTANT RULES:
1. You are JEETU, a warm and personal AI companion who excels at Event Management and Group Coordination.
2. Adapt your tone based on the USER PERSONA provided above (e.g. be concise if they prefer efficiency).
3. Your goal is to be a supportive partner in planning. Propose concrete plans while maintaining a friendly, personal tone.
4. Always respond in ${LanguageService.getLanguageConfig().name} language.
5. When a group or task is involved, suggest responsibilities clearly but kindly.
6. If the user mentions other people (e.g., "with John and Sarah"), include them in the plan naturally.
7. Proactively start the conversation with a proposed agenda or next steps, acting as a helpful friend who is good at organizing.
8. Be concise but conversational. Use bullet points for tasks.
9. If asked about unrelated topics, politely decline and steer back to planning with a personal touch.
10. Suggest times, locations, and details if missing, guiding the user rather than just interrogating them.`;

      // Add system message at the beginning
      const messagesWithSystem = [
        {
          role: 'system' as const,
          content: enhancedSystemPrompt,
        },
        ...conversationHistory,
      ];

      // Add current user message
      messagesWithSystem.push({
        role: 'user' as const,
        content: userMessage,
      });

      console.log('Sending message to Groq API:', userMessage.substring(0, 50) + '...');

      // Make direct fetch call to Groq API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          temperature: 0.7,
          messages: messagesWithSystem, // Use enhanced messages with system prompt
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error:', response.status, errorData);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data.choices[0].message.content || 'I apologize, I could not generate a response.';
      console.log('AI Response received successfully');

      // Create AI message
      const aiMsg: ChatMessage = {
        id: `msg_${this.currentSession.id}_${Date.now() + 1}`,
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toISOString(),
      };

      // Add messages to session
      this.currentSession.messages.push(userMsg);
      this.currentSession.messages.push(aiMsg);
      this.currentSession.updatedAt = new Date().toISOString();

      // Save session
      await StorageService.saveChatSession(this.currentSession);

      return {
        userMessage: userMsg,
        aiResponse: aiMsg,
      };
    } catch (error: any) {
      console.error('Error sending message:', error);
      console.error('Error details:', error.message || error);
      throw new Error(error.message || 'Failed to get AI response. Please check your internet connection.');
    }
  }

  /**
   * Generate an AI response without a session (Stateless)
   * Used for Group Mode where context is managed externally
   */
  async generateResponse(
    messages: ChatMessage[],
    userMessage: string
  ): Promise<string> {
    if (!this.apiKey) throw new Error('AI service not configured');

    const conversationHistory = messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const baseSystemPrompt = LanguageService.getSystemPrompt();
    const advancedPrompt = `${baseSystemPrompt}
    
    CONTEXT: You are participating in a GROUP CHAT.
    - Be concise and helpful.
    - Address the group collectively if appropriate.
    - Focus on the planning objective.
    `;

    const messagesWithSystem = [
      { role: 'system', content: advancedPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          temperature: 0.7,
          messages: messagesWithSystem,
        }),
      });

      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();
      return data.choices[0].message.content || 'I could not generate a response.';
    } catch (error) {
      console.error('Error generating stateless response:', error);
      return 'Sorry, I am having trouble connecting right now.';
    }
  }

  /**
   * Get all chat sessions for user
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    try {
      return await StorageService.getUserChatSessions(userId);
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await StorageService.deleteChatSession(sessionId);
      if (this.currentSession?.id === sessionId) {
        this.currentSession = null;
      }
      console.log('Chat session deleted:', sessionId);
    } catch (error) {
      console.error('Error deleting chat session:', error);
      throw error;
    }
  }

  /**
   * Update session title
   */
  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    try {
      if (this.currentSession?.id === sessionId) {
        this.currentSession.title = title;
        this.currentSession.updatedAt = new Date().toISOString();
        await StorageService.saveChatSession(this.currentSession);
      } else {
        const session = await StorageService.getChatSession(sessionId);
        if (session) {
          session.title = title;
          session.updatedAt = new Date().toISOString();
          await StorageService.saveChatSession(session);
        }
      }
    } catch (error) {
      console.error('Error updating session title:', error);
      throw error;
    }
  }

  /**
   * Get current session messages
   */
  getCurrentMessages(): ChatMessage[] {
    return this.currentSession?.messages || [];
  }

  /**
   * Get current session
   */
  getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    this.currentSession = null;
  }

  /**
   * Generate a warm, context-aware greeting for task-specific chat
   * This creates a personalized introduction when user clicks "Insight" on a task
   */
  async generateTaskContextGreeting(taskContext: {
    title: string;
    transcription?: string;
    category?: string;
    type?: string;
    dueDate?: string;
    aiAnalysis?: any;
  }): Promise<string> {
    const language = LanguageService.getLanguageConfig().name;
    
    // Build context-aware greeting
    let greeting = '';
    
    // Warm opening
    if (language === 'English') {
      greeting = `Hello! I'm here to help you with this task. `;
    } else if (language === 'Hindi') {
      greeting = `नमस्ते! मैं इस कार्य में आपकी मदद के लिए यहां हूं। `;
    } else if (language === 'Tamil') {
      greeting = `வணக்கம்! இந்த பணியில் உங்களுக்கு உதவ நான் இங்கு இருக்கிறேன். `;
    } else {
      greeting = `Hello! I'm here to help you with this task. `;
    }
    
    // Add task context
    greeting += `\n\n📋 **${taskContext.title}**\n\n`;
    
    // Add brief summary if available
    if (taskContext.aiAnalysis?.summary) {
      greeting += `${taskContext.aiAnalysis.summary}\n\n`;
    } else if (taskContext.transcription) {
      greeting += `Based on your note: "${taskContext.transcription.substring(0, 100)}..."\n\n`;
    }
    
    // Add proactive suggestion
    greeting += `💡 **Here's what I can help with:**\n`;
    
    if (taskContext.type === 'event' || taskContext.type === 'reminder') {
      greeting += `- Set up reminders or calendar events\n`;
      greeting += `- Break down into smaller steps\n`;
      greeting += `- Suggest optimal timing\n`;
    } else {
      greeting += `- Plan your approach\n`;
      greeting += `- Create actionable steps\n`;
      greeting += `- Answer any questions\n`;
    }
    
    greeting += `\nWhat would you like to know or discuss about this?`;
    
    return greeting;
  }

  /**
   * Generate proactive questions based on conversation context
   * This helps gather more information for better planning
   */
  async generateProactiveQuestions(context: {
    userMessage: string;
    conversationHistory: ChatMessage[];
    taskContext?: any;
  }): Promise<string[]> {
    const questions: string[] = [];
    const language = LanguageService.getCurrentLanguage();
    
    // Analyze what information might be missing
    const messageContent = context.userMessage.toLowerCase();
    
    // Time-related questions
    if (!messageContent.match(/\b(time|hour|minute|am|pm|o'clock)\b/)) {
      questions.push(
        language === 'en' ? "What time works best for you?" :
        language === 'hi' ? "आपके लिए कौन सा समय सबसे अच्छा है?" :
        "What time works best for you?"
      );
    }
    
    // Date-related questions
    if (messageContent.match(/\b(tomorrow|later|soon)\b/) && !messageContent.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)) {
      questions.push(
        language === 'en' ? "Which specific day are you thinking?" :
        language === 'hi' ? "आप कौन सा विशेष दिन सोच रहे हैं?" :
        "Which specific day are you thinking?"
      );
    }
    
    // Location questions for events
    if (messageContent.match(/\b(meeting|appointment|visit)\b/) && !messageContent.match(/\b(at|in|location|place)\b/)) {
      questions.push(
        language === 'en' ? "Where will this take place?" :
        language === 'hi' ? "यह कहाँ होगा?" :
        "Where will this take place?"
      );
    }
    
    // Priority/urgency questions
    if (messageContent.match(/\b(task|work|project)\b/) && !messageContent.match(/\b(urgent|important|priority|asap)\b/)) {
      questions.push(
        language === 'en' ? "How urgent is this - high, medium, or low priority?" :
        language === 'hi' ? "यह कितना जरूरी है - उच्च, मध्यम या कम प्राथमिकता?" :
        "How urgent is this - high, medium, or low priority?"
      );
    }
    
    return questions.slice(0, 2); // Return max 2 questions to avoid overwhelming
  }

  /**
   * Check if a user message is asking about irrelevant topics
   * Returns true if the question is off-topic
   */
  isIrrelevantQuestion(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Topics we should not answer
    const irrelevantPatterns = [
      /what is memovox/i,
      /how does memovox work/i,
      /weather/i,
      /news/i,
      /joke/i,
      /story/i,
      /recipe/i,
      /what are you/i,
      /are you (an? )?(ai|robot|bot|llm|language model)/i,
      /who created you/i,
      /who made you/i,
      /sports|football|cricket|game score/i,
      /stock market|bitcoin|cryptocurrency/i,
    ];
    
    return irrelevantPatterns.some(pattern => pattern.test(lowerMessage));
  }

  /**
   * Transcribe audio to text (for voice chat input)
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    try {
      return await AIService.transcribeAudio(audioUri);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw error;
    }
  }

  /**
   * Generate speech from text (for voice AI responses)
   * Uses native device TTS with calm male/female voice
   * Falls back gracefully on web and platforms without TTS support
   */
  async generateSpeech(text: string, voice: 'male' | 'female' = 'male'): Promise<void> {
    try {
      // Check if Speech module is available (not on web)
      if (!Speech || !Speech.speak) {
        console.warn('Text-to-speech is not available on this platform');
        return;
      }

      const voiceOptions = {
        pitch: voice === 'male' ? 0.9 : 1.1,
        rate: 0.85, // Calm, slower speech
        language: 'en-US',
      };
      
      console.log(`Speaking text with ${voice} voice:`, text);
      
      await Speech.speak(text, voiceOptions as any);
    } catch (error) {
      console.error('Error generating speech:', error);
      // Don't throw - gracefully handle platforms without TTS
    }
  }

  /**
   * Stop any ongoing speech
   * Safely handles platforms without TTS support
   */
  async stopSpeech(): Promise<void> {
    try {
      if (!Speech || !Speech.stop) {
        console.warn('Text-to-speech is not available on this platform');
        return;
      }
      await Speech.stop();
    } catch (error) {
      console.error('Error stopping speech:', error);
      // Don't throw - gracefully handle errors
    }
  }

  /**
   * Generate a short, meaningful title for the chat session based on content
   */
  async generateSessionTitle(messages: ChatMessage[]): Promise<string> {
     if (messages.length < 2) return 'New Chat';
     
     const conversationText = messages.slice(0, 4).map(m => `${m.role}: ${m.content}`).join('\n');
     
     try {
         const response = await fetch(this.apiEndpoint, {
             method: 'POST',
             headers: {
                 'Authorization': `Bearer ${this.apiKey}`,
                 'Content-Type': 'application/json',
             },
             body: JSON.stringify({
                 model: 'llama-3.3-70b-versatile',
                 max_tokens: 15, // Keep it very short
                 temperature: 0.5,
                 messages: [
                     {
                         role: 'system',
                         content: `Summarize the following conversation into a very short title (max 4-5 words). 
Examples: "Trip to Goa", "Health Plan", "Birthday Ideas". 
Do not use quotes. Return ONLY the title.`
                     },
                     {
                         role: 'user',
                         content: conversationText
                     }
                 ]
             }),
         });

         if (!response.ok) return 'New Chat';
         
         const data = await response.json();
         const title = data.choices[0]?.message?.content?.trim() || 'New Chat';
         // Remove any quotes if model added them
         return title.replace(/^"|"$/g, '').trim();
     } catch (error) {
         console.warn('Error generating title:', error);
         return 'New Chat';
     }
  }
}

export default new ChatService();
