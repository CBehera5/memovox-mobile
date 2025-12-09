// src/types/index.ts

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface VoiceMemo {
  id: string;
  userId: string;
  audioUri: string;
  transcription: string;
  category: MemoCategory;
  type: MemoType;
  title?: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
  aiAnalysis?: AIAnalysis;
  metadata?: MemoMetadata;
}

export type MemoCategory = 
  | 'Personal'
  | 'Work'
  | 'Ideas'
  | 'Shopping'
  | 'Health'
  | 'Learning'
  | 'Travel'
  | 'Finance'
  | 'Hobbies'
  | 'Notes';

export type MemoType = 'event' | 'reminder' | 'note';

export interface AIAnalysis {
  sentiment?: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  summary: string;
  actionItems?: string[];
  relatedMemos?: string[];
  suggestedFollowUps?: string[];
}

export interface MemoMetadata {
  eventDate?: string;
  eventTime?: string;
  reminderDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  location?: string;
}

export interface UserPersona {
  userId: string;
  interests: string[];
  communicationStyle: string;
  activeHours: { start: number; end: number };
  categoryPreferences: Partial<Record<MemoCategory, number>>;
  topKeywords: Array<{ word: string; count: number }>;
  lastUpdated: string;
}

export interface Notification {
  id: string;
  userId: string;
  memoId: string;
  type: 'reminder' | 'followup' | 'insight';
  title: string;
  body: string;
  scheduledFor: string;
  sent: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  audioUri?: string;
}

export interface AIServiceConfig {
  provider: 'anthropic' | 'openai' | 'groq' | 'mock';
  apiKey?: string;
  model?: string;
}