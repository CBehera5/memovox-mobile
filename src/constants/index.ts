// src/constants/index.ts

import { MemoCategory } from '../types';

export const COLORS = {
  // Brand Identity (Professional Violet/Indigo)
  primary: '#6366f1', // Indigo 500 - Main Actions
  primaryDark: '#4f46e5', // Indigo 600 - Hover/Active
  secondary: '#8b5cf6', // Violet 500 - Accents
  accent: '#ec4899', // Pink 500 - Highlights
  
  // Functional Colors
  success: '#10b981', // Emerald 500
  warning: '#f59e0b', // Amber 500
  error: '#ef4444', // Red 500
  info: '#3b82f6', // Blue 500
  
  // Neutrals (Slate Scale - "The Professional Look")
  dark: '#1e293b', // Slate 800 - Main Text
  light: '#f8fafc', // Slate 50 - Backgrounds
  white: '#ffffff',
  
  // UI Specifics
  background: '#f8fafc', // Slate 50
  surface: '#ffffff',
  surfaceHighlight: '#f1f5f9', // Slate 100
  
  textPrimary: '#1e293b', // Slate 800
  textSecondary: '#64748b', // Slate 500
  textMuted: '#94a3b8', // Slate 400
  
  border: '#e2e8f0', // Slate 200
  divider: '#f1f5f9', // Slate 100
  
  // Legacy mappings for backward compatibility
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  }
};

export const GRADIENTS = {
  primary: ['#6366f1', '#8b5cf6'] as const,
  secondary: ['#8b5cf6', '#ec4899'] as const,
  success: ['#10b981', '#059669'] as const,
  warm: ['#f59e0b', '#ec4899'] as const,
  cool: ['#06b6d4', '#6366f1'] as const,
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
  task: { label: 'Task', color: '#10b981', icon: '✅' },
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
  groq: {
    default: 'llama-3.3-70b-versatile',
    vision: 'llama-3.2-11b-vision-preview',
  },
};

export const MAX_RECORDING_DURATION = 600; // 10 minutes in seconds
export const MIN_RECORDING_DURATION = 1; // 1 second

export const WEBSITE_URL = 'https://www.memovox.in';