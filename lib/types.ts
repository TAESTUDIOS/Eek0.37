/**
 * lib/types.ts
 * Core TypeScript interfaces for PSA.
 */

export type Role = "user" | "assistant" | "system" | "ritual";

export type EmotionTone = "positive" | "neutral" | "negative";

export type EmotionId =
  | "amazed"
  | "happy"
  | "joyful"
  | "frustrated"
  | "angry"
  | "furious"
  | "playful"
  | "sleepy";

export interface EmotionLog {
  id: string;
  emotionId: EmotionId;
  emotionTone: EmotionTone;
  recordedAt: number; // epoch ms
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: number; // epoch ms
  ritualId?: string;
  buttons?: string[]; // optional inline buttons for ritual messages
  metadata?: Record<string, unknown>;
  emotionId?: EmotionId;
  emotionTone?: EmotionTone;
  saved?: boolean; // persisted saved-state in Neon
  botId?: string; // ID of the bot that sent this message
  botName?: string; // Name of the bot (cached for display)
  botAvatar?: string; // Avatar of the bot (cached for display)
}

export type TriggerType = "schedule" | "chat";

export interface RitualTrigger {
  type: TriggerType;
  time?: string; // HH:mm (for schedule)
  repeat?: "daily" | "weekly" | "monthly" | "none";
  chatKeyword?: string; // e.g., "/check"
}

export interface RitualConfig {
  id: string;
  name: string;
  webhook: string; // n8n webhook URL
  trigger: RitualTrigger;
  buttons?: string[];
  active?: boolean;
}

export interface SavedMessage {
  id: string;
  text: string;
  createdAt: number;
  tags?: string[];
}

export type Tone = "Gentle" | "Strict" | "Playful" | "Neutral";

export type Theme = "light" | "dark";

// UI density preferences
export type Density = "comfortable" | "compact" | "ultra";

// Server-stored singleton settings
export interface Settings {
  tone: Tone;
  fallbackWebhook: string;
  theme: Theme;
  notificationsWebhook?: string;
  // Sleeping hours configuration for schedule grid
  hideSleepingHours: boolean;
  sleepStartHour: number; // 0-23
  sleepEndHour: number; // 0-23
  // UI density (preferred)
  density?: Density;
  // Back-compat: previous boolean compact flag (may be present from older schema)
  compactMode?: boolean;
  // Auto refresh settings
  autoRefreshEnabled?: boolean;
  autoRefreshIntervalSec?: number;
  // Preferred display name for the single user
  name?: string;
  // Freeform user context for personalization
  profileNotes?: string;
  // Assistant identity
  assistantName?: string;
  assistantPersonality?: string;
}

// Appointment items for day scheduling
export interface Appointment {
  id: string;
  title: string;
  // ISO date for the day, e.g., "2025-09-16"
  date: string;
  // Start time in HH:mm (24h)
  start: string;
  // Duration in minutes
  durationMin: number;
  notes?: string;
  // Reminder flags
  remind1h?: boolean;
  remind30m?: boolean;
  remind10m?: boolean;
  remindAtStart?: boolean;
}

// Urgent todo items (client-side managed)
export type UrgentPriority = "high" | "medium" | "low";

export interface UrgentTodo {
  id: string;
  title: string;
  priority: UrgentPriority;
  done: boolean;
  dueAt?: number; // epoch ms
  notes?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

// Simple tasks for "Today's Tasks" section
export interface TodayTask {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
}

// Notes and folder hierarchy
export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null; // null = root level
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null = root level
  createdAt: number;
  updatedAt: number;
}

// Schedule template for pre-configured task sets
export interface TemplateTask {
  title: string;
  start: string; // HH:mm format
  durationMin: number;
  notes?: string;
  remind1h?: boolean;
  remind30m?: boolean;
  remind10m?: boolean;
  remindAtStart?: boolean;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description?: string;
  tasks: TemplateTask[];
  createdAt: number;
  updatedAt: number;
}

// Bot profile for specialized assistants
export interface BotProfile {
  id: string;
  name: string;
  avatar?: string; // URL or emoji
  description: string;
  webhook: string; // n8n webhook for this bot
  expertise?: string; // What this bot specializes in
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

// Medications management
// Repeat options include every other day to support user need
export type MedicationRepeat =
  | "daily"
  | "every_other_day"
  | "weekly"
  | "monthly";

export interface MedicationConfig {
  id: string;
  name: string; // e.g., "Sertraline 50mg"
  webhook: string; // n8n webhook to call when a reminder is due
  times: string[]; // one or more HH:mm entries per day (24h)
  repeat: MedicationRepeat; // daily | every_other_day | weekly | monthly
  // Optional scheduling refinements
  daysOfWeek?: number[]; // 0=Sun..6=Sat (for weekly)
  dayOfMonth?: number; // 1..31 (for monthly)
  startDateIso?: string; // ISO date baseline for every-other-day cadence
  active?: boolean;
  // Optional display card presets
  emojiPath?: string; // public path to emoji icon (e.g., "/images/emojis/happy.png")
  cardText?: string; // message to show in chat when injected via /api/inject-ritual
  buttons?: string[]; // default buttons on the reminder card
}
