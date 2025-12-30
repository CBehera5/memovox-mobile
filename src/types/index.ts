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
  linkedActions?: string[]; // IDs of created actions
  isCompleted?: boolean;
  completedAt?: string;
  shared_with?: { user_id: string; name: string; shared_at: string }[];
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
  tone?: string;
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
  type: 'reminder' | 'followup' | 'insight' | 'system';
  title: string;
  body: string;
  scheduledFor: string;
  sent: boolean;
  createdAt: string;
  // Enhanced features
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // e.g., every 2 days
    daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    endDate?: string;
  };
  soundName?: string; // Custom notification sound
  actionData?: {
    actionId?: string; // Related AgentAction ID
    canComplete?: boolean; // Show "Mark Complete" button
    canSnooze?: boolean; // Show "Snooze" button
  };
  snoozedCount?: number; // Track how many times snoozed
  originalScheduledFor?: string; // Original time before snoozes
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

// Agent Action Types
export interface AgentAction {
  id: string;
  userId: string;
  type: 'reminder' | 'calendar_event' | 'task';
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  createdFrom: string; // memo ID
  createdAt: string;
  completedAt?: string;
  linkedMemoId?: string;
  // Enhanced features
  recurring?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    daysOfWeek?: number[];
    endDate?: string;
  };
  notificationSound?: string;
  snoozeCount?: number;
  shared_with?: { user_id: string; name: string; shared_at: string }[];
}

export interface AgentSuggestion {
  action: AgentAction;
  reason: string;
  confidence: number; // 0-1
}

export interface CompletionStats {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  weeklyCompletion: number;
  monthlyCompletion: number;
}

export interface SmartTask {
  memo: VoiceMemo;
  reason: string;
  priority: number;
  suggestedAction?: string;
}