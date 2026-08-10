/**
 * Local milestone notifications wrapper.
 *
 * Browser/web builds are silent no-ops (the web has no local
 * notifications). The Capacitor implementation lands with the
 * notifications ticket (@capacitor/local-notifications) — callers keep
 * using this module, so nothing above this file changes.
 */

import type { Habit, Milestone } from './types'

type Translate = (key: string, params?: Record<string, unknown>) => string

/** Whether local notifications are available on this platform. */
export const isNotificationsSupported = (): boolean => false

/** Request notification permission; true when granted. */
export const requestNotificationPermission = async (): Promise<boolean> => false

/** Schedule one milestone notification; resolves with its id when scheduled. */
export const scheduleMilestoneNotification = async (
  habit: Habit,
  milestone: Milestone,
  t: Translate,
  now: Date,
): Promise<{ milestone: Milestone; notificationId: string } | null> => null

export const cancelMilestoneNotification = async (
  notificationId: string,
): Promise<void> => {}

/** Cancel every pending notification of a habit's milestone list. */
export const cancelHabitNotifications = async (
  milestones: Milestone[],
): Promise<void> => {}

export const cancelAllMilestoneNotifications = async (): Promise<void> => {}

/**
 * Schedule notifications for a habit's future milestones (and drop stale
 * ones). Returns the milestone list with notificationIds set.
 */
export const reconcileHabitNotifications = async (
  habit: Habit,
  milestones: Milestone[],
  t: Translate,
  now: Date,
): Promise<Milestone[]> => milestones

/** Reconcile notifications for every dated habit (Progress screen boot). */
export const reconcileAllHabitNotifications = async (
  habits: Habit[],
  t: Translate,
  now: Date,
): Promise<void> => {}
