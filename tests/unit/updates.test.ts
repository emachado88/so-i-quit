import { describe, expect, it, vi } from 'vitest'

import {
  fetchLatestRelease,
  getLastCheckAt,
  markChecked,
  parseRelease,
  pickApkAsset,
  resetUpdateCheck,
  shouldCheck,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_CHECK_KEY,
  type GitHubRelease,
} from '../../app/utils/updates'
import { installStorageMock, seedStorage } from '../helpers'

installStorageMock()

const releaseApk = {
  name: 'so-i-quit-1.2.0-release.apk',
  browser_download_url: 'https://example.test/release.apk',
}
const previewApk = {
  name: 'so-i-quit-1.2.0-preview.apk',
  browser_download_url: 'https://example.test/preview.apk',
}

const release = (overrides: Partial<GitHubRelease> = {}): GitHubRelease => ({
  tag_name: 'v1.2.0',
  html_url: 'https://github.com/emachado88/so-i-quit/releases/tag/v1.2.0',
  draft: false,
  prerelease: false,
  assets: [releaseApk],
  ...overrides,
})

const jsonResponse = (body: unknown, ok = true) =>
  vi.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch

describe('utils/updates › pickApkAsset', () => {
  it('prefers the signed release build over a preview', () => {
    expect(pickApkAsset({ assets: [previewApk, releaseApk] })).toBe(releaseApk)
  })

  it('falls back to any APK when no release build is present', () => {
    expect(pickApkAsset({ assets: [previewApk] })).toBe(previewApk)
  })

  it('ignores non-APK assets (the simulator archive)', () => {
    expect(
      pickApkAsset({
        assets: [
          {
            name: 'so-i-quit-1.2.0-simulator.app.tar.gz',
            browser_download_url: 'https://example.test/sim.tar.gz',
          },
        ],
      }),
    ).toBeNull()
    expect(pickApkAsset({})).toBeNull()
  })
})

describe('utils/updates › parseRelease', () => {
  it('reports a newer release with its APK url', () => {
    const result = parseRelease(release(), '1.1.0')
    expect(result.status).toBe('available')
    if (result.status !== 'available') throw new Error('unreachable')
    expect(result.update.version).toBe('1.2.0')
    expect(result.update.downloadUrl).toBe('https://example.test/release.apk')
    expect(result.update.releaseUrl).toContain('/releases/tag/v1.2.0')
  })

  it('leaves downloadUrl null when the release carries no APK', () => {
    const result = parseRelease(release({ assets: [] }), '1.1.0')
    if (result.status !== 'available') throw new Error('unreachable')
    expect(result.update.downloadUrl).toBeNull()
  })

  it('falls back to the releases page when html_url is missing', () => {
    const result = parseRelease(release({ html_url: undefined }), '1.1.0')
    if (result.status !== 'available') throw new Error('unreachable')
    expect(result.update.releaseUrl).toContain('github.com/emachado88/so-i-quit')
  })

  it('is up to date for the same or an older version', () => {
    expect(parseRelease(release({ tag_name: 'v1.1.0' }), '1.1.0').status).toBe('up-to-date')
    expect(parseRelease(release({ tag_name: 'v1.0.0' }), '1.1.0').status).toBe('up-to-date')
  })

  it('never offers a draft, a prerelease or an untagged payload', () => {
    expect(parseRelease(release({ draft: true }), '1.1.0').status).toBe('up-to-date')
    expect(parseRelease(release({ prerelease: true }), '1.1.0').status).toBe('up-to-date')
    expect(parseRelease(release({ tag_name: '' }), '1.1.0').status).toBe('up-to-date')
  })
})

describe('utils/updates › fetchLatestRelease', () => {
  it('parses a successful response', async () => {
    const result = await fetchLatestRelease('1.1.0', jsonResponse(release()))
    expect(result.status).toBe('available')
  })

  it('maps a non-OK response to error', async () => {
    const result = await fetchLatestRelease('1.1.0', jsonResponse({}, false))
    expect(result.status).toBe('error')
  })

  it('maps a transport failure to error (never throws)', async () => {
    const failing = vi.fn(async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    await expect(fetchLatestRelease('1.1.0', failing)).resolves.toEqual({
      status: 'error',
      currentVersion: '1.1.0',
    })
  })

  it('maps a malformed payload to error', async () => {
    const bad = vi.fn(async () => ({
      ok: true,
      json: async () => {
        throw new Error('not json')
      },
    })) as unknown as typeof fetch
    expect((await fetchLatestRelease('1.1.0', bad)).status).toBe('error')
  })
})

describe('utils/updates › throttle', () => {
  it('is due when never checked', () => {
    expect(getLastCheckAt()).toBe(0)
    expect(shouldCheck()).toBe(true)
  })

  it('is not due again within the interval', () => {
    const now = 1_700_000_000_000
    markChecked(now)
    expect(getLastCheckAt()).toBe(now)
    expect(shouldCheck(now + UPDATE_CHECK_INTERVAL_MS - 1)).toBe(false)
    expect(shouldCheck(now + UPDATE_CHECK_INTERVAL_MS)).toBe(true)
  })

  it('ignores a corrupt stored value', () => {
    seedStorage(UPDATE_CHECK_KEY, '{oops')
    expect(getLastCheckAt()).toBe(0)
    seedStorage(UPDATE_CHECK_KEY, JSON.stringify({ checkedAt: 'nope' }))
    expect(getLastCheckAt()).toBe(0)
  })

  it('can be reset (forced check)', () => {
    markChecked()
    resetUpdateCheck()
    expect(getLastCheckAt()).toBe(0)
  })
})
