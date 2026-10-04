/** Domain types, ported as-is from the RN app (constants/types.ts). */

export interface Habit {
  id: string
  /** i18n key for standard habits (e.g. "habits.alcohol") */
  key?: string
  /** Display name for custom habits, empty string for standard */
  name: string
  date: string | null
  savings: string | null
}

export type Theme = 'system' | 'light' | 'dark'

export interface AppSettings {
  theme: Theme
  language: string
  currency: string
  /** Local milestone celebration notifications (opt-in). */
  milestoneNotificationsEnabled: boolean
  /** Whether the post-wizard opt-in prompt has been shown at least once. */
  milestoneNotificationsPrompted: boolean
}

export type MilestoneUnit = 'day' | 'week' | 'month' | 'year'

export interface Milestone {
  id: string
  habitId: string
  unit: MilestoneUnit
  amount: number
  reachedAt: string | null
  notificationId: string | null
}

/** Occasional one-time lapse. Logged with a date; does not restart a streak. */
export interface Slip {
  id: string
  habitId: string
  /** ISO instant of the slip (the UI captures a date only). */
  date: string
}
