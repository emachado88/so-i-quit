// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, type ComponentPublicInstance } from 'vue'
import { createI18n } from 'vue-i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import { resetExactAlarmPrompt } from '../../app/composables/useExactAlarmPrompt'
import SettingsPage from '../../app/pages/settings.vue'
import { BACKUP_VERSION, exportToFile } from '../../app/utils/backup'
import { handleBackButton } from '../../app/utils/back-handler'
import { getHabits } from '../../app/utils/habits'
import { getSettings } from '../../app/utils/settings'
import { STORAGE_KEYS } from '../../app/utils/storage'
import { installStorageMock, seedStorage } from '../helpers'

// Nuxt auto-imports don't exist in vitest — the page's composable wrappers
// and notification side effects are mocked; persistence flows through the
// real settings utils.
const mocks = vi.hoisted(() => {
  const foregroundCallback: { current: (() => void) | null } = { current: null }
  const foreground = vi.fn((cb: () => void) => {
    foregroundCallback.current = cb
    return { remove: vi.fn() }
  })
  return {
    setTheme: vi.fn(),
    setLocale: vi.fn(),
    requestPermission: vi.fn(async () => false),
    cancelAll: vi.fn(async () => {}),
    permissionStatus: vi.fn(async () => 'undetermined'),
    exactAlarm: vi.fn(async () => true),
    reconcileAll: vi.fn(async () => {}),
    isNative: vi.fn(() => false),
    exportNative: vi.fn(async () => {}),
    filename: vi.fn(() => 'so-i-quit-backup-test.json'),
    openExactSettings: vi.fn(async () => {}),
    foreground,
    foregroundCallback,
  }
})

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
  openExactNotificationSettings: mocks.openExactSettings,
  addAppForegroundListener: mocks.foreground,
}))

// The platform bridge touches Capacitor plugins — stubbed so the real
// modules never load in the test env (same pattern as notifications).
vi.mock('../../app/utils/backup-platform', () => ({
  backupFilename: mocks.filename,
  isNativeBackupPlatform: mocks.isNative,
  exportBackupNative: mocks.exportNative,
}))

// settings.vue reads the app version via useRuntimeConfig (Nuxt injects it
// from package.json); the real nuxt/app module needs the Nuxt build context,
// so it's fully stubbed like in the other component tests.
vi.mock('nuxt/app', () => ({
  useRuntimeConfig: () => ({ public: { appVersion: '1.1.0' } }),
}))

installStorageMock()

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requestPermission.mockResolvedValue(false)
  mocks.isNative.mockReturnValue(false)
  mocks.permissionStatus.mockResolvedValue('undetermined')
  mocks.exactAlarm.mockResolvedValue(true)
})

// Tracked so afterEach can unmount — the pickers register/unregister back
// handlers on visible, and leaking mounted wrappers between tests would
// leak handlers into the shared stack.
type PageWrapper = VueWrapper<ComponentPublicInstance>
const wrappers: PageWrapper[] = []

afterEach(() => {
  document.body.innerHTML = ''
  sessionStorage.clear()
  resetExactAlarmPrompt()
  for (const w of wrappers.splice(0)) w.unmount()
})

const mountPage = async (): Promise<PageWrapper> => {
  const wrapper = mount(SettingsPage, { global: { plugins: [i18n] } })
  await nextTick()
  await flushPromises()
  wrappers.push(wrapper)
  return wrapper
}

const buttonByLabel = (wrapper: PageWrapper, label: string) =>
  wrapper.find(`[aria-label="${label}"]`)

/** Simulate picking a backup file through the hidden input. */
const selectFile = async (wrapper: PageWrapper, content: string): Promise<void> => {
  const input = wrapper.find('input[type="file"]')
  const file = new File([content], 'so-i-quit-backup.json', {
    type: 'application/json',
  })
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  })
  await input.trigger('change')
  // happy-dom processes FileReader events asynchronously — poll until the
  // component reached the outcome (dialog or snackbar) instead of relying
  // on a fixed wait.
  await vi.waitFor(() => {
    const text = wrapper.text()
    expect(
      text.includes('Restore backup?')
      || text.includes('not a valid')
      || text.includes('Backup restored.'),
    ).toBe(true)
  })
}

const buttonByText = (wrapper: PageWrapper, text: string) =>
  wrapper.findAll('button').find(b => b.text() === text)!

const importedSettings = {
  theme: 'dark',
  language: 'pt',
  currency: 'EUR',
  milestoneNotificationsEnabled: true,
  milestoneNotificationsPrompted: true,
} as const

const importedBackupJson = (): string =>
  exportToFile({
    version: BACKUP_VERSION,
    exportedAt: '2026-08-14T12:00:00.000Z',
    habits: [
      {
        id: 'h1',
        name: 'Tobacco',
        date: '2026-01-01T10:00:00.000Z',
        savings: '5.50',
      },
    ],
    milestones: {},
    settings: importedSettings,
  })

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
    expect(text).toContain('v1.1.0')
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
    expect(options.some(b => b.text().includes('Português'))).toBe(true)
    expect(options.some(b => b.text().includes('中文'))).toBe(true)

    await options
      .find(b => b.text().includes('Português'))!
      .trigger('click')

    expect(mocks.setLocale).toHaveBeenCalledWith('pt')
    expect(getSettings().language).toBe('pt')
    // Picker closed
    expect(
      wrapper.findAll('button').some(b => b.text().includes('中文')),
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
      .find(b => b.text().includes('€ EUR'))!
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
    // The dialog only re-asks after an action (import); a plain mount or
    // toggle must not pop it — the hint is enough.
    expect(wrapper.text()).not.toContain('Allow exact alarms?')
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
    // Enabling schedules immediately — not on the next Progress boot.
    expect(mocks.reconcileAll).toHaveBeenCalledTimes(1)

    await toggle.trigger('click')
    await flushPromises()
    expect(mocks.cancelAll).toHaveBeenCalledTimes(1)
    expect(getSettings().milestoneNotificationsEnabled).toBe(false)
  })

  it('shows the toggle off when the OS revoked permission but the pref is on', async () => {
    // User enabled notifications earlier (pref on), then revoked them in
    // system settings. The toggle must reflect the effective state.
    seedStorage('settings-v1', JSON.stringify({ milestoneNotificationsEnabled: true }))
    mocks.permissionStatus.mockResolvedValue('denied')
    const wrapper = await mountPage()
    const toggle = wrapper.find('[role="switch"]')

    expect(getSettings().milestoneNotificationsEnabled).toBe(true)
    expect(toggle.attributes('aria-checked')).toBe('false')
  })

  it('keeps the pref on when the OS revoked permission (restore re-enables)', async () => {
    seedStorage('settings-v1', JSON.stringify({ milestoneNotificationsEnabled: true }))
    mocks.permissionStatus.mockResolvedValue('denied')
    const wrapper = await mountPage()
    expect(getSettings().milestoneNotificationsEnabled).toBe(true)

    // OS permission restored while the pref is still on.
    mocks.permissionStatus.mockResolvedValue('granted')
    mocks.foregroundCallback.current?.()
    await flushPromises()

    expect(mocks.reconcileAll).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('true')
  })

  it('re-checks the OS permission when the app returns to the foreground', async () => {
    seedStorage('settings-v1', JSON.stringify({ milestoneNotificationsEnabled: true }))
    mocks.permissionStatus.mockResolvedValue('granted')
    const wrapper = await mountPage()
    expect(mocks.foreground).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('true')

    // User revokes notifications in system settings and comes back.
    mocks.permissionStatus.mockResolvedValue('denied')
    mocks.foregroundCallback.current?.()
    await flushPromises()

    // OS revoked → toggle flips off (and pending schedules were cancelled).
    expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('false')
    expect(mocks.cancelAll).toHaveBeenCalledTimes(1)
  })

  it('shows the currency symbol + code for a seeded currency', async () => {
    seedStorage('settings-v1', JSON.stringify({ currency: 'USD' }))
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('$ USD')
  })

  // ── Data backup (export / import) ──

  it('renders the data section with export and import actions', async () => {
    const wrapper = await mountPage()
    const text = wrapper.text()
    expect(text).toContain('Export data')
    expect(text).toContain('Import data')
    expect(text).toContain(
      'Export your data as a backup file, or restore a previous backup.',
    )
  })

  it('export downloads the backup file on web', async () => {
    seedStorage(
      STORAGE_KEYS.habits,
      JSON.stringify([
        { id: 'h1', name: 'Tobacco', date: '2026-01-01T10:00:00.000Z', savings: '5.50' },
      ]),
    )
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock')
    const revokeSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Export data').trigger('click')
    await flushPromises()

    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeSpy).toHaveBeenCalledTimes(1)
    // Success snackbar confirms the export (green variant).
    expect(wrapper.text()).toContain('Backup exported.')
    expect(wrapper.find('[role="alert"]').classes()).toContain('bg-primary')
  })

  it('export failure surfaces a snackbar', async () => {
    mocks.isNative.mockReturnValue(true)
    mocks.exportNative.mockRejectedValueOnce(new Error('share failed'))

    const wrapper = await mountPage()
    await buttonByText(wrapper, 'Export data').trigger('click')
    await flushPromises()

    expect(mocks.exportNative).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Export failed. Please try again.')
  })

  it('imports a valid backup after confirmation and reconciles notifications', async () => {
    mocks.permissionStatus.mockResolvedValue('granted')
    seedStorage(
      STORAGE_KEYS.habits,
      JSON.stringify([
        { id: 'old', name: 'Old habit', date: '2026-01-01T00:00:00.000Z', savings: '1' },
      ]),
    )
    const wrapper = await mountPage()

    await selectFile(wrapper, importedBackupJson())
    expect(wrapper.text()).toContain('Restore backup?')

    await buttonByText(wrapper, 'Restore').trigger('click')
    await flushPromises()

    expect(getHabits().map(h => h.id)).toEqual(['h1'])
    expect(getSettings().theme).toBe('dark')
    expect(getSettings().language).toBe('pt')
    // Stale schedules cleared, then rebuilt from the imported dataset.
    expect(mocks.cancelAll).toHaveBeenCalledTimes(1)
    expect(mocks.reconcileAll).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Backup restored.')
    // Success snackbar renders the positive (green) variant, not the error red.
    expect(wrapper.find('[role="alert"]').classes()).toContain('bg-primary')
    // The imported settings carry language 'pt' while the page runs 'en' —
    // the locale lives in the URL, so the import must switch it explicitly.
    expect(mocks.setLocale).toHaveBeenCalledWith('pt')
    // …and theme 'dark' — the selector reads the settings ref, but the
    // live theme only changes via the color-mode wrapper.
    expect(mocks.setTheme).toHaveBeenCalledWith('dark')
  })

  it('import keeps the current language when the backup matches it', async () => {
    const json = exportToFile({
      version: BACKUP_VERSION,
      exportedAt: '2026-08-14T12:00:00.000Z',
      habits: [],
      milestones: {},
      settings: { ...importedSettings, language: 'en' },
    })
    const wrapper = await mountPage()

    await selectFile(wrapper, json)
    await buttonByText(wrapper, 'Restore').trigger('click')
    await flushPromises()

    expect(mocks.setLocale).not.toHaveBeenCalled()
    expect(getSettings().language).toBe('en')
  })

  it('import with notifications disabled clears schedules but does not reconcile', async () => {
    const json = exportToFile({
      version: BACKUP_VERSION,
      exportedAt: '2026-08-14T12:00:00.000Z',
      habits: [],
      milestones: {},
      settings: { ...importedSettings, milestoneNotificationsEnabled: false },
    })
    const wrapper = await mountPage()

    await selectFile(wrapper, json)
    await buttonByText(wrapper, 'Restore').trigger('click')
    await flushPromises()

    expect(mocks.cancelAll).toHaveBeenCalledTimes(1)
    expect(mocks.reconcileAll).not.toHaveBeenCalled()
    expect(getSettings().milestoneNotificationsEnabled).toBe(false)
  })

  it('import re-asks the OS permission when the imported settings enable notifications but the system revoked it', async () => {
    mocks.permissionStatus.mockResolvedValue('denied')
    mocks.requestPermission.mockResolvedValue(false)
    const wrapper = await mountPage()

    await selectFile(wrapper, importedBackupJson())
    await buttonByText(wrapper, 'Restore').trigger('click')
    await flushPromises()

    // Re-prompted, refused → preference stays on (RN parity), hint shown,
    // schedules stay dead, no exact-alarm re-ask.
    expect(mocks.requestPermission).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain(
      'Notifications are turned off in your system settings',
    )
    expect(mocks.cancelAll).toHaveBeenCalledTimes(1)
    expect(mocks.reconcileAll).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('Allow exact alarms?')
  })

  it('import proceeds when the re-asked OS permission is granted', async () => {
    mocks.permissionStatus.mockResolvedValue('denied')
    mocks.requestPermission.mockResolvedValue(true)
    const wrapper = await mountPage()

    await selectFile(wrapper, importedBackupJson())
    await buttonByText(wrapper, 'Restore').trigger('click')
    await flushPromises()

    expect(mocks.requestPermission).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain(
      'Notifications are turned off in your system settings',
    )
    expect(mocks.reconcileAll).toHaveBeenCalledTimes(1)
  })

  it('fresh install import: asks the permission when undetermined, schedules after grant, then re-asks exact alarms', async () => {
    // Fresh install: permission never asked → status 'undetermined'.
    mocks.permissionStatus.mockResolvedValue('undetermined')
    mocks.requestPermission.mockResolvedValue(true)
    mocks.exactAlarm.mockResolvedValue(false)
    const wrapper = await mountPage()

    await selectFile(wrapper, importedBackupJson())
    await buttonByText(wrapper, 'Restore').trigger('click')
    await flushPromises()

    expect(mocks.requestPermission).toHaveBeenCalledTimes(1)
    // Schedules are built only after the permission is confirmed…
    expect(mocks.reconcileAll).toHaveBeenCalledTimes(1)
    // …and the exact-alarm dialog re-asks (not just the passive hint).
    expect(wrapper.text()).toContain('Allow exact alarms?')
  })

  it('import re-asks exact alarms when granted by the OS but denied by the system special access', async () => {
    mocks.permissionStatus.mockResolvedValue('granted')
    mocks.exactAlarm.mockResolvedValue(false)
    const wrapper = await mountPage()

    await selectFile(wrapper, importedBackupJson())
    await buttonByText(wrapper, 'Restore').trigger('click')
    await flushPromises()

    // Schedules built (inexact) + the exact-alarm dialog re-asks.
    expect(mocks.reconcileAll).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Allow exact alarms?')

    // "Go to settings" opens the OS screen; the dialog stays open.
    await buttonByText(wrapper, 'Go to settings').trigger('click')
    await flushPromises()
    expect(mocks.openExactSettings).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Allow exact alarms?')

    // User grants the special access and returns to the app: the dialog
    // dismisses and every schedule is rebuilt as exact.
    mocks.exactAlarm.mockResolvedValue(true)
    mocks.foregroundCallback.current?.()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Allow exact alarms?')
    expect(mocks.cancelAll).toHaveBeenCalledTimes(2)
    expect(mocks.reconcileAll).toHaveBeenCalledTimes(2)
  })

  it('exact-alarm re-ask survives the foreground events around the OS permission prompt', async () => {
    // The OS permission dialog backgrounds/foregrounds the app while the
    // request is pending and right after the grant — neither event may
    // swallow the queued exact-alarm re-ask.
    mocks.permissionStatus.mockResolvedValue('undetermined')
    mocks.requestPermission.mockResolvedValue(true)
    mocks.exactAlarm.mockResolvedValue(false)
    const wrapper = await mountPage()

    await selectFile(wrapper, importedBackupJson())
    await buttonByText(wrapper, 'Restore').trigger('click')
    mocks.foregroundCallback.current?.()
    await flushPromises()
    mocks.foregroundCallback.current?.()
    await flushPromises()

    expect(wrapper.text()).toContain('Allow exact alarms?')
  })

  it('exact-alarm re-ask still shows when the schedule rebuild fails', async () => {
    mocks.permissionStatus.mockResolvedValue('granted')
    mocks.exactAlarm.mockResolvedValue(false)
    mocks.reconcileAll.mockRejectedValueOnce(new Error('schedule failed'))
    const wrapper = await mountPage()

    await selectFile(wrapper, importedBackupJson())
    await buttonByText(wrapper, 'Restore').trigger('click')
    await flushPromises()

    // The re-ask is queued before the rebuild, so a scheduling failure
    // cannot skip it.
    expect(wrapper.text()).toContain('Allow exact alarms?')
  })

  it('exact-alarm dialog skip dismisses it (schedules stay inexact)', async () => {
    mocks.permissionStatus.mockResolvedValue('granted')
    mocks.exactAlarm.mockResolvedValue(false)
    const wrapper = await mountPage()

    await selectFile(wrapper, importedBackupJson())
    await buttonByText(wrapper, 'Restore').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Allow exact alarms?')

    await buttonByText(wrapper, 'Skip').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Allow exact alarms?')
    expect(mocks.reconcileAll).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem('pending-exact-reask')).toBeNull()
  })

  it('re-surfaces the exact re-ask on mount when the page was re-created mid-import', async () => {
    // The import queued the re-ask on a page instance that was then
    // re-created (e.g. locale switch) — the sessionStorage flag survives.
    sessionStorage.setItem('pending-exact-reask', '1')
    seedStorage(
      'settings-v1',
      JSON.stringify({ milestoneNotificationsEnabled: true }),
    )
    mocks.exactAlarm.mockResolvedValue(false)
    const wrapper = await mountPage()
    await flushPromises()

    expect(wrapper.text()).toContain('Allow exact alarms?')
    expect(sessionStorage.getItem('pending-exact-reask')).toBeNull()
  })

  it('keeps the exact re-ask across a page re-creation (remount)', async () => {
    mocks.permissionStatus.mockResolvedValue('granted')
    mocks.exactAlarm.mockResolvedValue(false)
    const a = await mountPage()
    await selectFile(a, importedBackupJson())
    await buttonByText(a, 'Restore').trigger('click')
    await flushPromises()
    expect(a.text()).toContain('Allow exact alarms?')

    // Page re-created mid-chain (tab switch / locale navigation): the new
    // instance binds the same module-level state — no tab dance needed.
    a.unmount()
    const b = await mountPage()
    expect(b.text()).toContain('Allow exact alarms?')
  })

  it('rejects an invalid backup file without writing anything', async () => {
    seedStorage(
      STORAGE_KEYS.habits,
      JSON.stringify([
        { id: 'keep', name: 'Keep me', date: '2026-01-01T00:00:00.000Z', savings: '1' },
      ]),
    )
    const wrapper = await mountPage()

    await selectFile(wrapper, '{not json')

    expect(wrapper.text()).toContain(
      'This file is not a valid So I Quit backup.',
    )
    expect(wrapper.text()).not.toContain('Restore backup?')
    expect(getHabits().map(h => h.id)).toEqual(['keep'])
    // Error snackbar keeps the danger (red) variant.
    expect(wrapper.find('[role="alert"]').classes()).toContain('bg-danger')
  })

  it('cancelling the import dialog writes nothing', async () => {
    seedStorage(
      STORAGE_KEYS.habits,
      JSON.stringify([
        { id: 'keep', name: 'Keep me', date: '2026-01-01T00:00:00.000Z', savings: '1' },
      ]),
    )
    const wrapper = await mountPage()

    await selectFile(wrapper, importedBackupJson())
    await buttonByText(wrapper, 'Cancel').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('Restore backup?')
    expect(getHabits().map(h => h.id)).toEqual(['keep'])
    expect(mocks.cancelAll).not.toHaveBeenCalled()
    expect(mocks.reconcileAll).not.toHaveBeenCalled()
  })

  // ── Hardware back (Android) ──
  //
  // handleBackButton() is the real util: the pickers register on visible,
  // so these tests exercise the actual wiring.

  it('hardware back dismisses the currency picker', async () => {
    seedStorage('settings-v1', JSON.stringify({ currency: 'EUR' }))
    const wrapper = await mountPage()
    await buttonByLabel(wrapper, 'Open currency picker').trigger('click')
    expect(wrapper.find('#currency-search').exists()).toBe(true)

    expect(handleBackButton()).toBe(true)
    await nextTick()

    expect(wrapper.find('#currency-search').exists()).toBe(false)
    expect(getSettings().currency).toBe('EUR') // untouched
  })

  it('hardware back dismisses the language picker', async () => {
    const wrapper = await mountPage()
    await buttonByLabel(wrapper, 'Open language picker').trigger('click')
    expect(wrapper.text()).toContain('中文')

    expect(handleBackButton()).toBe(true)
    await nextTick()

    expect(wrapper.text()).not.toContain('中文')
    expect(getSettings().language).toBe('en') // untouched
  })
})
