// src/services/ChatService.ts

import { Groq } from 'groq-sdk';
import { Platform } from 'react-native';
import StorageService from './StorageService';
import AIService from './AIService';

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
}

class ChatService {
  private groqClient: Groq | null = null;
  private currentSession: ChatSession | null = null;
  private apiKey: string = '***REMOVED***';

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
        console.log('Chat service Groq client initialized');
      } catch (error) {
        console.error('Error initializing chat Groq client:', error);
        this.groqClient = null;
      }
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(userId: string, title: string = 'New Chat'): Promise<ChatSession> {
    const session: ChatSession = {
      id: `chat_${userId}_${Date.now()}`,
      userId,
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    if (!this.currentSession) {
      throw new Error('No active chat session');
    }

    if (!this.groqClient) {
      throw new Error('Groq client not initialized');
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

      // Add current user message
      conversationHistory.push({
        role: 'user' as const,
        content: userMessage,
      });

      console.log('Sending message to Groq API:', userMessage);

      // Get AI response
      const response = await this.groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.7,
        messages: conversationHistory as any,
      });

      const aiContent = response.choices[0].message.content || '';
      console.log('AI Response:', aiContent);

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
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
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
}

export default new ChatService();
