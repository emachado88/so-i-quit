import { getHabits } from '../utils/habits'
import {
  getMilestonesForHabit,
  saveMilestonesForHabit,
} from '../utils/milestones-store'
import {
  cancelAllMilestoneNotifications,
  checkExactNotificationSetting,
  openExactNotificationSettings,
  reconcileAllHabitNotifications,
  reconcileHabitNotifications,
  requestNotificationPermission,
} from '../utils/notifications'
import {
  getSettings,
  saveMilestoneNotificationsEnabled,
} from '../utils/settings'
import type { Habit, Milestone } from '../utils/types'
import { useExactAlarmPrompt } from './useExactAlarmPrompt'

const PENDING_EXACT_REASK = 'pending-exact-reask'

type Translate = (key: string, params?: Record<string, unknown>) => string

/**
 * Shared milestone-notification orchestration — the enable/disable/rebuild
 * chains and the exact-alarm re-ask dialog used by the habits, settings and
 * progress pages. Pages keep their own UI state (snackbars, haptics, denied
 * flags); the exact-alarm dialog state lives in the module singleton
 * (useExactAlarmPrompt) so a page re-creation mid-import cannot lose a
 * queued re-ask — the sessionStorage `pending-exact-reask` flag survives
 * the remount and re-surfaces on the next mount.
 */
export const useMilestoneNotifications = (t: Translate) => {
  const { visible } = useExactAlarmPrompt()

  const queueExactReask = async (): Promise<void> => {
    if (!(await checkExactNotificationSetting())) {
      visible.value = true
      sessionStorage.setItem(PENDING_EXACT_REASK, '1')
    }
  }

  const clearExactReask = (): void => {
    visible.value = false
    sessionStorage.removeItem(PENDING_EXACT_REASK)
  }

  /** Re-surface a queued re-ask after a page remount (flag survives it). */
  const refreshPendingExactReask = async (): Promise<void> => {
    sessionStorage.removeItem(PENDING_EXACT_REASK)
    if (
      getSettings().milestoneNotificationsEnabled
      && !(await checkExactNotificationSetting())
    ) {
      visible.value = true
    }
  }

  /**
   * Request the OS permission, persist the preference, schedule through the
   * rolling horizon and (optionally) surface the exact-alarm re-ask.
   * With `habitId` only that habit's schedules are reconciled (habits opt-in
   * flow); without it every habit is reconciled (settings toggle/import).
   * Returns whether the permission was granted.
   */
  const enableNotifications = async (
    habitId?: string | null,
    reask = true,
  ): Promise<boolean> => {
    const granted = await requestNotificationPermission()
    if (!granted) return false
    saveMilestoneNotificationsEnabled(true)
    if (habitId) {
      const habit = getHabits().find(h => h.id === habitId)
      if (habit?.date) {
        saveMilestonesForHabit(
          habit.id,
          await reconcileHabitNotifications(
            habit,
            getMilestonesForHabit(habit.id),
            t,
            new Date(),
          ),
        )
      }
    }
    else {
      await reconcileAllHabitNotifications(getHabits(), t, new Date())
    }
    if (reask) await queueExactReask()
    return true
  }

  /** Cancel every schedule and persist the preference off. */
  const disableNotifications = async (): Promise<void> => {
    await cancelAllMilestoneNotifications()
    saveMilestoneNotificationsEnabled(false)
  }

  /** cancel-all → reconcile-all (rebuilds after exact-alarm is granted). */
  const rebuildSchedules = async (): Promise<void> => {
    await cancelAllMilestoneNotifications()
    await reconcileAllHabitNotifications(getHabits(), t, new Date())
  }

  /**
   * Extend a single habit's schedule when the preference is on (boot
   * roll-forward and wizard finish). Persists the extended milestones and
   * returns them — or the input untouched when notifications are disabled.
   */
  const reconcileHabitSchedulesIfEnabled = async (
    habit: Habit,
    milestones: Milestone[],
    now: Date,
  ): Promise<Milestone[]> => {
    if (!getSettings().milestoneNotificationsEnabled) return milestones
    const reconciled = await reconcileHabitNotifications(habit, milestones, t, now)
    saveMilestonesForHabit(habit.id, reconciled)
    return reconciled
  }

  const goToExactSettings = (): void => {
    void openExactNotificationSettings()
  }

  /**
   * Re-check after the user returns from system settings. Granted → dismiss
   * and rebuild every schedule (Android keeps already-scheduled alarms
   * inexact — cancel + reconcile re-creates them as exact). Still denied →
   * keep the dialog open so they can retry or open settings again.
   */
  const onExactAlarmForeground = async (): Promise<void> => {
    if (!visible.value) return
    try {
      if (await checkExactNotificationSetting()) {
        clearExactReask()
        await rebuildSchedules()
      }
    }
    catch {
      // Permission API unavailable — leave the dialog open.
    }
  }

  return {
    visible,
    enableNotifications,
    disableNotifications,
    rebuildSchedules,
    reconcileHabitSchedulesIfEnabled,
    queueExactReask,
    clearExactReask,
    refreshPendingExactReask,
    goToExactSettings,
    onExactAlarmForeground,
  }
}
