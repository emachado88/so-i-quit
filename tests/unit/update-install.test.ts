import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  apkFilename,
  downloadApk,
  installApk,
  isApkInstallSupported,
} from '../../app/utils/update-install'

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => true),
  getPlatform: vi.fn(() => 'android'),
  isPluginAvailable: vi.fn(() => true),
  download: vi.fn(async () => ({ path: '/cache/so-i-quit-1.2.0.apk' })),
  install: vi.fn(async () => {}),
}))

// The real @capacitor/core module needs a WebView bridge; the plugin wrapper
// only ever reads the three platform guards + the two plugin methods.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
    getPlatform: mocks.getPlatform,
    isPluginAvailable: mocks.isPluginAvailable,
  },
  registerPlugin: () => ({ download: mocks.download, install: mocks.install }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.isNativePlatform.mockReturnValue(true)
  mocks.getPlatform.mockReturnValue('android')
  mocks.isPluginAvailable.mockReturnValue(true)
  mocks.download.mockResolvedValue({ path: '/cache/so-i-quit-1.2.0.apk' })
})

describe('utils/update-install', () => {
  it('names the cached APK after the version', () => {
    expect(apkFilename('1.2.0')).toBe('so-i-quit-1.2.0.apk')
    expect(apkFilename('')).toBe('so-i-quit-update.apk')
  })

  it('is supported only on native Android with the plugin registered', () => {
    expect(isApkInstallSupported()).toBe(true)

    mocks.getPlatform.mockReturnValue('ios')
    expect(isApkInstallSupported()).toBe(false)

    mocks.getPlatform.mockReturnValue('android')
    mocks.isNativePlatform.mockReturnValue(false)
    expect(isApkInstallSupported()).toBe(false)

    mocks.isNativePlatform.mockReturnValue(true)
    mocks.isPluginAvailable.mockReturnValue(false)
    expect(isApkInstallSupported()).toBe(false)
  })

  it('downloads through the plugin with the versioned filename', async () => {
    await expect(downloadApk('https://example.test/app.apk', '1.2.0')).resolves.toBe(
      '/cache/so-i-quit-1.2.0.apk',
    )
    expect(mocks.download).toHaveBeenCalledWith({
      url: 'https://example.test/app.apk',
      filename: 'so-i-quit-1.2.0.apk',
    })
  })

  it('propagates a download failure to the caller', async () => {
    mocks.download.mockRejectedValueOnce(new Error('HTTP 500'))
    await expect(downloadApk('https://example.test/app.apk', '1.2.0')).rejects.toThrow(
      'HTTP 500',
    )
  })

  it('hands the cached path to the installer', async () => {
    await installApk('/cache/so-i-quit-1.2.0.apk')
    expect(mocks.install).toHaveBeenCalledWith({ path: '/cache/so-i-quit-1.2.0.apk' })
  })
})
