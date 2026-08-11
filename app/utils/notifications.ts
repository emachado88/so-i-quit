/**
 * Local milestone notifications over @capacitor/local-notifications.
 *
 * Browser/web builds are silent no-ops (the web has no local notifications) —
 * the Capacitor platform guard short-circuits every call before the plugin
 * is touched. On Android the plugin schedules exact alarms (SCHEDULE_EXACT_ALARM)
 * with an automatic inexact fallback when the user denies special access.
 *
 * Notification ids are deterministic int32 values derived from the milestone
 * id (`${habitId}-${unit}-${amount}`), so reconcile can rebuild the expected
 * id and check it against the pending list without storing anything extra.
 */

import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { LocalNotifications } from '@capacitor/local-notifications'

import { getHabitName } from './domain'
import {
  formatMilestoneLabel,
  generateMilestones,
  isMilestoneReached,
  milestoneTargetDate,
} from './milestones'
import {
  getMilestonesForHabits,
  saveMilestonesForHabit,
} from './milestones-store'
import type { Habit, Milestone } from './types'

type Translate = (key: string, params?: Record<string, unknown>) => string

/** Android notification channel for milestone celebrations. */
export const MILESTONE_CHANNEL_ID = 'milestones'

/**
 * iOS hard-caps pending local notifications at 64 per app. `reconcileAll`
 * splits a safety-margin budget (60) across dated habits; each habit only
 * schedules its earliest milestones and later boots/foregrounds fill the
 * rest as earlier ones are reached (ids are deterministic — nothing lost).
 */
export const IOS_PENDING_BUDGET = 60

const isNative = (): boolean => Capacitor.isNativePlatform()
const isIOS = (): boolean => Capacitor.getPlatform() === 'ios'

/**
 * Deterministic int32 notification id for a milestone — stable across
 * launches, so pending checks and cancels work without a stored map.
 */
export const notificationIdFor = (milestone: Milestone): number => {
  let hash = 5381
  for (let i = 0; i < milestone.id.length; i += 1) {
    hash = ((hash << 5) + hash + milestone.id.charCodeAt(i)) | 0
  }
  return Math.abs(hash) || 1
}

/** Ensure the milestone channel exists (Android 8+; no-op elsewhere). */
let channelReady: Promise<void> | null = null
const ensureChannel = (): Promise<void> => {
  if (!isNative()) return Promise.resolve()
  if (!channelReady) {
    channelReady = LocalNotifications.createChannel({
      id: MILESTONE_CHANNEL_ID,
      name: 'Milestones',
      description: 'Milestone celebrations',
      importance: 4, // IMPORTANCE_HIGH
      vibration: true,
    }).catch(() => {
      // Channel may already exist or be unavailable — scheduling still works
      // on the default channel.
    })
  }
  return channelReady
}

// ---------------------------------------------------------------------------
// Support & permissions
// ---------------------------------------------------------------------------

/** Whether local notifications are available on this platform. */
export const isNotificationsSupported = (): boolean => isNative()

/** Current OS notification permission state (no user-facing prompt). */
export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined'

/** Read the OS-level notification permission. */
export const getNotificationPermissionStatus
  = async (): Promise<NotificationPermissionStatus> => {
    if (!isNative()) return 'undetermined'
    try {
      // `areEnabled()` reflects the real OS switch (areNotificationsEnabled).
      // `checkPermissions()` only reads the runtime POST_NOTIFICATIONS grant,
      // which stays GRANTED when the user turns all notifications off in
      // system settings — so it would wrongly report "granted".
      const { value } = await LocalNotifications.areEnabled()
      if (!value) return 'denied'
      const { display } = await LocalNotifications.checkPermissions()
      if (display === 'granted') return 'granted'
      return 'undetermined'
    }
    catch {
      return 'undetermined'
    }
  }

/** Request notification permission; true when granted. */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNative()) return false
  await ensureChannel()
  try {
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  }
  catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Exact alarms (Android 12+ special access)
// ---------------------------------------------------------------------------

/** Whether exact alarms are allowed (Android < 12 / browser: always true). */
export const checkExactNotificationSetting = async (): Promise<boolean> => {
  if (!isNative()) return true
  try {
    const { exact_alarm } = await LocalNotifications.checkExactNotificationSetting()
    return exact_alarm === 'granted'
  }
  catch {
    return true
  }
}

/** Open the system settings screen for exact-alarm access. */
export const openExactNotificationSettings = async (): Promise<void> => {
  if (!isNative()) return
  try {
    await LocalNotifications.changeExactNotificationSetting()
  }
  catch {
    // Android < 12: nothing to change.
  }
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

/** Schedule one milestone notification; resolves with its id when scheduled. */
export const scheduleMilestoneNotification = async (
  habit: Habit,
  milestone: Milestone,
  t: Translate,
  now: Date,
): Promise<{ milestone: Milestone, notificationId: string } | null> => {
  if (!isNative() || !habit.date) return null
  const target = milestoneTargetDate(habit, milestone)
  if (target.isBefore(now)) return null

  await ensureChannel()
  const id = notificationIdFor(milestone)
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: t('milestone.notificationTitle'),
          body: t('milestone.notificationBody', {
            habit: getHabitName(habit, t),
            milestone: formatMilestoneLabel(milestone, t),
          }),
          extra: { habitId: habit.id, milestoneId: milestone.id },
          schedule: { at: target.toDate(), allowWhileIdle: true },
          channelId: MILESTONE_CHANNEL_ID,
        },
      ],
    })
  }
  catch {
    return null
  }
  return { milestone, notificationId: String(id) }
}

/** Cancel a single pending notification by stored id. */
export const cancelMilestoneNotification = async (
  notificationId: string | null,
): Promise<void> => {
  if (!isNative() || !notificationId) return
  const id = Number(notificationId)
  if (!Number.isInteger(id)) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] })
  }
  catch {
    // Already fired or unavailable — nothing to cancel.
  }
}

/** Cancel every pending notification of a habit's milestone list. */
export const cancelHabitNotifications = async (
  milestones: Milestone[],
): Promise<void> => {
  if (!isNative()) return
  const ids = milestones
    .map(m => m.notificationId)
    .filter((id): id is string => id !== null)
    .map(Number)
    .filter(id => Number.isInteger(id))
  if (ids.length === 0) return
  try {
    await LocalNotifications.cancel({
      notifications: ids.map(id => ({ id })),
    })
  }
  catch {
    // Best effort — ids stay stored so a later reconcile can retry.
  }
}

/** Cancel every pending notification the app scheduled. */
export const cancelAllMilestoneNotifications = async (): Promise<void> => {
  if (!isNative()) return
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length === 0) return
    await LocalNotifications.cancel({
      notifications: pending.notifications.map(n => ({ id: n.id })),
    })
  }
  catch {
    // Best effort.
  }
}

// ---------------------------------------------------------------------------
// Tap handling
// ---------------------------------------------------------------------------

export interface NotificationTapSubscription {
  remove: () => void
}

/**
 * Register a callback for when the app returns to the foreground (e.g. the
 * user toggled notifications in system settings and came back). Uses the
 * native app lifecycle (`appStateChange`) — the WebView equivalent of the RN
 * AppState listener. `visibilitychange` alone is unreliable in the WebView:
 * the DOM visibility doesn't change when the app itself backgrounds. Browser:
 * no-op subscription.
 */
export const addAppForegroundListener = (
  onForeground: () => void,
): NotificationTapSubscription => {
  if (!isNative()) return { remove: () => {} }

  let handle: { remove: () => Promise<void> } | null = null
  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) onForeground()
  }).then((listenerHandle) => {
    handle = listenerHandle
  })

  return {
    remove: () => {
      void handle?.remove()
    },
  }
}

/**
 * Register a listener for taps on milestone notifications. Fires on
 * background taps AND cold starts (the Android plugin retains the launch
 * intent action until a JS listener registers). Browser: no-op subscription.
 */
export const addNotificationTapListener = (
  onTap: (habitId: string) => void,
): NotificationTapSubscription => {
  if (!isNative()) return { remove: () => {} }

  let handle: { remove: () => Promise<void> } | null = null
  void LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (action) => {
      const extra = action.notification?.extra as
        | { habitId?: string }
        | undefined
      if (extra?.habitId) onTap(extra.habitId)
    },
  ).then((listenerHandle) => {
    handle = listenerHandle
  })

  return {
    remove: () => {
      void handle?.remove()
    },
  }
}

// ---------------------------------------------------------------------------
// Reconcile
// ---------------------------------------------------------------------------

/**
 * Idempotently reconcile a habit's schedule against the current horizon:
 *  - cancel stale ids (targets that no longer exist or already passed);
 *  - keep valid pending ids;
 *  - create missing future notifications;
 *  - return the reconciled milestone list (caller persists it).
 * Never schedules past targets.
 */
export const reconcileHabitNotifications = async (
  habit: Habit,
  stored: Milestone[],
  t: Translate,
  now: Date,
  maxPending: number = Number.POSITIVE_INFINITY,
): Promise<Milestone[]> => {
  if (!habit.date || !isNative()) return stored

  let pendingIds: Set<number>
  try {
    const pending = await LocalNotifications.getPending()
    pendingIds = new Set(pending.notifications.map(n => n.id))
  }
  catch {
    pendingIds = new Set()
  }

  const generated = generateMilestones(habit, now)
  const generatedIds = new Set(generated.map(m => m.id))
  const storedById = new Map(stored.map(m => [m.id, m]))

  // 1. Cancel notifications whose milestone no longer exists in the
  //    regenerated horizon (e.g. after a date edit shrinks the list).
  const staleIds = stored
    .filter(m => m.notificationId && !generatedIds.has(m.id))
    .map(m => m.notificationId as string)
  for (const id of staleIds) {
    await cancelMilestoneNotification(id)
  }

  // 2. Reconcile each generated milestone.
  const reconciled: Milestone[] = []
  let pendingCount = 0
  for (const milestone of generated) {
    const previous = storedById.get(milestone.id)
    const reached = isMilestoneReached(habit, milestone, now)

    if (reached) {
      // Past target: never scheduled. Drop any stale stored id.
      if (previous?.notificationId && pendingIds.has(Number(previous.notificationId))) {
        await cancelMilestoneNotification(previous.notificationId)
      }
      reconciled.push({
        ...milestone,
        reachedAt: previous?.reachedAt ?? now.toISOString(),
        notificationId: null,
      })
      continue
    }

    // Future target: keep a still-pending id, otherwise schedule fresh —
    // unless the platform pending budget is exhausted (iOS caps at 64 per
    // app; reconcileAll splits the budget across habits and later boots
    // fill the rest as earlier milestones are reached).
    let notificationId: string | null = previous?.notificationId ?? null
    if (!notificationId || !pendingIds.has(Number(notificationId))) {
      if (pendingCount < maxPending) {
        const scheduled = await scheduleMilestoneNotification(habit, milestone, t, now)
        notificationId = scheduled?.notificationId ?? null
        if (notificationId) pendingCount += 1
      }
      else {
        notificationId = null
      }
    }
    else {
      pendingCount += 1
    }
    reconciled.push({
      ...milestone,
      reachedAt: previous?.reachedAt ?? null,
      notificationId,
    })
  }

  return reconciled
}

/** Reconcile every dated habit (Progress screen boot / permission restore). */
export const reconcileAllHabitNotifications = async (
  habits: Habit[],
  t: Translate,
  now: Date,
): Promise<void> => {
  if (!isNative()) return
  const dated = habits.filter(h => h.date)
  // iOS caps pending local notifications at 64 per app: split the safety
  // budget across dated habits so a habit with a 10-year horizon doesn't
  // crowd out the others. Android has no such limit (Infinity).
  const maxPending = isIOS()
    ? Math.max(1, Math.floor(IOS_PENDING_BUDGET / dated.length))
    : Number.POSITIVE_INFINITY
  const byHabit = getMilestonesForHabits(dated, now)
  for (const habit of dated) {
    const stored = byHabit[habit.id] ?? []
    const reconciled = await reconcileHabitNotifications(habit, stored, t, now, maxPending)
    saveMilestonesForHabit(habit.id, reconciled)
  }
}
