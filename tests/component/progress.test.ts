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
// screen only calls reconcile when notifications are enabled. The foreground
// listener is captured so tests can simulate the app returning to the
// foreground (the flow that re-checks milestones crossed while backgrounded).
const { nowRef, foregroundHandlers } = vi.hoisted(() => ({
  nowRef: { value: null as { value: Date } | null },
  foregroundHandlers: [] as Array<() => void>,
}))

// `useNow` must return a real Vue ref (the template unwraps `:now="now"`
// before passing it to the cards) — a plain object would trip the Date prop
// type check. The hoisted `nowRef` gives tests a handle to rewind the clock.
vi.mock('../../app/composables/useNow', async () => {
  const { ref } = await import('vue')
  const now = ref(new Date())
  nowRef.value = now
  return { useNow: () => now }
})

vi.mock('../../app/utils/notifications', () => ({
  reconcileHabitNotifications: vi.fn(
    async (_habit: unknown, stored: unknown) => stored,
  ),
  addAppForegroundListener: vi.fn((handler: () => void) => {
    foregroundHandlers.push(handler)
    return { remove: vi.fn() }
  }),
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
  // Keep the mocked page clock aligned with the real clock unless a test
  // rewinds it (the page-level `daysAgo` helper uses Date.now()).
  if (nowRef.value) nowRef.value.value = new Date()
  foregroundHandlers.length = 0
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
  // Undo any visibility override (the backgrounded test flips it hidden).
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  })
})

const mountPage = async () => {
  // The real useNow() snapshots the clock at mount; mirror that so dates
  // seeded with Date.now() (daysAgo) align with the page's `now`.
  if (nowRef.value) nowRef.value.value = new Date()
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
    // 10 × €5 + 5 × €10 = €100
    expect(text).toContain('€100.00')

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

  it('celebrates a milestone crossed while the page stays mounted', async () => {
    // Streak started 1.5 days ago; the milestone record was rolled forward
    // in the first hour. The 1-day target is crossed at mount; the 3-day
    // target passes while the user keeps the Progress page open.
    const habit = makeHabit({
      date: new Date(Date.now() - 1.5 * 86_400_000).toISOString(),
    })
    saveHabits([habit])
    const firstHour = new Date(Date.now() - 1.5 * 86_400_000 + 3_600_000)
    saveMilestonesForHabit(
      habit.id,
      generateMilestones(habit, firstHour).map((milestone) => ({
        ...milestone,
        reachedAt: null,
      })),
    )

    const wrapper = await mountPage()
    expect(wrapper.find('[role="status"]').text()).toContain(
      'Alcohol free for 1 day!',
    )
    await wrapper.find('[role="status"] button').trigger('click')
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)

    // No navigation, no foreground event — the clock just crosses the 3-day
    // target while the page stays mounted. The live tick watcher must queue
    // the celebration on its own.
    if (nowRef.value) nowRef.value.value = new Date(Date.now() + 2 * 86_400_000)
    await nextTick()
    await flushPromises()
    expect(wrapper.find('[role="status"]').text()).toContain(
      'Alcohol free for 3 days!',
    )
  })

  it('celebrates milestones crossed while backgrounded when the app returns', async () => {
    // Streak started 1.5 days ago. The milestone record was rolled forward
    // in the first hour — the 1-day target is crossed at mount, but the
    // 3-day target only becomes crossed while the app is "away".
    const habit = makeHabit({
      date: new Date(Date.now() - 1.5 * 86_400_000).toISOString(),
    })
    saveHabits([habit])
    const firstHour = new Date(Date.now() - 1.5 * 86_400_000 + 3_600_000)
    saveMilestonesForHabit(
      habit.id,
      generateMilestones(habit, firstHour).map((milestone) => ({
        ...milestone,
        reachedAt: null,
      })),
    )

    // Mount while foreground: the 1-day crossing (already behind us) is
    // celebrated in-app — the OS notification covered it in the background,
    // but returning to the app must still celebrate it (RN AppState parity).
    const wrapper = await mountPage()
    expect(wrapper.find('[role="status"]').text()).toContain(
      'Alcohol free for 1 day!',
    )
    await wrapper.find('[role="status"] button').trigger('click')
    await nextTick()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)

    // Background the app: DOM visibility flips hidden, so the live watcher
    // must NOT celebrate while away (the OS notification covers it).
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()

    // Time passes while backgrounded: the 3-day target is crossed, but the
    // in-app queue must stay empty until the app returns.
    if (nowRef.value) nowRef.value.value = new Date(Date.now() + 2 * 86_400_000)
    await nextTick()
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(false)

    // Return to the foreground: the native lifecycle listener re-runs load()
    // and the 3-day crossing is celebrated without a remount.
    foregroundHandlers[0]?.()
    await flushPromises()
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
    expect(text).toContain('€210.00') // 40 × €5.25
    expect(text).toContain('saved')
    expect(text).toContain('✓ 1 day')
    expect(text).toContain('Next: 2 months')
    expect(
      wrapper.find('svg[aria-label="milestone progress"]').exists(),
    ).toBe(true)
    expect(wrapper.find('circle.stroke-success').exists()).toBe(true)
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

  it('keeps the ring empty while milestone data has not loaded yet', () => {
    // Milestones arrive a beat after the habit (async load) — until then the
    // ring must render empty, not full (regression: ringProgress() reported
    // 100% with an empty milestone list and the ring flashed from full).
    const habit = makeHabit({ date: atDaysAgo(40), savings: '5' })

    const wrapper = mount(HabitProgressCard, {
      props: { habit, milestones: [], now: NOW, currency: 'EUR' },
      global: { plugins: [i18n] },
    })

    const bar = wrapper.find('circle.stroke-success')
    expect(bar.exists()).toBe(true)
    // Empty ring: dashoffset equals the full circumference, not 0 (full).
    expect(bar.attributes('stroke-dashoffset')).toBe(
      String(2 * Math.PI * ((74 - 7) / 2)),
    )
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
    expect(text).toContain('€4,888.00')
    expect(text).toContain('since')
    expect(text).toContain('2025')
  })
})
