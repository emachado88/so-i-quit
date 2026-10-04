/**
 * Slip persistence over localStorage — ported alongside the milestone store.
 *
 * A "slip" is an occasional, one-time lapse (distinct from a relapse: it
 * does not restart the streak). The store is a Record<habitId, Slip[]>.
 * Corrupt / non-object JSON is tolerated and treated as empty (same as the
 * milestone store); malformed entries are discarded per-habit with a warning.
 */

import { STORAGE_KEYS, readJSON, writeJSON } from './storage'
import type { Slip } from './types'
import { isSlip } from './validators'

export type SlipStore = Record<string, Slip[]>

const newSlipId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

/**
 * Validate + clean a raw parsed value into a slip store. Corrupt / non-object
 * values are tolerated and treated as empty; malformed entries are discarded
 * per-habit with a warning. Shared by every read path (localStorage reads and
 * backup export) so validation lives in exactly one place.
 */
export const parseSlipStore = (raw: unknown): SlipStore => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  const store: SlipStore = {}
  for (const [habitId, value] of Object.entries(raw)) {
    if (!Array.isArray(value)) {
      console.warn('[slips] discarding non-array entry for habit', habitId)
      continue
    }
    store[habitId] = value.filter((slip): slip is Slip => {
      if (isSlip(slip)) return true
      console.warn('[slips] discarding invalid slip', slip)
      return false
    })
  }
  return store
}

/**
 * Strict whole-map guard: every entry must be a valid slip array. Used to
 * validate imported backup files — no partial tolerance there (a file with
 * any malformed slip is rejected outright).
 */
export const isSlipMap = (value: unknown): value is SlipStore => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  return Object.values(value).every(
    entry => Array.isArray(entry) && entry.every(isSlip),
  )
}

const readStore = (): SlipStore => parseSlipStore(readJSON(STORAGE_KEYS.slips, {}))

const writeStore = (store: SlipStore): void => {
  writeJSON(STORAGE_KEYS.slips, store)
}

/** Whole store in one read (Progress needs a count for every habit). */
export const getSlipStore = (): SlipStore => readStore()

/** Stored slips for one habit (may be empty). */
export const getSlipsForHabit = (habitId: string): Slip[] =>
  readStore()[habitId] ?? []

/** Replace the stored slip list for one habit. */
export const saveSlipsForHabit = (habitId: string, slips: Slip[]): void => {
  const store = readStore()
  store[habitId] = slips
  writeStore(store)
}

/** Append a slip dated `date` for a habit; returns the created record. */
export const addSlip = (habitId: string, date: Date): Slip => {
  const store = readStore()
  const slip: Slip = { id: newSlipId(), habitId, date: date.toISOString() }
  store[habitId] = [...(store[habitId] ?? []), slip]
  writeStore(store)
  return slip
}

/** Move a slip to a new date (no-op when the slip no longer exists). */
export const updateSlip = (
  habitId: string,
  slipId: string,
  date: Date,
): void => {
  const store = readStore()
  const slips = store[habitId]
  if (!slips) return
  store[habitId] = slips.map(slip =>
    slip.id === slipId ? { ...slip, date: date.toISOString() } : slip,
  )
  writeStore(store)
}

/** Remove one slip (no-op when the slip no longer exists). */
export const deleteSlip = (habitId: string, slipId: string): void => {
  const store = readStore()
  const slips = store[habitId]
  if (!slips) return
  store[habitId] = slips.filter(slip => slip.id !== slipId)
  writeStore(store)
}

/** Remove all slip state for one habit (relapse / habit deletion). */
export const deleteSlipsForHabit = (habitId: string): void => {
  const store = readStore()
  const { [habitId]: _removed, ...rest } = store
  writeStore(rest)
}

/**
 * Drop slips dated before `since` (ISO). Used when a habit's quit date is
 * edited: slips that predate the new streak no longer belong to it.
 */
export const clearPastSlips = (habitId: string, since: string): void => {
  const store = readStore()
  const slips = store[habitId]
  if (!slips) return
  const cutoff = Date.parse(since)
  store[habitId] = slips.filter(slip => Date.parse(slip.date) >= cutoff)
  writeStore(store)
}
