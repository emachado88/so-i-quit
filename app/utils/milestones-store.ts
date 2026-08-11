/**
 * Milestone persistence over localStorage — ported from the RN data layer
 * (data/milestones.ts, AsyncStorage key "milestones-v1").
 *
 * The store is a Record<habitId, Milestone[]>. Corrupt / non-object JSON
 * is tolerated and treated as empty (same as RN).
 */

import { generateMilestones, isMilestoneReached } from './milestones'
import { STORAGE_KEYS, readJSON, writeJSON } from './storage'
import type { Habit, Milestone } from './types'

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
  const { [habitId]: _removed, ...rest } = store
  writeStore(rest)
}

/**
 * Ensure a habit has milestone state:
 *  - when no record exists, generate through the current rolling horizon;
 *  - mark every target before `now` as reached (silent backfill);
 *  - persist the result.
 *
 * First initialization returns `newlyReached: []` — long-standing habits
 * must not produce a queue of obsolete celebrations.
 */
export const ensureMilestonesForHabit = (
  habit: Habit,
  now: Date,
): { milestones: Milestone[]; newlyReached: Milestone[] } => {
  if (!habit.date) {
    return { milestones: [], newlyReached: [] }
  }

  const store = readStore()
  const stored = store[habit.id]

  if (!stored || stored.length === 0) {
    // Silent backfill: initialize without celebrating anything historical.
    const generated = generateMilestones(habit, now)
    const backfilled = generated.map((milestone) => ({
      ...milestone,
      reachedAt: isMilestoneReached(habit, milestone, now)
        ? now.toISOString()
        : null,
    }))
    store[habit.id] = backfilled
    writeStore(store)
    return { milestones: backfilled, newlyReached: [] }
  }

  // Extend an existing record through the current horizon and mark newly
  // crossed targets. Only milestones crossed since the last check are
  // returned as newly reached.
  const existingById = new Map(stored.map((m) => [m.id, m]))
  const generated = generateMilestones(habit, now)
  const newlyReached: Milestone[] = []

  const merged = generated.map((milestone) => {
    const existing = existingById.get(milestone.id)
    if (!existing) {
      const reached = isMilestoneReached(habit, milestone, now)
      const fresh: Milestone = {
        ...milestone,
        reachedAt: reached ? now.toISOString() : null,
      }
      if (reached) newlyReached.push(fresh)
      return fresh
    }
    // Roll forward: a stored milestone whose target has now passed gets
    // reachedAt set and is enqueued for celebration exactly once.
    if (
      existing.reachedAt === null &&
      isMilestoneReached(habit, existing, now)
    ) {
      const updated: Milestone = {
        ...existing,
        reachedAt: now.toISOString(),
      }
      newlyReached.push(updated)
      return updated
    }
    return existing
  })

  store[habit.id] = merged
  writeStore(store)
  return { milestones: merged, newlyReached }
}

/**
 * Load milestone state for every dated habit in one pass (avoids repeated
 * storage reads on the Progress screen). Also performs silent backfill for
 * habits without a record yet.
 */
export const getMilestonesForHabits = (
  habits: Habit[],
  now: Date,
): Record<string, Milestone[]> => {
  const store = readStore()
  const result: Record<string, Milestone[]> = {}

  for (const habit of habits) {
    if (!habit.date) continue
    let milestones = store[habit.id]
    if (!milestones || milestones.length === 0) {
      milestones = generateMilestones(habit, now).map((milestone) => ({
        ...milestone,
        reachedAt: isMilestoneReached(habit, milestone, now)
          ? now.toISOString()
          : null,
      }))
      store[habit.id] = milestones
    }
    result[habit.id] = milestones
  }

  writeStore(store)
  return result
}
