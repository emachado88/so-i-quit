// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  mocks.fetchLatestRelease.mockResolvedValue({ status: 'up-to-date', currentVersion: '1.1.0' })
  mocks.downloadApk.mockResolvedValue('/cache/so-i-quit-1.2.0.apk')
  mocks.installApk.mockResolvedValue(undefined)
})

describe('composables/useUpdateCheck', () => {
  it('starts idle with no banner', () => {
    const update = useUpdateCheck()
    expect(update.state.value).toBe('idle')
    expect(update.bannerVisible.value).toBe(false)
  })

  it('surfaces an available release and shows the banner', async () => {
    mocks.fetchLatestRelease.mockResolvedValue(available)
    const update = useUpdateCheck()

    await expect(update.check('1.1.0', { force: true })).resolves.toBe('available')

    expect(mocks.fetchLatestRelease).toHaveBeenCalledWith('1.1.0')
    expect(mocks.markChecked).toHaveBeenCalledTimes(1)
    expect(update.state.value).toBe('available')
    expect(update.latestVersion.value).toBe('1.2.0')
    expect(update.bannerVisible.value).toBe(true)
  })

  it('reports up-to-date and hides the banner', async () => {
    const update = useUpdateCheck()
    await expect(update.check('1.1.0', { force: true })).resolves.toBe('up-to-date')
    expect(update.state.value).toBe('up-to-date')
    expect(update.bannerVisible.value).toBe(false)
  })

  it('reports a failed check without starting the 24 h window', async () => {
    mocks.fetchLatestRelease.mockResolvedValue({ status: 'error', currentVersion: '1.1.0' })
    const update = useUpdateCheck()

    await expect(update.check('1.1.0', { force: true })).resolves.toBe('error')

    expect(update.state.value).toBe('error')
    expect(update.error.value).toBe('check')
    // An offline boot must not swallow the next attempt.
    expect(mocks.markChecked).not.toHaveBeenCalled()
  })

  it('skips the automatic check while the throttle window is open', async () => {
    mocks.shouldCheck.mockReturnValue(false)
    const update = useUpdateCheck()

    await expect(update.check('1.1.0')).resolves.toBe('skipped')
    expect(mocks.fetchLatestRelease).not.toHaveBeenCalled()
    expect(update.state.value).toBe('idle')
  })

  it('always checks when forced, even inside the throttle window', async () => {
    mocks.shouldCheck.mockReturnValue(false)
    const update = useUpdateCheck()

    await expect(update.check('1.1.0', { force: true })).resolves.toBe('up-to-date')
    expect(mocks.fetchLatestRelease).toHaveBeenCalledTimes(1)
  })

  it('does not interleave two checks', async () => {
    let release: (value: unknown) => void = () => {}
    mocks.fetchLatestRelease.mockImplementation(
      () => new Promise((resolve) => { release = resolve }),
    )
    const update = useUpdateCheck()

    const first = update.check('1.1.0', { force: true })
    await expect(update.check('1.1.0', { force: true })).resolves.toBe('skipped')

    release({ status: 'up-to-date', currentVersion: '1.1.0' })
    await expect(first).resolves.toBe('up-to-date')
    expect(mocks.fetchLatestRelease).toHaveBeenCalledTimes(1)
  })

  it('downloads and installs in-app on Android', async () => {
    mocks.fetchLatestRelease.mockResolvedValue(available)
    const update = useUpdateCheck()
    await update.check('1.1.0', { force: true })

    await expect(update.download()).resolves.toBe('installed')

    expect(mocks.downloadApk).toHaveBeenCalledWith(available.update.downloadUrl, '1.2.0')
    expect(mocks.installApk).toHaveBeenCalledWith('/cache/so-i-quit-1.2.0.apk')
    expect(update.state.value).toBe('installed')
    expect(update.bannerVisible.value).toBe(false)
  })

  it('keeps the update on offer when the download fails', async () => {
    mocks.fetchLatestRelease.mockResolvedValue(available)
    mocks.downloadApk.mockRejectedValueOnce(new Error('HTTP 500'))
    const update = useUpdateCheck()
    await update.check('1.1.0', { force: true })

    await expect(update.download()).resolves.toBe('error')

    expect(update.state.value).toBe('available')
    expect(update.error.value).toBe('download')
    expect(update.bannerVisible.value).toBe(true)
  })

  it('opens the release page when the in-app install is unavailable', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    mocks.isApkInstallSupported.mockReturnValue(false)
    mocks.fetchLatestRelease.mockResolvedValue(available)
    const update = useUpdateCheck()
    await update.check('1.1.0', { force: true })

    await expect(update.download()).resolves.toBe('opened')

    expect(open).toHaveBeenCalledWith(available.update.releaseUrl, '_blank', 'noopener')
    expect(mocks.downloadApk).not.toHaveBeenCalled()
    open.mockRestore()
  })

  it('opens the releases page when the release carries no APK', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    mocks.fetchLatestRelease.mockResolvedValue({
      ...available,
      update: { ...available.update, downloadUrl: null },
    })
    const update = useUpdateCheck()
    await update.check('1.1.0', { force: true })

    await expect(update.download()).resolves.toBe('opened')

    expect(open).toHaveBeenCalledWith(available.update.releaseUrl, '_blank', 'noopener')
    open.mockRestore()
  })

  it('dismisses the banner for the session', async () => {
    mocks.fetchLatestRelease.mockResolvedValue(available)
    const update = useUpdateCheck()
    await update.check('1.1.0', { force: true })
    expect(update.bannerVisible.value).toBe(true)

    update.dismissBanner()
    expect(update.bannerVisible.value).toBe(false)
    expect(update.state.value).toBe('available')
  })

  it('re-surfaces the banner after a fresh check once dismissed', async () => {
    mocks.fetchLatestRelease.mockResolvedValue(available)
    const update = useUpdateCheck()
    await update.check('1.1.0', { force: true })
    update.dismissBanner()

    expect(update.bannerVisible.value).toBe(false)
    await update.check('1.1.0', { force: true })
    expect(update.bannerVisible.value).toBe(true)
  })
})
