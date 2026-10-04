// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../app/i18n/locales/en.json'
import UpdateBanner from '../../app/components/updates/UpdateBanner.vue'

import { useUpdateCheck } from '../../app/composables/useUpdateCheck'

const mocks = vi.hoisted(() => ({
  fetchLatestRelease: vi.fn(),
  shouldCheck: vi.fn(() => true),
  markChecked: vi.fn(),
  isApkInstallSupported: vi.fn(() => true),
  downloadApk: vi.fn(async () => '/cache/so-i-quit-1.2.0.apk'),
  installApk: vi.fn(async () => {}),
}))

vi.mock('../../app/utils/updates', () => ({
  fetchLatestRelease: mocks.fetchLatestRelease,
  shouldCheck: mocks.shouldCheck,
  markChecked: mocks.markChecked,
  RELEASES_PAGE_URL: 'https://github.com/emachado88/so-i-quit/releases/latest',
}))

vi.mock('../../app/utils/update-install', () => ({
  isApkInstallSupported: mocks.isApkInstallSupported,
  downloadApk: mocks.downloadApk,
  installApk: mocks.installApk,
}))

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })

const available = {
  status: 'available' as const,
  currentVersion: '1.1.0',
  update: {
    version: '1.2.0',
    downloadUrl: 'https://example.test/so-i-quit-1.2.0-release.apk',
    releaseUrl: 'https://example.test/releases/v1.2.0',
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  useUpdateCheck().reset()
  mocks.shouldCheck.mockReturnValue(true)
  mocks.isApkInstallSupported.mockReturnValue(true)
  mocks.fetchLatestRelease.mockResolvedValue(available)
  mocks.downloadApk.mockResolvedValue('/cache/so-i-quit-1.2.0.apk')
  mocks.installApk.mockResolvedValue(undefined)
})

afterEach(() => {
  document.body.innerHTML = ''
})

const mountBanner = () => mount(UpdateBanner, { global: { plugins: [i18n] } })

const buttonByText = (wrapper: ReturnType<typeof mountBanner>, text: string) =>
  wrapper.findAll('button').find(b => b.text() === text)

describe('components/updates/UpdateBanner', () => {
  it('renders nothing while idle', () => {
    const wrapper = mountBanner()
    expect(wrapper.text()).toBe('')
    wrapper.unmount()
  })

  it('shows the available version once a check finds one', async () => {
    const wrapper = mountBanner()
    await useUpdateCheck().check('1.1.0', { force: true })
    await flushPromises()

    expect(wrapper.text()).toContain('Update available')
    expect(wrapper.text()).toContain('Version 1.2.0 is ready to install.')
    expect(buttonByText(wrapper, 'Download')).toBeTruthy()
    wrapper.unmount()
  })

  it('downloading shows the busy label and hides the banner on success', async () => {
    const wrapper = mountBanner()
    await useUpdateCheck().check('1.1.0', { force: true })
    await flushPromises()

    await buttonByText(wrapper, 'Download')!.trigger('click')
    await flushPromises()

    expect(mocks.downloadApk).toHaveBeenCalledWith(available.update.downloadUrl, '1.2.0')
    expect(mocks.installApk).toHaveBeenCalledWith('/cache/so-i-quit-1.2.0.apk')
    expect(wrapper.text()).toBe('')
    wrapper.unmount()
  })

  it('keeps the banner and reports a failed download', async () => {
    mocks.downloadApk.mockRejectedValueOnce(new Error('HTTP 500'))
    const wrapper = mountBanner()
    await useUpdateCheck().check('1.1.0', { force: true })
    await flushPromises()

    await buttonByText(wrapper, 'Download')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Download failed. Please try again.')
    // Still on offer for a retry.
    expect(buttonByText(wrapper, 'Download')).toBeTruthy()
    wrapper.unmount()
  })

  it('dismisses through the close button', async () => {
    const wrapper = mountBanner()
    await useUpdateCheck().check('1.1.0', { force: true })
    await flushPromises()
    expect(wrapper.text()).toContain('Update available')

    await wrapper.find('[aria-label="Dismiss"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toBe('')
    wrapper.unmount()
  })
})
