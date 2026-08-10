// @vitest-environment happy-dom
import { createI18n } from 'vue-i18n'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import HabitsPage from '../../app/pages/habits.vue'
import { getHabits, saveHabits } from '../../app/utils/habits'
import { getMilestonesForHabit } from '../../app/utils/milestones-store'
import { getSettings } from '../../app/utils/settings'
import type { Habit } from '../../app/utils/types'
import { installStorageMock, seedStorage } from '../helpers'

// Notification side effects are mocked (their logic has its own suite); the
// screen only needs to call them with the right arguments.
vi.mock('../../app/utils/notifications', () => ({
  requestNotificationPermission: vi.fn(async () => false),
  reconcileHabitNotifications: vi.fn(async (_habit: unknown, stored: unknown) => stored),
  cancelHabitNotifications: vi.fn(async () => {}),
}))

import * as notifications from '../../app/utils/notifications'

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

const mountPage = async () => {
  const wrapper = mount(HabitsPage, { global: { plugins: [i18n] } })
  await nextTick()
  return wrapper
}

const buttonByText = (wrapper: Awaited<ReturnType<typeof mountPage>>, text: string) =>
  wrapper.findAll('button').find((b) => b.text().trim() === text)

const lastButtonByText = (wrapper: Awaited<ReturnType<typeof mountPage>>, text: string) =>
  [...wrapper.findAll('button')].reverse().find((b) => b.text().trim() === text)

const openMenu = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
  wrapper.find('[aria-label^="Open menu"]').trigger('click')

/**
 * Complete the wizard: date → time → savings (or skip savings).
 * `withSavings: false` finishes right after the time step (edit-date flow).
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
  await buttonByText(wrapper, 'Confirm')!.trigger('click')
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
})

afterEach(() => {
  document.body.innerHTML = ''
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
    await buttonByText(wrapper, '+')!.trigger('click')
    await wrapper.find('input[type="text"]').setValue('coffee')
    await buttonByText(wrapper, 'Add')!.trigger('click')

    expect(getHabits()[0]).toMatchObject({ name: 'Coffee' })
    expect(getHabits()[0].key).toBeUndefined()
    expect(wrapper.find('#wizard-date').exists()).toBe(true)
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

  it('edit savings via the menu', async () => {
    saveHabits([makeHabit({ date: '2025-05-31T10:00:00.000Z', savings: '3' })])
    const wrapper = await mountPage()

    await openMenu(wrapper)
    await buttonByText(wrapper, 'Edit savings')!.trigger('click')
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

  it('surfaces storage errors via the snackbar', async () => {
    seedStorage('habits', '{not json')
    const wrapper = await mountPage()
    await nextTick()
    expect(wrapper.text()).toContain('Failed to load habits')
  })
})
