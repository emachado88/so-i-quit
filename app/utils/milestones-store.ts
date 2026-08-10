/**
 * Milestone persistence over localStorage — ported from the RN data layer
 * (data/milestones.ts, AsyncStorage key "milestones-v1").
 *
 * The store is a Record<habitId, Milestone[]>. Corrupt / non-object JSON
 * is tolerated and treated as empty (same as RN).
 *
 * NOTE: the reconcile/backfill operations (ensureMilestonesForHabit,
 * getMilestonesForHabits) land together with the milestone calendar
 * engine — they depend on generateMilestones/isMilestoneReached.
 */

import { STORAGE_KEYS, readJSON, writeJSON } from './storage'
import type { Milestone } from './types'

type MilestoneStore = Record<string, Milestone[]>

const readStore = (): MilestoneStore => {
  const parsed: unknown = readJSON(STORAGE_KEYS.milestones, {})
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as MilestoneStore)
    : {}
}

const writeStore = (store: MilestoneStore): void => {
  writeJSON(STORAGE_KEYS.milestones, store)
}

/** Stored milestones for one habit (may be empty). */
export const getMilestonesForHabit = (habitId: string): Milestone[] => {
  const store = readStore()
  return store[habitId] ?? []
}

/** Replace the stored milestone list for one habit. */
export const saveMilestonesForHabit = (
  habitId: string,
  milestones: Milestone[],
): void => {
  const store = readStore()
  store[habitId] = milestones
  writeStore(store)
}

/** Remove all milestone state for one habit. */
export const deleteMilestonesForHabit = (habitId: string): void => {
  const store = readStore()
  delete store[habitId]
  writeStore(store)
}
