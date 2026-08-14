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
import { getSettings, saveSettings } from './settings'
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

/** Replace habits, milestones and settings with the imported backup. */
export const importBackup = (data: BackupFile): void => {
  saveHabits(data.habits)
  for (const [habitId, milestones] of Object.entries(data.milestones)) {
    saveMilestonesForHabit(habitId, milestones)
  }
  saveSettings(data.settings)
}
