import { describe, expect, it, vi } from 'vitest'

import {
  backupFilename,
  exportBackupNative,
  isNativeBackupPlatform,
} from '../../app/utils/backup-platform'

// Flip the native flag per test to exercise both sides of the bridge.
const { native } = vi.hoisted(() => ({ native: { value: false } }))
const { writeFile, share } = vi.hoisted(() => ({
  writeFile: vi.fn(async () => ({ uri: 'file:///cache/so-i-quit-backup.json' })),
  share: vi.fn(async () => {}),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.value },
}))

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'UTF8' },
  Filesystem: { writeFile },
}))

vi.mock('@capacitor/share', () => ({
  Share: { share },
}))

describe('backup-platform', () => {
  it('isNativeBackupPlatform delegates to Capacitor.isNativePlatform', () => {
    native.value = false
    expect(isNativeBackupPlatform()).toBe(false)
    native.value = true
    expect(isNativeBackupPlatform()).toBe(true)
  })

  it('backupFilename formats a local timestamp as YYYYMMDDHHMMSS', () => {
    const now = new Date(2026, 7, 14, 9, 5, 3) // Aug 14 2026 09:05:03
    expect(backupFilename(now)).toBe('so-i-quit-backup-20260814090503.json')
  })

  it('exportBackupNative writes the JSON to the cache dir and shares it', async () => {
    native.value = true
    await exportBackupNative('{"version":1}', 'Save or share your backup')

    expect(writeFile).toHaveBeenCalledWith({
      path: expect.stringMatching(/^so-i-quit-backup-\d{14}\.json$/),
      data: '{"version":1}',
      directory: 'CACHE',
      encoding: 'UTF8',
    })
    expect(share).toHaveBeenCalledWith({
      url: 'file:///cache/so-i-quit-backup.json',
      // Title carries the timestamped filename; dialog title is the
      // caller-provided (localized) string.
      title: expect.stringMatching(/^so-i-quit-backup-\d{14}\.json$/),
      dialogTitle: 'Save or share your backup',
    })
  })
})
