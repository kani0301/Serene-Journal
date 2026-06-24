/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MoodType = 'excited' | 'happy' | 'peaceful' | 'tired' | 'sad' | 'stressed';

export interface MoodConfig {
  icon: string;
  label: string;
  color: string;
  bgClass: string;
}

export interface UserSettings {
  dailyReminderTime: string; // e.g., "21:00"
  defaultCategory: string; // e.g., "Personal"
  pinLocked: boolean;
  pinCode?: string;
  theme: 'lavender' | 'peach' | 'rose' | 'mint' | 'sky' | 'bold_twilight' | 'bold_sunset';
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  settings: UserSettings;
}

export interface JournalEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  title: string;
  text: string;
  mood: MoodType;
  category: string;
  isFavorite: boolean;
  tags: string[];
  draft: boolean;
  isLocked: boolean;
  passwordHint?: string;
  // AI reflection values
  aiSummary?: string;
  aiReflection?: string;
  aiInsights?: string;
  aiEncouragement?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalTemplate {
  id: string;
  name: string;
  description: string;
  placeholder: string;
}

export interface Quote {
  text: string;
  author: string;
}

export interface AnalyticsSummary {
  totalEntries: number;
  streak: number;
  frequentMood: MoodType | 'None';
  categoryDistribution: Record<string, number>;
  moodDistribution: Record<MoodType, number>;
  monthlyCounts: Record<string, number>; // e.g., "2026-06": 12
  tagsCloud: Array<{ tag: string; count: number }>;
}

export interface AIInsightsReport {
  patternAnalysis: string;
  growthInsights: string;
  suggestedPrompts: string[];
  moodEncouragement: string;
}
