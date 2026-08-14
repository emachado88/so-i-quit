// Unit tests for the Capacitor local-notifications wrapper.
//
// The plugin is mocked at the module boundary; the wrapper itself is real.
// Two platform scenarios:
//   - native (Capacitor.isNativePlatform() → true): plugin calls flow through
//   - browser (false, the default in node): every function is a no-op
//
// The wrapper caches the channel-creation promise at module level, so each
// test reloads the module (vi.resetModules + dynamic import) to get a fresh
// module state.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ActionPerformed,
  CancelOptions,
  ScheduleOptions,
} from '@capacitor/local-notifications'

import { getMilestonesForHabit, saveMilestonesForHabit } from '../../app/utils/milestones-store'
import { installStorageMock } from '../helpers'
import type { Habit, Milestone } from '../../app/utils/types'

const mocks = vi.hoisted(() => {
  const schedule = vi.fn(async (_options: ScheduleOptions) => ({
    notifications: [{ id: 1 }],
  }))
  const getPending = vi.fn(async () => ({ notifications: [] }))
  const cancel = vi.fn(async (_options: CancelOptions) => {})
  const requestPermissions = vi.fn(async () => ({ display: 'granted' }))
  const checkPermissions = vi.fn(async () => ({ display: 'granted' }))
  const areEnabled = vi.fn(async () => ({ value: true }))
  const createChannel = vi.fn(async () => {})
  const checkExact = vi.fn(async () => ({ exact_alarm: 'granted' }))
  const changeExact = vi.fn(async () => ({ exact_alarm: 'granted' }))
  const isNative = vi.fn(() => true)
  const getPlatform = vi.fn(() => 'android')
  const addListener = vi.fn(
    async (_event: string, _listener: (a: ActionPerformed) => void) => ({
      remove: () => Promise.resolve(),
    }),
  )
  const appAddListener = vi.fn(
    async (_event: string, _listener: (state: { isActive: boolean }) => void) => ({
      remove: () => Promise.resolve(),
    }),
  )
  return {
    schedule, getPending, cancel, requestPermissions, checkPermissions,
    createChannel, checkExact, changeExact, isNative, getPlatform, addListener,
    appAddListener, areEnabled,
  }
})

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mocks.isNative(),
    getPlatform: () => mocks.getPlatform(),
  },
}))

vi.mock('@capacitor/app', () => ({
  App: { addListener: mocks.appAddListener },
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: mocks.schedule,
    getPending: mocks.getPending,
    cancel: mocks.cancel,
    requestPermissions: mocks.requestPermissions,
    checkPermissions: mocks.checkPermissions,
    areEnabled: mocks.areEnabled,
    createChannel: mocks.createChannel,
    checkExactNotificationSetting: mocks.checkExact,
    changeExactNotificationSetting: mocks.changeExact,
    addListener: mocks.addListener,
  },
}))

installStorageMock()

type NotificationsModule = typeof import('../../app/utils/notifications')
let notifications: NotificationsModule

beforeEach(async () => {
  vi.clearAllMocks()
  mocks.isNative.mockReturnValue(true)
  mocks.schedule.mockResolvedValue({ notifications: [{ id: 1 }] })
  mocks.getPending.mockResolvedValue({ notifications: [] })
  mocks.cancel.mockResolvedValue(undefined)
  mocks.requestPermissions.mockResolvedValue({ display: 'granted' })
  mocks.checkPermissions.mockResolvedValue({ display: 'granted' })
  mocks.checkExact.mockResolvedValue({ exact_alarm: 'granted' })
  vi.resetModules()
  notifications = await import('../../app/utils/notifications')
})

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  key: 'habits.alcohol',
  name: '',
  date: '2026-01-01T10:00:00.000Z',
  savings: '5',
  ...overrides,
})

/** Let the addListener promise resolve (its .then assigns the handle). */
const flush = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

const makeMilestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'h1-month-1',
  habitId: 'h1',
  unit: 'month',
  amount: 1,
  reachedAt: null,
  notificationId: null,
  ...overrides,
})

const t = (key: string, params?: Record<string, unknown>): string => {
  const map: Record<string, string> = {
    'milestone.notificationTitle': 'Milestone reached!',
    'milestone.notificationBody': '{habit} free for {milestone}!',
    'milestone.month.one': 'month',
    'milestone.month.other': 'months',
    'milestone.day.one': 'day',
    'milestone.day.other': 'days',
    'milestone.week.one': 'week',
    'milestone.week.other': 'weeks',
    'habits.alcohol': 'Alcohol',
  }
  let out = map[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.replace(`{${k}}`, String(v))
    }
  }
  return out
}

describe('platform guard (browser)', () => {
  it('reports notifications unsupported in the browser', () => {
    mocks.isNative.mockReturnValue(false)
    expect(notifications.isNotificationsSupported()).toBe(false)
  })

  it('every function is a no-op in the browser', async () => {
    mocks.isNative.mockReturnValue(false)
    await expect(notifications.requestNotificationPermission()).resolves.toBe(false)
    await expect(
      notifications.scheduleMilestoneNotification(makeHabit(), makeMilestone(), t, new Date()),
    ).resolves.toBeNull()
    await expect(notifications.cancelMilestoneNotification('1')).resolves.toBeUndefined()
    await expect(notifications.cancelHabitNotifications([makeMilestone()])).resolves.toBeUndefined()
    await expect(notifications.cancelAllMilestoneNotifications()).resolves.toBeUndefined()
    await expect(
      notifications.reconcileHabitNotifications(makeHabit(), [makeMilestone()], t, new Date()),
    ).resolves.toEqual([makeMilestone()])
    await expect(notifications.checkExactNotificationSetting()).resolves.toBe(true)
    expect(mocks.schedule).not.toHaveBeenCalled()
    expect(mocks.getPending).not.toHaveBeenCalled()
    expect(mocks.cancel).not.toHaveBeenCalled()
  })
})

describe('permissions', () => {
  it('requestNotificationPermission returns true when granted', async () => {
    await expect(notifications.requestNotificationPermission()).resolves.toBe(true)
    expect(mocks.requestPermissions).toHaveBeenCalledTimes(1)
  })

  it('requestNotificationPermission returns false when denied', async () => {
    mocks.requestPermissions.mockResolvedValue({ display: 'denied' })
    await expect(notifications.requestNotificationPermission()).resolves.toBe(false)
  })

  it('creates the milestone channel before requesting permission', async () => {
    await notifications.requestNotificationPermission()
    expect(mocks.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'milestones', importance: 4 }),
    )
  })

  it('getNotificationPermissionStatus maps plugin states', async () => {
    await expect(notifications.getNotificationPermissionStatus()).resolves.toBe('granted')
    mocks.checkPermissions.mockResolvedValue({ display: 'prompt' })
    await expect(notifications.getNotificationPermissionStatus()).resolves.toBe('undetermined')
  })

  it('reports denied when the OS switch is off even if the runtime grant remains', async () => {
    // User revoked "All notifications" in system settings: the runtime
    // POST_NOTIFICATIONS grant stays GRANTED, but areEnabled() is false.
    // The status must be 'denied' so the toggle reflects the real state.
    mocks.areEnabled.mockResolvedValue({ value: false })
    mocks.checkPermissions.mockResolvedValue({ display: 'granted' })
    await expect(notifications.getNotificationPermissionStatus()).resolves.toBe('denied')
  })
})

describe('exact alarms', () => {
  it('checkExactNotificationSetting surfaces the plugin state', async () => {
    await expect(notifications.checkExactNotificationSetting()).resolves.toBe(true)
    mocks.checkExact.mockResolvedValue({ exact_alarm: 'denied' })
    await expect(notifications.checkExactNotificationSetting()).resolves.toBe(false)
  })

  it('openExactNotificationSettings calls the plugin', async () => {
    await notifications.openExactNotificationSettings()
    expect(mocks.changeExact).toHaveBeenCalledTimes(1)
  })
})

describe('addAppForegroundListener', () => {
  it('registers an appStateChange listener on native and fires only when active', async () => {
    const onForeground = vi.fn()
    const sub = notifications.addAppForegroundListener(onForeground)
    await flush()

    expect(mocks.appAddListener).toHaveBeenCalledWith(
      'appStateChange',
      expect.any(Function),
    )
    const listener = mocks.appAddListener.mock.calls[0]![1] as (
      state: { isActive: boolean },
    ) => void
    listener({ isActive: false })
    expect(onForeground).not.toHaveBeenCalled()
    listener({ isActive: true })
    expect(onForeground).toHaveBeenCalledTimes(1)
    sub.remove()
  })

  it('is a no-op subscription in the browser', async () => {
    mocks.isNative.mockReturnValue(false)
    const sub = notifications.addAppForegroundListener(() => {})
    expect(mocks.appAddListener).not.toHaveBeenCalled()
    sub.remove() // must not throw
  })
})

describe('addNotificationTapListener', () => {
  it('registers a localNotificationActionPerformed listener on native', async () => {
    const onTap = vi.fn()
    const sub = notifications.addNotificationTapListener(onTap)
    await flush()

    expect(mocks.addListener).toHaveBeenCalledWith(
      'localNotificationActionPerformed',
      expect.any(Function),
    )
    sub.remove()
  })

  it('invokes the callback with the habitId from the notification extra', async () => {
    const onTap = vi.fn()
    notifications.addNotificationTapListener(onTap)
    await flush()

    const listener = mocks.addListener.mock.calls[0]![1] as unknown as (
      action: ActionPerformed,
    ) => void
    listener({ notification: { extra: { habitId: 'h1' } } } as ActionPerformed)
    expect(onTap).toHaveBeenCalledWith('h1')
  })

  it('ignores taps without a habitId', async () => {
    const onTap = vi.fn()
    notifications.addNotificationTapListener(onTap)
    await flush()

    const listener = mocks.addListener.mock.calls[0]![1] as unknown as (
      action: ActionPerformed,
    ) => void
    listener({ notification: { extra: { milestoneId: 'm1' } } } as ActionPerformed)
    listener({ notification: { extra: undefined } } as ActionPerformed)
    expect(onTap).not.toHaveBeenCalled()
  })

  it('is a no-op subscription in the browser', async () => {
    mocks.isNative.mockReturnValue(false)
    const onTap = vi.fn()
    const sub = notifications.addNotificationTapListener(onTap)
    expect(mocks.addListener).not.toHaveBeenCalled()
    sub.remove() // must not throw
  })
})

describe('scheduleMilestoneNotification', () => {
  it('schedules with an exact-alarm trigger at the target date', async () => {
    const habit = makeHabit()
    const milestone = makeMilestone()
    const result = await notifications.scheduleMilestoneNotification(habit, milestone, t, new Date('2026-01-10T00:00:00Z'))

    expect(result?.notificationId).toBe(String(notifications.notificationIdFor(milestone)))
    expect(mocks.schedule).toHaveBeenCalledTimes(1)
    const [options] = mocks.schedule.mock.calls[0] as unknown as [ScheduleOptions]
    const [scheduled] = options.notifications as [
      {
        id: number
        title: string
        body: string
        extra: { habitId: string, milestoneId: string }
        schedule: { at: Date, allowWhileIdle: boolean }
        channelId: string
      },
    ]
    expect(scheduled.id).toBe(notifications.notificationIdFor(milestone))
    expect(scheduled.title).toBe('Milestone reached!')
    expect(scheduled.body).toBe('Alcohol free for 1 month!')
    expect(scheduled.extra).toEqual({ habitId: 'h1', milestoneId: 'h1-month-1' })
    expect(scheduled.schedule.allowWhileIdle).toBe(true)
    expect(scheduled.schedule.at.toISOString()).toBe('2026-02-01T10:00:00.000Z')
    expect(scheduled.channelId).toBe('milestones')
  })

  it('refuses to schedule a past target', async () => {
    const habit = makeHabit()
    const milestone = makeMilestone({ unit: 'day', amount: 1 })
    const result = await notifications.scheduleMilestoneNotification(
      habit,
      milestone,
      t,
      new Date('2026-12-31T00:00:00Z'),
    )
    expect(result).toBeNull()
    expect(mocks.schedule).not.toHaveBeenCalled()
  })
})

describe('cancel', () => {
  it('cancelMilestoneNotification cancels the stored id', async () => {
    await notifications.cancelMilestoneNotification('42')
    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: 42 }] })
  })

  it('cancelMilestoneNotification ignores null/blank ids', async () => {
    await notifications.cancelMilestoneNotification(null)
    await notifications.cancelMilestoneNotification('')
    expect(mocks.cancel).not.toHaveBeenCalled()
  })

  it('cancelHabitNotifications cancels every stored id', async () => {
    const milestones = [
      makeMilestone({ notificationId: '42' }),
      makeMilestone({ id: 'h1-day-1', unit: 'day', amount: 1, notificationId: '7' }),
      makeMilestone({ id: 'h1-day-3', unit: 'day', amount: 3, notificationId: null }),
    ]
    await notifications.cancelHabitNotifications(milestones)
    expect(mocks.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 42 }, { id: 7 }],
    })
  })

  it('cancelAllMilestoneNotifications cancels every pending one', async () => {
    mocks.getPending.mockResolvedValue({
      notifications: [{ id: 1 }, { id: 2 }],
    })
    await notifications.cancelAllMilestoneNotifications()
    expect(mocks.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 1 }, { id: 2 }],
    })
  })

  it('cancelAllMilestoneNotifications skips when nothing is pending', async () => {
    await notifications.cancelAllMilestoneNotifications()
    expect(mocks.cancel).not.toHaveBeenCalled()
  })
})

describe('reconcileHabitNotifications', () => {
  const NOW = new Date('2026-01-10T00:00:00Z')
  // Habit starts 2026-01-01: day-1 (Jan 2) and day-3 (Jan 4) are reached;
  // week-1 (Jan 8) is reached; week-2 (Jan 15) is the first future target.

  it('keeps a still-pending id and schedules missing future milestones', async () => {
    const habit = makeHabit()
    const stored = [
      makeMilestone({ id: 'h1-week-2', unit: 'week', amount: 2, notificationId: '11' }),
    ]
    mocks.getPending.mockResolvedValue({ notifications: [{ id: 11 }] })

    const reconciled = await notifications.reconcileHabitNotifications(habit, stored, t, NOW)

    // week-2 target (2026-01-15) is still ahead → kept with its pending id.
    const kept = reconciled.find(m => m.id === 'h1-week-2')
    expect(kept?.notificationId).toBe('11')
    expect(mocks.schedule).not.toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({ extra: { habitId: 'h1', milestoneId: 'h1-week-2' } }),
        ],
      }),
    )
    // Other future base milestones (week-3, month-2, ...) get scheduled.
    const scheduledIds = reconciled
      .filter(m => m.notificationId !== null)
      .map(m => m.id)
    expect(scheduledIds).toContain('h1-week-3')
    expect(scheduledIds).toContain('h1-month-2')
    expect(scheduledIds).not.toContain('h1-day-1') // reached → never scheduled
  })

  it('cancels stale ids for milestones outside the horizon', async () => {
    const habit = makeHabit()
    // A stored milestone that no longer exists after regeneration (e.g. the
    // habit date changed): its notification must be cancelled, not kept.
    const stored = [
      makeMilestone({ id: 'h1-day-1', unit: 'day', amount: 1, notificationId: '9' }),
      makeMilestone({ id: 'h1-old', unit: 'year', amount: 99, notificationId: '13' }),
    ]
    mocks.getPending.mockResolvedValue({ notifications: [{ id: 9 }, { id: 13 }] })

    const reconciled = await notifications.reconcileHabitNotifications(habit, stored, t, NOW)

    expect(reconciled.some(m => m.id === 'h1-old')).toBe(false)
    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: 13 }] })
  })

  it('marks reached milestones with null ids and cancels leftover pending ids', async () => {
    const habit = makeHabit()
    const stored = [
      makeMilestone({ id: 'h1-day-1', unit: 'day', amount: 1, notificationId: '9' }),
    ]
    mocks.getPending.mockResolvedValue({ notifications: [{ id: 9 }] })

    const reconciled = await notifications.reconcileHabitNotifications(habit, stored, t, NOW)

    const day1 = reconciled.find(m => m.id === 'h1-day-1')
    expect(day1?.notificationId).toBeNull()
    expect(day1?.reachedAt).not.toBeNull()
    expect(mocks.cancel).toHaveBeenCalledWith({ notifications: [{ id: 9 }] })
    // The reached milestone itself is never scheduled again.
    expect(mocks.schedule).not.toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({ extra: { habitId: 'h1', milestoneId: 'h1-day-1' } }),
        ],
      }),
    )
  })

  it('respects the iOS pending budget (maxPending) when scheduling', async () => {
    mocks.getPlatform.mockReturnValue('ios')
    const habit = makeHabit()
    mocks.getPending.mockResolvedValue({ notifications: [] })

    const reconciled = await notifications.reconcileHabitNotifications(habit, [], t, NOW, 5)

    const withIds = reconciled.filter(m => m.notificationId !== null)
    // Budget 5 → exactly the 5 earliest future milestones get a notification.
    expect(withIds.length).toBe(5)
    expect(mocks.schedule).toHaveBeenCalledTimes(5)
    // Later milestones are still reconciled (with null ids) for the ring UI.
    expect(reconciled.length).toBeGreaterThan(5)
  })

  it('splits the iOS budget across dated habits in reconcileAll', async () => {
    mocks.getPlatform.mockReturnValue('ios')
    const habits = [makeHabit(), makeHabit({ id: 'h2', date: '2026-01-05T09:00:00.000Z' })]
    saveMilestonesForHabit('h1', [])
    saveMilestonesForHabit('h2', [])
    mocks.getPending.mockResolvedValue({ notifications: [] })

    await notifications.reconcileAllHabitNotifications(habits, t, new Date('2026-01-10T00:00:00Z'))

    const h1Ids = getMilestonesForHabit('h1').filter(m => m.notificationId !== null)
    const h2Ids = getMilestonesForHabit('h2').filter(m => m.notificationId !== null)
    // 60 budget / 2 habits = 30 each — never beyond iOS's hard 64 cap.
    expect(h1Ids.length).toBeLessThanOrEqual(30)
    expect(h2Ids.length).toBeLessThanOrEqual(30)
    expect(h1Ids.length + h2Ids.length).toBeLessThanOrEqual(60)
  })
})

describe('reconcileAllHabitNotifications', () => {
  it('reconciles and persists every dated habit', async () => {
    const habits = [makeHabit(), makeHabit({ id: 'h2', date: '2026-01-05T09:00:00.000Z' })]
    saveMilestonesForHabit('h1', [])
    saveMilestonesForHabit('h2', [])
    mocks.getPending.mockResolvedValue({ notifications: [] })

    await notifications.reconcileAllHabitNotifications(habits, t, new Date('2026-01-10T00:00:00Z'))

    expect(getMilestonesForHabit('h1').length).toBeGreaterThan(0)
    expect(getMilestonesForHabit('h2').length).toBeGreaterThan(0)
    expect(mocks.schedule).toHaveBeenCalled()
  })

  it('skips undated habits', async () => {
    const habits = [makeHabit({ date: null })]
    await notifications.reconcileAllHabitNotifications(habits, t, new Date())
    expect(mocks.schedule).not.toHaveBeenCalled()
  })
})

describe('notificationIdFor', () => {
  it('is deterministic and positive', () => {
    const a = makeMilestone()
    expect(notifications.notificationIdFor(a)).toBe(notifications.notificationIdFor(makeMilestone()))
    expect(notifications.notificationIdFor(a)).toBeGreaterThan(0)
    expect(Number.isInteger(notifications.notificationIdFor(a))).toBe(true)
  })

  it('distinguishes milestones', () => {
    const month = makeMilestone()
    const day = makeMilestone({ id: 'h1-day-1', unit: 'day', amount: 1 })
    expect(notifications.notificationIdFor(month)).not.toBe(notifications.notificationIdFor(day))
  })

  it('stays within the positive int32 range for any milestone id', () => {
    const milestones = [
      makeMilestone(),
      makeMilestone({ id: 'h1-day-1', unit: 'day', amount: 1 }),
      makeMilestone({ id: 'h2-day-365', unit: 'day', amount: 365 }),
      makeMilestone({ id: 'h3-week-52', unit: 'week', amount: 52 }),
      makeMilestone({ id: 'h4-month-120', unit: 'month', amount: 120 }),
      makeMilestone({ id: 'h5-year-10', unit: 'year', amount: 10 }),
    ]
    for (const milestone of milestones) {
      const result = notifications.notificationIdFor(milestone)
      expect(result).toBeGreaterThanOrEqual(1)
      expect(result).toBeLessThanOrEqual(0x7fffffff)
      expect(Number.isInteger(result)).toBe(true)
    }
  })
})
