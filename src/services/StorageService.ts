/**
 * StorageService
 * Handles local data persistence using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, VoiceMemo, AIServiceConfig } from '../types';
import { ChatSession } from './ChatService';

interface MemoData {
  id: string;
  title: string;
  transcription: string;
  audioUri: string;
  createdAt: number;
  tags: string[];
}

export class StorageService {
  private readonly AUTH_TOKEN_KEY = 'memovox_auth_token';
  private readonly USER_KEY = 'memovox_user';
  private readonly VOICE_MEMOS_KEY = 'memovox_voice_memos';
  private readonly AI_CONFIG_KEY = 'memovox_ai_config';
  private readonly USER_PERSONA_KEY = 'memovox_user_persona';
  private readonly CHAT_SESSIONS_KEY = 'memovox_chat_sessions';

  async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.AUTH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing auth token:', error);
    }
  }

  async setUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting user:', error);
    }
  }

  async getUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async clearUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Error clearing user:', error);
    }
  }

  async saveMemo(memo: MemoData): Promise<void> {}
  async getMemo(id: string): Promise<MemoData | null> { return null; }
  async getAllMemos(): Promise<MemoData[]> { return []; }
  async deleteMemo(id: string): Promise<void> {}
  async searchMemos(query: string): Promise<MemoData[]> { return []; }
  async saveNotification(notification: any): Promise<void> {}
  async getNotifications(): Promise<any[]> { return []; }
  async clearNotifications(): Promise<void> {}

  async saveVoiceMemo(memo: VoiceMemo): Promise<void> {
    try {
      const VoiceMemoService = (await import('./VoiceMemoService')).default;
      await VoiceMemoService.saveMemo(memo);
    } catch (error) {
      console.error('Error saving voice memo:', error);
    }
  }

  async getVoiceMemos(): Promise<VoiceMemo[]> {
    try {
      const user = await this.getUser();
      if (!user) return [];
      const VoiceMemoService = (await import('./VoiceMemoService')).default;
      return await VoiceMemoService.getUserMemos(user.id);
    } catch (error) {
      console.error('Error getting voice memos:', error);
      return [];
    }
  }

  async getVoiceMemo(id: string): Promise<VoiceMemo | null> {
    try {
      const VoiceMemoService = (await import('./VoiceMemoService')).default;
      return await VoiceMemoService.getMemo(id);
    } catch (error) {
      console.error('Error getting voice memo:', error);
      return null;
    }
  }

  async deleteVoiceMemo(id: string): Promise<void> {
    try {
      const user = await this.getUser();
      if (!user) return;
      const VoiceMemoService = (await import('./VoiceMemoService')).default;
      await VoiceMemoService.deleteMemo(id, user.id);
    } catch (error) {
      console.error('Error deleting voice memo:', error);
    }
  }

  async updateVoiceMemo(memo: VoiceMemo): Promise<void> {
    try {
      const VoiceMemoService = (await import('./VoiceMemoService')).default;
      await VoiceMemoService.updateMemo(memo);
    } catch (error) {
      console.error('Error updating voice memo:', error);
    }
  }

  async saveAIConfig(config: AIServiceConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(this.AI_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving AI config:', error);
    }
  }

  async getAIConfig(): Promise<AIServiceConfig | null> {
    try {
      const config = await AsyncStorage.getItem(this.AI_CONFIG_KEY);
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.error('Error getting AI config:', error);
      return null;
    }
  }

  async saveUserPersona(persona: any): Promise<void> {
    try {
      await AsyncStorage.setItem(this.USER_PERSONA_KEY, JSON.stringify(persona));
    } catch (error) {
      console.error('Error saving user persona:', error);
    }
  }

  async getUserPersona(): Promise<any | null> {
    try {
      const persona = await AsyncStorage.getItem(this.USER_PERSONA_KEY);
      return persona ? JSON.parse(persona) : null;
    } catch (error) {
      console.error('Error getting user persona:', error);
      return null;
    }
  }

  async saveChatSession(session: ChatSession): Promise<void> {
    try {
      const sessions = await this.getUserChatSessions(session.userId);
      const index = sessions.findIndex((s) => s.id === session.id);
      if (index > -1) {
        sessions[index] = session;
      } else {
        sessions.push(session);
      }
      await AsyncStorage.setItem(
        `${this.CHAT_SESSIONS_KEY}_${session.userId}`,
        JSON.stringify(sessions)
      );
    } catch (error) {
      console.error('Error saving chat session:', error);
    }
  }

  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      for (const key of allKeys) {
        if (key.startsWith(this.CHAT_SESSIONS_KEY)) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const sessions = JSON.parse(data) as ChatSession[];
            const session = sessions.find((s) => s.id === sessionId);
            if (session) return session;
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting chat session:', error);
      return null;
    }
  }

  async getUserChatSessions(userId: string): Promise<ChatSession[]> {
    try {
      const data = await AsyncStorage.getItem(`${this.CHAT_SESSIONS_KEY}_${userId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting user chat sessions:', error);
      return [];
    }
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      for (const key of allKeys) {
        if (key.startsWith(this.CHAT_SESSIONS_KEY)) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            let sessions = JSON.parse(data) as ChatSession[];
            sessions = sessions.filter((s) => s.id !== sessionId);
            await AsyncStorage.setItem(key, JSON.stringify(sessions));
          }
        }
      }
    } catch (error) {
      console.error('Error deleting chat session:', error);
    }
  }

  async saveReminders(reminders: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem('memovox_reminders', JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  }

  async getReminders(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem('memovox_reminders');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting reminders:', error);
      return [];
    }
  }

  async saveAlarms(alarms: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem('memovox_alarms', JSON.stringify(alarms));
    } catch (error) {
      console.error('Error saving alarms:', error);
    }
  }

  async getAlarms(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem('memovox_alarms');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting alarms:', error);
      return [];
    }
  }

  async saveCalendarEvents(events: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem('memovox_calendar_events', JSON.stringify(events));
    } catch (error) {
      console.error('Error saving calendar events:', error);
    }
  }

  async getCalendarEvents(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem('memovox_calendar_events');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting calendar events:', error);
      return [];
    }
  }

  async saveTasks(tasks: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem('memovox_tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }

  async getTasks(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem('memovox_tasks');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  async setSavedMemos(userId: string, memoIds: string[]): Promise<void> {
    try {
      const key = `memovox_saved_memos_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(memoIds));
    } catch (error) {
      console.error('Error saving memos:', error);
    }
  }

  async getSavedMemos(userId: string): Promise<string[]> {
    try {
      const key = `memovox_saved_memos_${userId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting saved memos:', error);
      return [];
    }
  }

  async setLanguagePreference(language: string): Promise<void> {
    try {
      await AsyncStorage.setItem('memovox_language', language);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  }

  async getLanguagePreference(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('memovox_language');
    } catch (error) {
      console.error('Error getting language preference:', error);
      return null;
    }
  }

  async saveActionItems(actionItems: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem('memovox_action_items', JSON.stringify(actionItems));
    } catch (error) {
      console.error('Error saving action items:', error);
    }
  }

  async getActionItems(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem('memovox_action_items');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting action items:', error);
      return [];
    }
  }

  // Generic storage methods for any key-value pairs
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      throw error;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  }
}

export const storageService = new StorageService();
export default new StorageService();
