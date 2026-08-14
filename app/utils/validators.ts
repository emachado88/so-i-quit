/**
 * Pure type guards for the persisted schema (types.ts). No Vue/Nuxt imports —
 * node-testable. Used by defensive reads and by the export/import ticket.
 */

import type { AppSettings, Habit, Milestone } from './types'

const isISODate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))

const isNullableISODate = (value: unknown): value is string | null =>
  value === null || isISODate(value)

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string'

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string'

export const isHabit = (value: unknown): value is Habit => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const habit = value as Record<string, unknown>
  return (
    typeof habit.id === 'string'
    && isOptionalString(habit.key)
    && typeof habit.name === 'string'
    && isNullableISODate(habit.date)
    && isNullableString(habit.savings)
  )
}

const MILESTONE_UNITS = ['day', 'week', 'month', 'year'] as const

export const isMilestone = (value: unknown): value is Milestone => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const milestone = value as Record<string, unknown>
  return (
    typeof milestone.id === 'string'
    && typeof milestone.habitId === 'string'
    && typeof milestone.unit === 'string'
    && (MILESTONE_UNITS as readonly string[]).includes(milestone.unit)
    && typeof milestone.amount === 'number'
    && Number.isFinite(milestone.amount)
    && milestone.amount > 0
    && isNullableISODate(milestone.reachedAt)
    && isNullableString(milestone.notificationId)
  )
}

const THEMES = ['system', 'light', 'dark'] as const

export const isAppSettings = (value: unknown): value is AppSettings => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const settings = value as Record<string, unknown>
  return (
    typeof settings.theme === 'string'
    && (THEMES as readonly string[]).includes(settings.theme)
    && typeof settings.language === 'string'
    && typeof settings.currency === 'string'
    && typeof settings.milestoneNotificationsEnabled === 'boolean'
    && typeof settings.milestoneNotificationsPrompted === 'boolean'
  )
}
