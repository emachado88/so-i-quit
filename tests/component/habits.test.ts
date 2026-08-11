// @vitest-environment happy-dom
import { createI18n } from 'vue-i18n'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import HabitsPage from '../../app/pages/habits.vue'
import { handleBackButton } from '../../app/utils/back-handler'
import { getHabits, saveHabits } from '../../app/utils/habits'
import { getMilestonesForHabit } from '../../app/utils/milestones-store'
import * as notifications from '../../app/utils/notifications'
import { getSettings } from '../../app/utils/settings'
import type { Habit } from '../../app/utils/types'
import { installStorageMock, seedStorage } from '../helpers'

// Notification side effects are mocked (their logic has its own suite); the
// screen only needs to call them with the right arguments.
vi.mock('../../app/utils/notifications', () => ({
  requestNotificationPermission: vi.fn(async () => false),
  reconcileHabitNotifications: vi.fn(async (_habit: unknown, stored: unknown) => stored),
  cancelHabitNotifications: vi.fn(async () => {}),
  checkExactNotificationSetting: vi.fn(async () => true),
  openExactNotificationSettings: vi.fn(async () => {}),
  cancelAllMilestoneNotifications: vi.fn(async () => {}),
  reconcileAllHabitNotifications: vi.fn(async () => {}),
  addAppForegroundListener: vi.fn(() => ({ remove: vi.fn() })),
}))

installStorageMock()

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: { en },
})

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Alcohol',
  date: null,
  savings: null,
  ...overrides,
})

// Tracked so afterEach can unmount — components register/unregister back
// handlers on mount/unmount, and leaking mounted wrappers between tests
// would leak handlers into the shared stack.
type PageWrapper = VueWrapper<ComponentPublicInstance>
const wrappers: PageWrapper[] = []

const mountPage = async (): Promise<PageWrapper> => {
  const wrapper = mount(HabitsPage, { global: { plugins: [i18n] } })
  await nextTick()
  wrappers.push(wrapper)
  return wrapper
}

const buttonByText = (wrapper: PageWrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === text)

const lastButtonByText = (wrapper: PageWrapper, text: string) =>
  [...wrapper.findAll('button')].reverse().find((b) => b.text().trim() === text)

const openMenu = (wrapper: PageWrapper) =>
  wrapper.find('[aria-label^="Open menu"]').trigger('click')

/**
 * Complete the wizard: date + time on one step → savings (or skip savings).
 * `withSavings: false` finishes right after the datetime step (edit-date flow).
 */
const completeWizard = async (
  wrapper: Awaited<ReturnType<typeof mountPage>>,
  {
    date = '2025-05-31',
    time = '10:00',
    savings = '5.25',
    skip = false,
    withSavings = true,
  } = {},
) => {
  await wrapper.find('#wizard-date').setValue(date)
  await wrapper.find('#wizard-time').setValue(time)
  await buttonByText(wrapper, 'Confirm')!.trigger('click')
  if (!withSavings) return
  if (skip) {
    await buttonByText(wrapper, 'Skip')!.trigger('click')
  } else {
    await wrapper.find('#savings-amount').setValue(savings)
    await buttonByText(wrapper, 'Save')!.trigger('click')
  }
  await flushPromises()
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(notifications.requestNotificationPermission).mockResolvedValue(false)
  vi.mocked(notifications.checkExactNotificationSetting).mockResolvedValue(true)
})

afterEach(() => {
  document.body.innerHTML = ''
  for (const w of wrappers.splice(0)) w.unmount()
})

describe('pages/habits', () => {
  it('shows the empty state', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('No habits added yet.')
  })

  it('renders a habit with formatted date and savings', async () => {
    seedStorage('settings-v1', JSON.stringify({ currency: 'EUR' }))
    saveHabits([
      makeHabit({ date: '2025-05-31T10:00:00.000Z', savings: '5.25' }),
    ])
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Alcohol')
    expect(wrapper.text()).toContain('Log relapse')
    // Intl en: "May 31, 2025" (time may vary by runner TZ)
    expect(wrapper.text()).toContain('May 31, 2025')
    expect(wrapper.text()).toContain('€5.25/day')
  })

  it('adds a standard habit and opens the wizard', async () => {
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')

    expect(getHabits()).toHaveLength(1)
    expect(wrapper.find('#wizard-date').exists()).toBe(true)
  })

  it('wizard confirm stays disabled until both date and time are filled', async () => {
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')

    const confirm = () => buttonByText(wrapper, 'Confirm')!
    expect(confirm().attributes('disabled')).toBeDefined()

    await wrapper.find('#wizard-date').setValue('2025-05-31')
    expect(confirm().attributes('disabled')).toBeDefined()

    await wrapper.find('#wizard-time').setValue('10:00')
    expect(confirm().attributes('disabled')).toBeUndefined()
  })

  it('completes the wizard: date + time + savings persist and opt-in appears once', async () => {
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper)

    const [habit] = getHabits()
    const saved = new Date(habit.date!)
    expect(saved.getFullYear()).toBe(2025)
    expect(saved.getMonth()).toBe(4) // May
    expect(saved.getDate()).toBe(31)
    expect(saved.getHours()).toBe(10)
    expect(saved.getMinutes()).toBe(0)
    expect(habit.savings).toBe('5.25')

    // First completed wizard → milestone opt-in prompt
    expect(wrapper.text()).toContain('Celebrate your milestones?')
    expect(getSettings().milestoneNotificationsPrompted).toBe(true)
    // Milestone state initialized for the habit (real id, not the fixture)
    expect(getMilestonesForHabit(habit.id).length).toBeGreaterThan(0)
  })

  it('skip keeps savings unset on the first wizard', async () => {
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper, { skip: true })

    const [habit] = getHabits()
    expect(habit.date).not.toBeNull()
    expect(habit.savings).toBeNull()
  })

  it('cancelling a new-habit wizard removes the created habit', async () => {
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    expect(getHabits()).toHaveLength(1)

    await buttonByText(wrapper, 'Cancel')!.trigger('click')
    await nextTick()
    expect(getHabits()).toEqual([])
    expect(wrapper.find('#wizard-date').exists()).toBe(false)
  })

  it('adds a custom habit with normalized name', async () => {
    const wrapper = await mountPage()
    // The custom button shows "+ Add another" — target its aria-label,
    // which is stable across translations.
    await wrapper.find('[aria-label="Add custom habit"]').trigger('click')
    await wrapper.find('input[type="text"]').setValue('coffee')
    await buttonByText(wrapper, 'Add')!.trigger('click')

    expect(getHabits()[0]).toMatchObject({ name: 'Coffee' })
    expect(getHabits()[0].key).toBeUndefined()
    expect(wrapper.find('#wizard-date').exists()).toBe(true)
  })

  it('edit date pre-fills the saved date and keeps savings', async () => {
    saveHabits([
      makeHabit({ date: '2025-01-01T10:30:00.000Z', savings: '3' }),
    ])
    const wrapper = await mountPage()

    await openMenu(wrapper)
    await buttonByText(wrapper, 'Edit date')!.trigger('click')
    await nextTick()

    // Native inputs pre-filled with the saved instant in local time
    const saved = new Date('2025-01-01T10:30:00.000Z')
    const pad = (n: number) => String(n).padStart(2, '0')
    const expectedDate = `${saved.getFullYear()}-${pad(saved.getMonth() + 1)}-${pad(saved.getDate())}`
    const expectedTime = `${pad(saved.getHours())}:${pad(saved.getMinutes())}`
    expect(
      (wrapper.find('#wizard-date').element as HTMLInputElement).value,
    ).toBe(expectedDate)
    expect(
      (wrapper.find('#wizard-time').element as HTMLInputElement).value,
    ).toBe(expectedTime)

    // Confirm with the untouched pre-filled values round-trips the date
    await buttonByText(wrapper, 'Confirm')!.trigger('click')
    await flushPromises()

    const [habit] = getHabits()
    expect(habit.date).toBe('2025-01-01T10:30:00.000Z')
    expect(habit.savings).toBe('3') // untouched
  })

  it('edit date keeps savings and updates the date', async () => {
    saveHabits([makeHabit({ date: '2025-01-01T00:00:00.000Z', savings: '3' })])
    const wrapper = await mountPage()

    await openMenu(wrapper)
    await buttonByText(wrapper, 'Edit date')!.trigger('click')
    await completeWizard(wrapper, { date: '2025-06-15', time: '09:30', withSavings: false })
    await flushPromises()

    const [habit] = getHabits()
    const saved = new Date(habit.date!)
    expect(saved.getFullYear()).toBe(2025)
    expect(saved.getMonth()).toBe(5) // June
    expect(saved.getDate()).toBe(15)
    expect(saved.getHours()).toBe(9)
    expect(habit.savings).toBe('3') // untouched
  })

  it('edit savings via the menu (pre-filled with the current value)', async () => {
    saveHabits([makeHabit({ date: '2025-05-31T10:00:00.000Z', savings: '3' })])
    const wrapper = await mountPage()

    await openMenu(wrapper)
    await buttonByText(wrapper, 'Edit savings')!.trigger('click')
    await nextTick()

    expect(
      (wrapper.find('#savings-amount').element as HTMLInputElement).value,
    ).toBe('3')

    await wrapper.find('#savings-amount').setValue('7.5')
    await buttonByText(wrapper, 'Confirm')!.trigger('click')

    expect(getHabits()[0].savings).toBe('7.50')
  })

  it('deletes a habit after confirmation (milestones dropped too)', async () => {
    saveHabits([makeHabit({ date: '2025-05-31T10:00:00.000Z' })])
    seedStorage('milestones-v1', JSON.stringify({ h1: [] }))
    const wrapper = await mountPage()

    await openMenu(wrapper)
    await buttonByText(wrapper, 'Delete')!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Are you sure you want to delete Alcohol?')

    await buttonByText(wrapper, 'Delete')!.trigger('click')
    await flushPromises()

    expect(getHabits()).toEqual([])
    expect(getMilestonesForHabit('h1')).toEqual([])
    expect(notifications.cancelHabitNotifications).toHaveBeenCalled()
  })

  it('log relapse asks for confirmation and opens the reset wizard', async () => {
    saveHabits([makeHabit({ date: '2025-05-31T10:00:00.000Z', savings: '2' })])
    const wrapper = await mountPage()

    await buttonByText(wrapper, 'Log relapse')!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('restarts your streak from today')

    // The dialog confirm button is the last "Log relapse" in the DOM
    await lastButtonByText(wrapper, 'Log relapse')!.trigger('click')
    await nextTick()
    expect(wrapper.find('#wizard-date').exists()).toBe(true)
  })

  it('opt-in enable persists the preference when permission is granted', async () => {
    vi.mocked(notifications.requestNotificationPermission).mockResolvedValue(true)
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper)

    await buttonByText(wrapper, 'Enable notifications')!.trigger('click')
    await flushPromises()

    expect(getSettings().milestoneNotificationsEnabled).toBe(true)
    expect(notifications.reconcileHabitNotifications).toHaveBeenCalled()
  })

  it('opt-in enable chains the exact-alarm dialog only when permission is granted and exact alarms are denied', async () => {
    vi.mocked(notifications.requestNotificationPermission).mockResolvedValue(true)
    vi.mocked(notifications.checkExactNotificationSetting).mockResolvedValue(false)
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper)

    await buttonByText(wrapper, 'Enable notifications')!.trigger('click')
    await flushPromises()

    expect(getSettings().milestoneNotificationsEnabled).toBe(true)
    expect(wrapper.text()).toContain('Allow exact alarms?')
  })

  it('opt-in enable never shows the exact-alarm dialog when the OS permission is denied', async () => {
    // Default mocks: permission denied, exact alarms granted — no chain.
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper)

    await buttonByText(wrapper, 'Enable notifications')!.trigger('click')
    await flushPromises()

    expect(getSettings().milestoneNotificationsEnabled).toBe(false)
    expect(wrapper.text()).not.toContain('Allow exact alarms?')
  })

  it('exact-alarm dialog skip dismisses without opening system settings', async () => {
    vi.mocked(notifications.requestNotificationPermission).mockResolvedValue(true)
    vi.mocked(notifications.checkExactNotificationSetting).mockResolvedValue(false)
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper)
    await buttonByText(wrapper, 'Enable notifications')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Allow exact alarms?')

    await buttonByText(wrapper, 'Skip')!.trigger('click')
    await nextTick()

    expect(wrapper.text()).not.toContain('Allow exact alarms?')
    expect(notifications.openExactNotificationSettings).not.toHaveBeenCalled()
  })

  it('exact-alarm dialog go-to-settings opens the system screen and stays open', async () => {
    vi.mocked(notifications.requestNotificationPermission).mockResolvedValue(true)
    vi.mocked(notifications.checkExactNotificationSetting).mockResolvedValue(false)
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper)
    await buttonByText(wrapper, 'Enable notifications')!.trigger('click')
    await flushPromises()

    await buttonByText(wrapper, 'Go to settings')!.trigger('click')

    expect(notifications.openExactNotificationSettings).toHaveBeenCalledTimes(1)
    // Dialog stays open until the user returns from system settings.
    expect(wrapper.text()).toContain('Allow exact alarms?')
  })

  it('returning to foreground with exact alarms granted dismisses the dialog and rebuilds schedules', async () => {
    vi.mocked(notifications.requestNotificationPermission).mockResolvedValue(true)
    vi.mocked(notifications.checkExactNotificationSetting).mockResolvedValue(false)
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper)
    await buttonByText(wrapper, 'Enable notifications')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Allow exact alarms?')

    // The page registered the native foreground listener on mount.
    const listener = vi.mocked(notifications.addAppForegroundListener).mock.calls[0][0]
    vi.mocked(notifications.checkExactNotificationSetting).mockResolvedValue(true)
    await listener()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Allow exact alarms?')
    expect(notifications.cancelAllMilestoneNotifications).toHaveBeenCalledTimes(1)
    expect(notifications.reconcileAllHabitNotifications).toHaveBeenCalledTimes(1)
  })

  it('returning to foreground while exact alarms are still denied keeps the dialog open', async () => {
    vi.mocked(notifications.requestNotificationPermission).mockResolvedValue(true)
    vi.mocked(notifications.checkExactNotificationSetting).mockResolvedValue(false)
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper)
    await buttonByText(wrapper, 'Enable notifications')!.trigger('click')
    await flushPromises()

    const listener = vi.mocked(notifications.addAppForegroundListener).mock.calls[0][0]
    await listener()
    await flushPromises()

    expect(wrapper.text()).toContain('Allow exact alarms?')
    expect(notifications.cancelAllMilestoneNotifications).not.toHaveBeenCalled()
    expect(notifications.reconcileAllHabitNotifications).not.toHaveBeenCalled()
  })

  it('surfaces storage errors via the snackbar', async () => {
    seedStorage('habits', '{not json')
    const wrapper = await mountPage()
    await nextTick()
    expect(wrapper.text()).toContain('Failed to load habits')
  })

  // ── Hardware back (Android) ──
  //
  // handleBackButton() is the real util: the components register on
  // mount/visible, so these tests exercise the actual wiring.

  it('hardware back closes the wizard from the first step (new habit dropped)', async () => {
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    expect(wrapper.find('#wizard-date').exists()).toBe(true)

    expect(handleBackButton()).toBe(true)
    await nextTick()

    expect(wrapper.find('#wizard-date').exists()).toBe(false)
    // Same semantics as tapping Cancel: the pre-created habit is dropped.
    expect(getHabits()).toEqual([])
  })

  it('hardware back steps the wizard back, then cancels from the datetime step', async () => {
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await wrapper.find('#wizard-date').setValue('2025-05-31')
    await wrapper.find('#wizard-time').setValue('10:00')
    await buttonByText(wrapper, 'Confirm')!.trigger('click')
    expect(wrapper.find('#savings-amount').exists()).toBe(true)

    // savings → datetime
    expect(handleBackButton()).toBe(true)
    await nextTick()
    expect(wrapper.find('#wizard-date').exists()).toBe(true)
    expect(wrapper.find('#savings-amount').exists()).toBe(false)
    expect(getHabits()).toHaveLength(1) // wizard still open → habit kept

    // datetime → cancel (habit dropped, like the Cancel button)
    expect(handleBackButton()).toBe(true)
    await nextTick()
    expect(wrapper.find('#wizard-date').exists()).toBe(false)
    expect(getHabits()).toEqual([])
  })

  it('hardware back dismisses the delete confirmation without deleting', async () => {
    saveHabits([makeHabit({ date: '2025-05-31T10:00:00.000Z' })])
    const wrapper = await mountPage()

    await openMenu(wrapper)
    await buttonByText(wrapper, 'Delete')!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Are you sure you want to delete Alcohol?')

    expect(handleBackButton()).toBe(true)
    await nextTick()

    expect(wrapper.text()).not.toContain(
      'Are you sure you want to delete Alcohol?',
    )
    expect(getHabits()).toHaveLength(1)
  })

  it('hardware back closes the habit menu', async () => {
    saveHabits([makeHabit({})])
    const wrapper = await mountPage()

    await openMenu(wrapper)
    expect(
      wrapper.findAll('button').some((b) => b.text() === 'Edit date'),
    ).toBe(true)

    expect(handleBackButton()).toBe(true)
    await nextTick()

    expect(
      wrapper.findAll('button').some((b) => b.text() === 'Edit date'),
    ).toBe(false)
  })

  it('hardware back dismisses the edit-savings modal without saving', async () => {
    saveHabits([makeHabit({ date: '2025-05-31T10:00:00.000Z', savings: '3' })])
    const wrapper = await mountPage()

    await openMenu(wrapper)
    await buttonByText(wrapper, 'Edit savings')!.trigger('click')
    expect(wrapper.find('#savings-amount').exists()).toBe(true)

    expect(handleBackButton()).toBe(true)
    await nextTick()

    expect(wrapper.find('#savings-amount').exists()).toBe(false)
    expect(getHabits()[0].savings).toBe('3') // untouched
  })

  it('hardware back dismisses the milestone opt-in like "Not now"', async () => {
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper)
    expect(wrapper.text()).toContain('Celebrate your milestones?')

    expect(handleBackButton()).toBe(true)
    await nextTick()

    expect(wrapper.text()).not.toContain('Celebrate your milestones?')
    // Preference untouched — opting out via back does not enable or prompt again.
    expect(getSettings().milestoneNotificationsEnabled).toBe(false)
  })

  it('hardware back dismisses the exact-alarm dialog like Skip', async () => {
    vi.mocked(notifications.requestNotificationPermission).mockResolvedValue(true)
    vi.mocked(notifications.checkExactNotificationSetting).mockResolvedValue(false)
    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Alcohol')!.trigger('click')
    await completeWizard(wrapper)
    await buttonByText(wrapper, 'Enable notifications')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Allow exact alarms?')

    expect(handleBackButton()).toBe(true)
    await nextTick()

    expect(wrapper.text()).not.toContain('Allow exact alarms?')
    expect(notifications.openExactNotificationSettings).not.toHaveBeenCalled()
  })
})
