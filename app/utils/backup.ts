/**
 * Export / import of all user data as a single portable JSON file.
 *
 * Pure TS, no Vue/Nuxt imports — node-testable. The file format is
 * versioned (`BACKUP_VERSION`) so future schema changes can be migrated
 * on import (see the export/import ticket).
 */

import { getHabits, saveHabits } from './habits'
import {
  isMilestoneMap,
  parseMilestoneStore,
  saveMilestonesForHabit,
} from './milestones-store'
import {
  isSlipMap,
  parseSlipStore,
  saveSlipsForHabit,
} from './slips-store'
import {
  DEFAULT_SETTINGS,
  detectLanguage,
  getSettings,
  saveSettings,
  SUPPORTED_LANGUAGES,
} from './settings'
import { CURRENCY_SYMBOLS } from './currencies'
import { readJSON, STORAGE_KEYS } from './storage'
import type { AppSettings, Habit, Milestone, Slip } from './types'
import { isAppSettings, isHabit } from './validators'

/**
 * Current backup format. Older versions still import: v1 predates slips, so
 * its files carry none (their absence defaults to an empty map).
 */
export const BACKUP_VERSION = 2

const SUPPORTED_VERSIONS: readonly number[] = [1, 2]

export interface BackupFile {
  version: number
  exportedAt: string
  habits: Habit[]
  milestones: Record<string, Milestone[]>
  slips: Record<string, Slip[]>
  settings: AppSettings
}

/** Snapshot the current habits, milestones, slips and settings. */
export const buildBackup = (): BackupFile => ({
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  habits: getHabits(),
  milestones: parseMilestoneStore(readJSON(STORAGE_KEYS.milestones, {})),
  slips: parseSlipStore(readJSON(STORAGE_KEYS.slips, {})),
  settings: getSettings(),
})

const isISODateString = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))

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

  if (
    typeof file.version !== 'number'
    || !SUPPORTED_VERSIONS.includes(file.version)
  ) {
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
  // Slips are absent in v1 files — default to an empty map in that case.
  const slips = file.slips ?? {}
  if (!isSlipMap(slips)) {
    return { ok: false, error: 'invalid-slips' }
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
      slips,
      settings: file.settings,
    },
  }
}

/** Pretty-print a backup for file export / sharing. */
export const exportToFile = (data: BackupFile): string =>
  JSON.stringify(data, null, 2)

/**
 * Drop unsafe / orphan entries BEFORE they reach the store write.
 *
 * - Keys `__proto__`, `constructor`, `prototype` are prototype-pollution
 *   sinks: `store[key] = value` on a fresh `{}` sets the object's prototype.
 *   JSON.parse keeps them as own enumerable data props, so we strip them here.
 * - Entries whose habitId does not match any imported habit are orphaned
 *   (no UI can ever read them) and are dropped.
 *
 * Shared by the milestone and slip maps — both are Record<habitId, T[]>.
 */
const sanitizeHabitMap = <T>(
  entries: Record<string, T[]>,
  habitIds: Set<string>,
): Record<string, T[]> => {
  const safe = ['__proto__', 'constructor', 'prototype']
  const result: Record<string, T[]> = {}
  for (const [habitId, value] of Object.entries(entries)) {
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

/** Replace habits, milestones, slips and settings with the imported backup. */
export const importBackup = (data: BackupFile): void => {
  const habitIds = new Set(data.habits.map(h => h.id))
  saveHabits(data.habits)
  const milestones = sanitizeHabitMap(data.milestones, habitIds)
  for (const [habitId, value] of Object.entries(milestones)) {
    saveMilestonesForHabit(habitId, value)
  }
  const slips = sanitizeHabitMap(data.slips, habitIds)
  for (const [habitId, value] of Object.entries(slips)) {
    saveSlipsForHabit(habitId, value)
  }
  saveSettings(normalizeSettings(data.settings))
}
