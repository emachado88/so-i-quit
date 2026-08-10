/**
 * Milestone calendar engine — ported 1:1 from the RN app (lib/milestones.ts).
 *
 * Calendar-accurate targets via dayjs.add(amount, unit): anniversaries,
 * short months and leap years are handled by dayjs calendar semantics
 * (e.g. "1 year" is the calendar anniversary, not 365 days).
 */

import dayjs, { type Dayjs } from 'dayjs'

import type { Habit, Milestone, MilestoneUnit } from './types'

// ---------------------------------------------------------------------------
// Milestone calendar
// ---------------------------------------------------------------------------

export interface MilestoneDefinition {
  unit: MilestoneUnit
  amount: number
}

/**
 * Fixed milestone set shared by every habit. Yearly anniversaries are
 * generated on top of this (see generateMilestones).
 */
export const BASE_MILESTONES: readonly MilestoneDefinition[] = [
  { unit: 'day', amount: 1 },
  { unit: 'day', amount: 3 },
  { unit: 'week', amount: 1 },
  { unit: 'week', amount: 2 },
  { unit: 'week', amount: 3 },
  { unit: 'month', amount: 1 },
  { unit: 'month', amount: 2 },
  { unit: 'month', amount: 3 },
  { unit: 'month', amount: 6 },
  { unit: 'month', amount: 9 },
  { unit: 'year', amount: 1 },
  { unit: 'month', amount: 18 },
] as const

/**
 * Default rolling horizon: annual anniversaries are only materialised
 * through `horizonYears` years past `now`.
 */
export const DEFAULT_HORIZON_YEARS = 10

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** Deterministic milestone id — stable across launches and rebuilds. */
export const getMilestoneId = (
  habitId: string,
  unit: MilestoneUnit,
  amount: number,
): string => `${habitId}-${unit}-${amount}`

// ---------------------------------------------------------------------------
// Calendar target dates
// ---------------------------------------------------------------------------

/** Calendar-accurate target date using dayjs.add(amount, unit). */
export const milestoneTargetDate = (
  habit: Habit,
  milestone: Milestone,
): Dayjs => {
  const base = dayjs(habit.date)
  return base.add(milestone.amount, milestone.unit)
}

/** Raw target date for a definition (used while building milestone lists). */
export const definitionTargetDate = (
  habit: Habit,
  def: MilestoneDefinition,
): Dayjs => dayjs(habit.date).add(def.amount, def.unit)

/** Whether a milestone's target date has passed at `now` (inclusive). */
export const isMilestoneReached = (
  habit: Habit,
  milestone: Milestone,
  now: Date,
): boolean => !milestoneTargetDate(habit, milestone).isAfter(now)

// ---------------------------------------------------------------------------
// Milestone generation
// ---------------------------------------------------------------------------

/**
 * Generate the annual anniversary definitions between year 2 and the year
 * that covers `now + horizonYears` from the habit start. Year 1 is already
 * part of BASE_MILESTONES.
 */
export const generateYearlyMilestoneDefinitions = (
  habit: Habit,
  now: Date,
  horizonYears: number = DEFAULT_HORIZON_YEARS,
): MilestoneDefinition[] => {
  if (!habit.date) return []
  const start = dayjs(habit.date)
  const horizon = dayjs(now).add(horizonYears, 'year')
  const lastYear = Math.max(horizon.diff(start, 'year'), 2)

  const defs: MilestoneDefinition[] = []
  for (let amount = 2; amount <= lastYear; amount += 1) {
    defs.push({ unit: 'year', amount })
  }
  return defs
}

/**
 * Build the full milestone list for a habit through the rolling horizon:
 * fixed base milestones + yearly anniversaries. Sorted by target date.
 * Never mutates the input arrays.
 */
export const generateMilestones = (
  habit: Habit,
  now: Date,
  horizonYears: number = DEFAULT_HORIZON_YEARS,
): Milestone[] => {
  if (!habit.date) return []

  const definitions: MilestoneDefinition[] = [
    ...BASE_MILESTONES,
    ...generateYearlyMilestoneDefinitions(habit, now, horizonYears),
  ]

  const milestones: Milestone[] = definitions.map((def) => ({
    id: getMilestoneId(habit.id, def.unit, def.amount),
    habitId: habit.id,
    unit: def.unit,
    amount: def.amount,
    reachedAt: null,
    notificationId: null,
  }))

  // Sort by target date (copy-safe: milestones is a fresh array).
  return milestones.sort((a, b) =>
    milestoneTargetDate(habit, a).diff(milestoneTargetDate(habit, b)),
  )
}

// ---------------------------------------------------------------------------
// Previous / next milestone
// ---------------------------------------------------------------------------

/** First milestone whose target date is still ahead of `now`. */
export const getNextMilestone = (
  habit: Habit,
  milestones: Milestone[],
  now: Date,
): Milestone | null => {
  if (!habit.date) return null
  for (const milestone of milestones) {
    if (!isMilestoneReached(habit, milestone, now)) return milestone
  }
  return null
}

/** Last milestone whose target date has passed (null when none reached). */
export const getPreviousMilestone = (
  habit: Habit,
  milestones: Milestone[],
  now: Date,
): Milestone | null => {
  if (!habit.date) return null
  let previous: Milestone | null = null
  for (const milestone of milestones) {
    if (isMilestoneReached(habit, milestone, now)) {
      previous = milestone
    } else {
      break
    }
  }
  return previous
}

// ---------------------------------------------------------------------------
// Ring progress
// ---------------------------------------------------------------------------

/**
 * Progress toward the next milestone as elapsed time between the previous
 * target and the next target, clamped to [0, 1]:
 *
 *   (now - previousTarget) / (nextTarget - previousTarget)
 *
 * When no milestone has been reached yet, the streak start (habit.date)
 * acts as the previous target.
 */
export const ringProgress = (
  habit: Habit,
  milestones: Milestone[],
  now: Date,
): number => {
  if (!habit.date) return 0

  const previous = getPreviousMilestone(habit, milestones, now)
  const next = getNextMilestone(habit, milestones, now)
  if (!next) return 1

  const start = previous ? milestoneTargetDate(habit, previous) : dayjs(habit.date)
  const end = milestoneTargetDate(habit, next)
  const span = end.diff(start, 'millisecond')
  if (span <= 0) return 1

  const elapsed = dayjs(now).diff(start, 'millisecond')
  return Math.min(Math.max(elapsed / span, 0), 1)
}

// ---------------------------------------------------------------------------
// Localized labels
// ---------------------------------------------------------------------------

type Translate = (key: string, params?: Record<string, unknown>) => string

const UNIT_LABEL_KEYS: Record<
  MilestoneUnit,
  { one: string; other: string }
> = {
  day: { one: 'milestone.day.one', other: 'milestone.day.other' },
  week: { one: 'milestone.week.one', other: 'milestone.week.other' },
  month: { one: 'milestone.month.one', other: 'milestone.month.other' },
  year: { one: 'milestone.year.one', other: 'milestone.year.other' },
}

/** Localized label, e.g. "1 day", "6 months", "2 years". */
export const formatMilestoneLabel = (
  milestone: Milestone,
  t: Translate,
): string => {
  const keys = UNIT_LABEL_KEYS[milestone.unit]
  const label = t(milestone.amount === 1 ? keys.one : keys.other)
  return `${milestone.amount} ${label}`
}
