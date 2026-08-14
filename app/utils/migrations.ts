/**
 * Migration infrastructure for persisted data. Baseline-only for now — the
 * export/import ticket adds versioned migrations here. Persisted format is
 * unchanged (no envelope): migrations mutate the raw data in place.
 */

import { STORAGE_KEYS } from './storage'

export interface Migration {
  /** Data version the migration upgrades from (first migration: 1). */
  from: number
  /** Upgrade transform, applied in `from` order. */
  up: (data: unknown) => unknown
}

const baseline = (): Migration => ({ from: 1, up: data => data })

export const MIGRATIONS: Record<string, Migration[]> = {
  [STORAGE_KEYS.habits]: [baseline()],
  [STORAGE_KEYS.milestones]: [baseline()],
  [STORAGE_KEYS.settings]: [baseline()],
}

/** Apply all migrations for a key in `from` order; unknown keys pass through. */
export const applyMigrations = (key: string, data: unknown): unknown => {
  const chain = MIGRATIONS[key] ?? []
  return chain
    .slice()
    .sort((a, b) => a.from - b.from)
    .reduce((acc, migration) => migration.up(acc), data)
}
