// src/constants/index.ts

import { MemoCategory } from '../types';

export const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#ec4899',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  dark: '#1f2937',
  light: '#f3f4f6',
  white: '#ffffff',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
};

export const GRADIENTS = {
  primary: ['#6366f1', '#8b5cf6'],
  secondary: ['#8b5cf6', '#ec4899'],
  success: ['#10b981', '#059669'],
  warm: ['#f59e0b', '#ec4899'],
  cool: ['#06b6d4', '#6366f1'],
};

export const CATEGORY_COLORS: Record<MemoCategory, string> = {
  Personal: '#ec4899',
  Work: '#6366f1',
  Ideas: '#8b5cf6',
  Shopping: '#10b981',
  Health: '#ef4444',
  Learning: '#f59e0b',
  Travel: '#06b6d4',
  Finance: '#059669',
  Hobbies: '#a855f7',
  Notes: '#6b7280',
};

export const CATEGORY_ICONS: Record<MemoCategory, string> = {
  Personal: '👤',
  Work: '💼',
  Ideas: '💡',
  Shopping: '🛒',
  Health: '❤️',
  Learning: '📚',
  Travel: '✈️',
  Finance: '💰',
  Hobbies: '🎨',
  Notes: '📝',
};

export const TYPE_BADGES = {
  event: { label: 'Event', color: '#6366f1', icon: '📅' },
  reminder: { label: 'Reminder', color: '#f59e0b', icon: '⏰' },
  note: { label: 'Note', color: '#6b7280', icon: '📝' },
};

export const EXAMPLE_PROMPTS = [
  "Call dentist tomorrow at 4pm",
  "Buy milk and eggs",
  "I think we should redesign the homepage",
  "Book flight to Paris next month",
  "Remember to workout at 6am",
  "Meeting with John on Friday at 2pm",
];

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@memovox_auth_token',
  USER_DATA: '@memovox_user_data',
  VOICE_MEMOS: '@memovox_voice_memos',
  USER_PERSONA: '@memovox_user_persona',
  NOTIFICATIONS: '@memovox_notifications',
  AI_CONFIG: '@memovox_ai_config',
};

export const AI_MODELS = {
  anthropic: {
    default: 'claude-sonnet-4-20250514',
    fast: 'claude-haiku-4-20250514',
  },
  openai: {
    default: 'gpt-4-turbo-preview',
    fast: 'gpt-3.5-turbo',
  },
};

export const MAX_RECORDING_DURATION = 600; // 10 minutes in seconds
export const MIN_RECORDING_DURATION = 1; // 1 second