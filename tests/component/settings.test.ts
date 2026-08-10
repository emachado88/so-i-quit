// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createI18n } from 'vue-i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import SettingsPage from '../../app/pages/settings.vue'
import { getSettings } from '../../app/utils/settings'
import { installStorageMock, seedStorage } from '../helpers'

// Nuxt auto-imports don't exist in vitest — the page's composable wrappers
// and notification side effects are mocked; persistence flows through the
// real settings utils.
const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  setLocale: vi.fn(),
  requestPermission: vi.fn(async () => false),
  cancelAll: vi.fn(async () => {}),
  permissionStatus: vi.fn(async () => 'undetermined'),
  exactAlarm: vi.fn(async () => true),
  reconcileAll: vi.fn(async () => {}),
}))

vi.mock('../../app/composables/useThemeMode', () => ({
  useThemeMode: () => ({ preference: 'light', setTheme: mocks.setTheme }),
}))

vi.mock('../../app/composables/useLocaleSwitch', () => ({
  useLocaleSwitch: () => ({ setLocale: mocks.setLocale }),
}))

vi.mock('../../app/utils/notifications', () => ({
  requestNotificationPermission: mocks.requestPermission,
  cancelAllMilestoneNotifications: mocks.cancelAll,
  getNotificationPermissionStatus: mocks.permissionStatus,
  checkExactNotificationSetting: mocks.exactAlarm,
  reconcileAllHabitNotifications: mocks.reconcileAll,
}))

installStorageMock()

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requestPermission.mockResolvedValue(false)
})

afterEach(() => {
  document.body.innerHTML = ''
})

const mountPage = async () => {
  const wrapper = mount(SettingsPage, { global: { plugins: [i18n] } })
  await nextTick()
  await flushPromises()
  return wrapper
}

const buttonByLabel = (
  wrapper: Awaited<ReturnType<typeof mountPage>>,
  label: string,
) => wrapper.find(`[aria-label="${label}"]`)

describe('pages/settings', () => {
  it('renders all sections with current values', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text()
    expect(text).toContain('Appearance')
    expect(text).toContain('System')
    expect(text).toContain('Light')
    expect(text).toContain('Dark')
    expect(text).toContain('Language')
    expect(text).toContain('English')
    expect(text).toContain('Currency')
    expect(text).toContain('Milestone notifications')
    expect(text).toContain('So I Quit')
    expect(text).toContain('v0.2.0')
  })

  it('switches the theme: saves + applies through the color-mode wrapper', async () => {
    const wrapper = await mountPage()
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios[0]!.attributes('aria-checked')).toBe('true') // System default

    await radios[2]!.trigger('click') // Dark

    expect(mocks.setTheme).toHaveBeenCalledWith('dark')
    expect(getSettings().theme).toBe('dark')
    expect(radios[2]!.attributes('aria-checked')).toBe('true')
  })

  it('picks a language: persists + switches through the wrapper', async () => {
    const wrapper = await mountPage()
    await buttonByLabel(wrapper, 'Open language picker').trigger('click')

    const options = wrapper.findAll('button')
    expect(options.some((b) => b.text().includes('Português'))).toBe(true)
    expect(options.some((b) => b.text().includes('中文'))).toBe(true)

    await options
      .find((b) => b.text().includes('Português'))!
      .trigger('click')

    expect(mocks.setLocale).toHaveBeenCalledWith('pt')
    expect(getSettings().language).toBe('pt')
    // Picker closed
    expect(
      wrapper.findAll('button').some((b) => b.text().includes('中文')),
    ).toBe(false)
  })

  it('filters the currency picker by search', async () => {
    const wrapper = await mountPage()
    await buttonByLabel(wrapper, 'Open currency picker').trigger('click')

    const search = wrapper.find('#currency-search')
    await search.setValue('dollar')

    const text = wrapper.text()
    expect(text).toContain('USD')
    expect(text).toContain('US Dollar')
    expect(text).not.toContain('€ EUR')
  })

  it('selecting a currency persists it and closes the picker', async () => {
    seedStorage('settings-v1', JSON.stringify({ currency: 'USD' }))
    const wrapper = await mountPage()
    await buttonByLabel(wrapper, 'Open currency picker').trigger('click')

    await wrapper.find('#currency-search').setValue('euro')
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('€ EUR'))!
      .trigger('click')

    expect(getSettings().currency).toBe('EUR')
    expect(wrapper.find('#currency-search').exists()).toBe(false)
  })

  it('shows the denied hint when notification permission is refused', async () => {
    const wrapper = await mountPage()
    await wrapper.find('[role="switch"]').trigger('click')
    await flushPromises()

    expect(mocks.requestPermission).toHaveBeenCalledTimes(1)
    expect(getSettings().milestoneNotificationsEnabled).toBe(false)
    expect(wrapper.text()).toContain(
      'Notifications are turned off in your system settings',
    )
  })

  it('shows the exact-alarm hint when notifications are on and exact alarms are denied', async () => {
    mocks.requestPermission.mockResolvedValue(true)
    mocks.exactAlarm.mockResolvedValue(false)
    const wrapper = await mountPage()

    await wrapper.find('[role="switch"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Open system settings')
    expect(wrapper.text()).toContain(
      'allow exact alarms for So I Quit in system settings',
    )
  })

  it('hides the exact-alarm hint when exact alarms are granted', async () => {
    mocks.requestPermission.mockResolvedValue(true)
    mocks.exactAlarm.mockResolvedValue(true)
    const wrapper = await mountPage()

    await wrapper.find('[role="switch"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Open system settings')
  })

  it('enables notifications when granted and cancels all on disable', async () => {
    mocks.requestPermission.mockResolvedValue(true)
    const wrapper = await mountPage()
    const toggle = wrapper.find('[role="switch"]')

    await toggle.trigger('click')
    await flushPromises()
    expect(getSettings().milestoneNotificationsEnabled).toBe(true)
    expect(toggle.attributes('aria-checked')).toBe('true')

    await toggle.trigger('click')
    await flushPromises()
    expect(mocks.cancelAll).toHaveBeenCalledTimes(1)
    expect(getSettings().milestoneNotificationsEnabled).toBe(false)
  })

  it('shows the currency symbol + code for a seeded currency', async () => {
    seedStorage('settings-v1', JSON.stringify({ currency: 'USD' }))
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('$ USD')
  })
})
