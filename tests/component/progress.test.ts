// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import HabitProgressCard from '../../app/components/progress/HabitProgressCard.vue'
import TotalSavingsCard from '../../app/components/progress/TotalSavingsCard.vue'
import IndexPage from '../../app/pages/index.vue'
import { saveHabits } from '../../app/utils/habits'
import {
  generateMilestones,
  isMilestoneReached,
} from '../../app/utils/milestones'
import { saveMilestonesForHabit } from '../../app/utils/milestones-store'
import type { Habit, Milestone } from '../../app/utils/types'
import { installStorageMock, seedStorage } from '../helpers'

// Notification side effects are mocked (their logic has its own suite); the
// screen only calls reconcile when notifications are enabled.
vi.mock('../../app/utils/notifications', () => ({
  reconcileHabitNotifications: vi.fn(
    async (_habit: unknown, stored: unknown) => stored,
  ),
}))

installStorageMock()

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/habits', component: { template: '<div />' } },
  ],
})

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Alcohol',
  date: null,
  savings: null,
  ...overrides,
})

// Deterministic clock for card-level tests (the card is driven by its `now`
// prop, so a fixed date makes every counter stable).
const NOW = new Date('2025-06-01T12:00:00.000Z')
const atDaysAgo = (days: number): string =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString()
// Page-level dates relative to the real clock (the page ticks with useNow).
const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 86_400_000).toISOString()

const makeMilestones = (habit: Habit, now: Date): Milestone[] =>
  generateMilestones(habit, now).map((milestone) => ({
    ...milestone,
    reachedAt: isMilestoneReached(habit, milestone, now)
      ? now.toISOString()
      : null,
  }))

// Synchronous rAF: the money counter jumps straight to its target value.
beforeEach(async () => {
  vi.clearAllMocks()
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
    cb(performance.now() + 1e9)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  await router.push('/')
  await router.isReady()
})

const wrappers: Array<{ unmount: () => void }> = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

const mountPage = async () => {
  const wrapper = mount(IndexPage, { global: { plugins: [i18n, router] } })
  wrappers.push(wrapper)
  await nextTick()
  await flushPromises()
  return wrapper
}

const cardButtonByText = (
  wrapper: Awaited<ReturnType<typeof mountPage>>,
  text: string,
) => wrapper.findAll('button').find((b) => b.text().trim() === text)

describe('pages/index', () => {
  it('shows the empty state and navigates to Habits on CTA', async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Ready to get better?')
    expect(wrapper.text()).toContain(
      'Add your first habit and start counting every smoke-free, alcohol-free day.',
    )

    await cardButtonByText(wrapper, 'Add your first habit')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/habits')
  })

  it('renders dated habits oldest-first with counters and total savings', async () => {
    seedStorage('settings-v1', JSON.stringify({ currency: 'EUR' }))
    const older = makeHabit({ id: 'h1', date: daysAgo(10), savings: '5' })
    const newer = makeHabit({
      id: 'h2',
      name: 'Tobacco',
      date: daysAgo(5),
      savings: '10',
    })
    saveHabits([older, newer])

    const wrapper = await mountPage()
    const text = wrapper.text()
    expect(text).toContain('Alcohol free for')
    expect(text).toContain('Tobacco free for')
    // 10 × €5 + 5 × €10 = €100, whole euros
    expect(text).toContain('€100')

    // Oldest first (wireframe: "sorted oldest-first")
    const articles = wrapper.findAll('article')
    expect(articles[0]!.text()).toContain('Alcohol')
    expect(articles[1]!.text()).toContain('Tobacco')
  })

  it('shows the no-data hint when habits exist but none dated', async () => {
    saveHabits([makeHabit({ date: null, savings: null })])

    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('No data saved in settings')
    expect(wrapper.text()).toContain('Go to habits')
    expect(wrapper.findAll('article')).toHaveLength(0)
  })

  it('queues celebration toasts for newly reached milestones', async () => {
    const habit = makeHabit({ date: daysAgo(10) })
    saveHabits([habit])
    // Milestone record from the first hour of the streak — nothing crossed
    // yet, so the next boot rolls 1 day / 3 days / 1 week forward.
    const early = new Date(Date.now() - 10 * 86_400_000 + 3_600_000)
    saveMilestonesForHabit(
      habit.id,
      generateMilestones(habit, early).map((milestone) => ({
        ...milestone,
        reachedAt: null,
      })),
    )

    const wrapper = await mountPage()
    const toast = wrapper.find('[role="status"]')
    expect(toast.exists()).toBe(true)
    expect(toast.text()).toContain('Alcohol free for 1 day!')

    await toast.find('button').trigger('click')
    await nextTick()
    expect(wrapper.find('[role="status"]').text()).toContain(
      'Alcohol free for 3 days!',
    )
  })
})

describe('components/progress/HabitProgressCard', () => {
  it('renders counters, ring, saved line and milestone chips', () => {
    const habit = makeHabit({ date: atDaysAgo(40), savings: '5.25' })
    const milestones = makeMilestones(habit, NOW)

    const wrapper = mount(HabitProgressCard, {
      props: { habit, milestones, now: NOW, currency: 'EUR' },
      global: { plugins: [i18n] },
    })
    const text = wrapper.text()
    expect(text).toContain('Alcohol free for')
    expect(text).toMatch(/40\s*days/)
    expect(text).toContain('1 month')
    expect(text).toContain('€210') // 40 × €5.25, whole euros
    expect(text).toContain('saved')
    expect(text).toContain('✓ 1 day')
    expect(text).toContain('Next: 2 months')
    expect(
      wrapper.find('svg[aria-label="milestone progress"]').exists(),
    ).toBe(true)
    expect(wrapper.find('circle.stroke-primary').exists()).toBe(true)
  })

  it('shows the just-started message for streaks under an hour', () => {
    const habit = makeHabit({
      date: new Date(NOW.getTime() - 30 * 60_000).toISOString(),
    })

    const wrapper = mount(HabitProgressCard, {
      props: { habit, milestones: [], now: NOW, currency: 'EUR' },
      global: { plugins: [i18n] },
    })
    expect(wrapper.text()).toContain("You've started, keep going")
  })
})

describe('components/progress/TotalSavingsCard', () => {
  it('renders the animated total and the since date', () => {
    const wrapper = mount(TotalSavingsCard, {
      props: { total: 4888, sinceDate: atDaysAgo(40), currency: 'EUR' },
      global: { plugins: [i18n] },
    })
    const text = wrapper.text()
    expect(text).toContain('Total savings')
    expect(text).toContain('€4,888')
    expect(text).toContain('since')
    expect(text).toContain('2025')
  })
})
