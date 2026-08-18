/**
 * Export / import of all user data as a single portable JSON file.
 *
 * Pure TS, no Vue/Nuxt imports — node-testable. The file format is
 * versioned (`BACKUP_VERSION`) so future schema changes can be migrated
 * on import (see the export/import ticket).
 */

import { getHabits, saveHabits } from './habits'
import {
  saveMilestonesForHabit,
} from './milestones-store'
import {
  DEFAULT_SETTINGS,
  detectLanguage,
  getSettings,
  saveSettings,
  SUPPORTED_LANGUAGES,
} from './settings'
import { CURRENCY_SYMBOLS } from './currencies'
import { readJSON, STORAGE_KEYS } from './storage'
import type { AppSettings, Habit, Milestone } from './types'
import { isAppSettings, isHabit, isMilestone } from './validators'

export const BACKUP_VERSION = 1

export interface BackupFile {
  version: number
  exportedAt: string
  habits: Habit[]
  milestones: Record<string, Milestone[]>
  settings: AppSettings
}

/**
 * Read the milestone store exactly like milestones-store does — corrupt /
 * non-object JSON is tolerated and treated as empty (RN parity).
 */
const readMilestoneStore = (): Record<string, Milestone[]> => {
  const parsed: unknown = readJSON(STORAGE_KEYS.milestones, {})
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {}
  }
  const store: Record<string, Milestone[]> = {}
  for (const [habitId, value] of Object.entries(parsed)) {
    if (!Array.isArray(value)) {
      console.warn('[backup] discarding non-array milestone entry', habitId)
      continue
    }
    store[habitId] = value.filter((m): m is Milestone => isMilestone(m))
  }
  return store
}

/** Snapshot the current habits, milestones and settings. */
export const buildBackup = (): BackupFile => ({
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  habits: getHabits(),
  milestones: readMilestoneStore(),
  settings: getSettings(),
})

const isISODateString = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))

const isMilestoneMap = (
  value: unknown,
): value is Record<string, Milestone[]> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  for (const entry of Object.values(value)) {
    if (!Array.isArray(entry) || !entry.every(isMilestone)) return false
  }
  return true
}

/**
 * Parse + validate a backup file. Never throws — on any problem returns
 * `{ ok: false, error }` so the caller can surface it without writing
 * anything to storage.
 */
export const parseBackup = (
  raw: string,
): { ok: true, data: BackupFile } | { ok: false, error: string } => {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return { ok: false, error: 'invalid-json' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'invalid-json' }
  }
  const file = parsed as Record<string, unknown>

  if (file.version !== BACKUP_VERSION) {
    return { ok: false, error: 'invalid-version' }
  }
  if (!isISODateString(file.exportedAt)) {
    return { ok: false, error: 'invalid-exported-at' }
  }
  if (!Array.isArray(file.habits) || !file.habits.every(isHabit)) {
    return { ok: false, error: 'invalid-habits' }
  }
  if (!isMilestoneMap(file.milestones)) {
    return { ok: false, error: 'invalid-milestones' }
  }
  if (!isAppSettings(file.settings)) {
    return { ok: false, error: 'invalid-settings' }
  }

  return {
    ok: true,
    data: {
      version: BACKUP_VERSION,
      exportedAt: file.exportedAt,
      habits: file.habits,
      milestones: file.milestones,
      settings: file.settings,
    },
  }
}

/** Pretty-print a backup for file export / sharing. */
export const exportToFile = (data: BackupFile): string =>
  JSON.stringify(data, null, 2)

/**
 * Drop unsafe / orphan milestone entries BEFORE they reach the store write.
 *
 * - Keys `__proto__`, `constructor`, `prototype` are prototype-pollution
 *   sinks: `store[key] = value` on a fresh `{}` sets the object's prototype.
 *   JSON.parse keeps them as own enumerable data props, so we strip them here.
 * - Entries whose habitId does not match any imported habit are orphaned
 *   (no UI can ever read them) and are dropped.
 */
const sanitizeMilestoneMap = (
  milestones: Record<string, Milestone[]>,
  habitIds: Set<string>,
): Record<string, Milestone[]> => {
  const safe = ['__proto__', 'constructor', 'prototype']
  const result: Record<string, Milestone[]> = {}
  for (const [habitId, value] of Object.entries(milestones)) {
    if (safe.includes(habitId)) continue
    if (!habitIds.has(habitId)) continue
    result[habitId] = value
  }
  return result
}

/** Fall back to defaults rather than reject the whole backup. */
const normalizeSettings = (settings: AppSettings): AppSettings => {
  const language = (SUPPORTED_LANGUAGES as readonly string[]).includes(
    settings.language,
  )
    ? settings.language
    : detectLanguage()
  const currency = Object.prototype.hasOwnProperty.call(
    CURRENCY_SYMBOLS,
    settings.currency,
  )
    ? settings.currency
    : DEFAULT_SETTINGS.currency
  return { ...settings, language, currency }
}

/** Replace habits, milestones and settings with the imported backup. */
export const importBackup = (data: BackupFile): void => {
  const habitIds = new Set(data.habits.map(h => h.id))
  saveHabits(data.habits)
  const milestones = sanitizeMilestoneMap(data.milestones, habitIds)
  for (const [habitId, value] of Object.entries(milestones)) {
    saveMilestonesForHabit(habitId, value)
  }
  saveSettings(normalizeSettings(data.settings))
}
