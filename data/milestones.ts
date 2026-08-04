import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Habit, Milestone } from "@/constants/types";
import {
  generateMilestones,
  isMilestoneReached,
} from "@/lib/milestones";

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const STORAGE_KEY = "milestones-v1";

type MilestoneStore = Record<string, Milestone[]>;

const readStore = async (): Promise<MilestoneStore> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as MilestoneStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = async (store: MilestoneStore): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

// ---------------------------------------------------------------------------
// Public operations
// ---------------------------------------------------------------------------

/** Stored milestones for one habit (may be empty). */
export const getMilestonesForHabit = async (
  habitId: string,
): Promise<Milestone[]> => {
  const store = await readStore();
  return store[habitId] ?? [];
};

/** Replace the stored milestone list for one habit. */
export const saveMilestonesForHabit = async (
  habitId: string,
  milestones: Milestone[],
): Promise<void> => {
  const store = await readStore();
  store[habitId] = milestones;
  await writeStore(store);
};

/**
 * Ensure a habit has milestone state:
 *  - when no record exists, generate through the current rolling horizon;
 *  - mark every target before `now` as reached (silent backfill);
 *  - persist the result.
 *
 * First initialization returns `newlyReached: []` — long-standing habits
 * must not produce a queue of obsolete celebrations.
 */
export const ensureMilestonesForHabit = async (
  habit: Habit,
  now: Date,
): Promise<{ milestones: Milestone[]; newlyReached: Milestone[] }> => {
  if (!habit.date) {
    return { milestones: [], newlyReached: [] };
  }

  const store = await readStore();
  const stored = store[habit.id];

  if (!stored || stored.length === 0) {
    // Silent backfill: initialize without celebrating anything historical.
    const generated = generateMilestones(habit, now);
    const backfilled = generated.map((milestone) => ({
      ...milestone,
      reachedAt: isMilestoneReached(habit, milestone, now)
        ? now.toISOString()
        : null,
    }));
    store[habit.id] = backfilled;
    await writeStore(store);
    return { milestones: backfilled, newlyReached: [] };
  }

  // Extend an existing record through the current horizon and mark newly
  // crossed targets. Only milestones crossed since the last check are
  // returned as newly reached.
  const existingById = new Map(stored.map((m) => [m.id, m]));
  const generated = generateMilestones(habit, now);
  const newlyReached: Milestone[] = [];

  const merged = generated.map((milestone) => {
    const existing = existingById.get(milestone.id);
    if (!existing) {
      const reached = isMilestoneReached(habit, milestone, now);
      const fresh: Milestone = {
        ...milestone,
        reachedAt: reached ? now.toISOString() : null,
      };
      if (reached) newlyReached.push(fresh);
      return fresh;
    }
    // Roll forward: a stored milestone whose target has now passed gets
    // reachedAt set and is enqueued for celebration exactly once.
    if (existing.reachedAt === null && isMilestoneReached(habit, existing, now)) {
      const updated: Milestone = {
        ...existing,
        reachedAt: now.toISOString(),
      };
      newlyReached.push(updated);
      return updated;
    }
    return existing;
  });

  store[habit.id] = merged;
  await writeStore(store);
  return { milestones: merged, newlyReached };
};

/**
 * Load milestone state for every dated habit in one pass (avoids repeated
 * storage reads on the Progress screen). Also performs silent backfill for
 * habits without a record yet.
 */
export const getMilestonesForHabits = async (
  habits: Habit[],
  now: Date,
): Promise<Record<string, Milestone[]>> => {
  const store = await readStore();
  const result: Record<string, Milestone[]> = {};

  for (const habit of habits) {
    if (!habit.date) continue;
    let milestones = store[habit.id];
    if (!milestones || milestones.length === 0) {
      milestones = generateMilestones(habit, now).map((milestone) => ({
        ...milestone,
        reachedAt: isMilestoneReached(habit, milestone, now)
          ? now.toISOString()
          : null,
      }));
      store[habit.id] = milestones;
    }
    result[habit.id] = milestones;
  }

  await writeStore(store);
  return result;
};

/** Remove all milestone state for one habit. */
export const deleteMilestonesForHabit = async (
  habitId: string,
): Promise<void> => {
  const store = await readStore();
  delete store[habitId];
  await writeStore(store);
};
