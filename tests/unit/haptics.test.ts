import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Haptics } from '@capacitor/haptics'
import {
  ImpactStyle,
  NotificationType,
  impact,
  notify,
  vibrate,
} from '../../app/utils/haptics'

// The wrapper's native guard is the only Capacitor touchpoint — flip it to
// exercise both sides of every call.
const { native } = vi.hoisted(() => ({ native: { value: false } }))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.value },
}))

vi.mock('@capacitor/haptics', () => ({
  ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' },
  NotificationType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
    Error: 'ERROR',
  },
  Haptics: {
    impact: vi.fn(async () => {}),
    notification: vi.fn(async () => {}),
    vibrate: vi.fn(async () => {}),
  },
}))

const mocked = vi.mocked(Haptics)

beforeEach(() => {
  native.value = false
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('utils/haptics', () => {
  it('is a silent no-op in the browser (non-native platform)', () => {
    impact()
    notify()
    vibrate()

    expect(mocked.impact).not.toHaveBeenCalled()
    expect(mocked.notification).not.toHaveBeenCalled()
    expect(mocked.vibrate).not.toHaveBeenCalled()
  })

  it('fires a light impact by default on native', () => {
    native.value = true
    impact()

    expect(mocked.impact).toHaveBeenCalledTimes(1)
    expect(mocked.impact).toHaveBeenCalledWith({ style: 'LIGHT' })
  })

  it('passes the requested impact style through', () => {
    native.value = true
    impact(ImpactStyle.Medium)

    expect(mocked.impact).toHaveBeenCalledWith({ style: 'MEDIUM' })
  })

  it('fires success notification feedback by default on native', () => {
    native.value = true
    notify()

    expect(mocked.notification).toHaveBeenCalledTimes(1)
    expect(mocked.notification).toHaveBeenCalledWith({ type: 'SUCCESS' })
  })

  it('passes the requested notification type through', () => {
    native.value = true
    notify(NotificationType.Warning)

    expect(mocked.notification).toHaveBeenCalledWith({ type: 'WARNING' })
  })

  it('passes the vibrate duration through (default 300ms)', () => {
    native.value = true
    vibrate()
    vibrate(150)

    expect(mocked.vibrate).toHaveBeenNthCalledWith(1, { duration: 300 })
    expect(mocked.vibrate).toHaveBeenNthCalledWith(2, { duration: 150 })
  })

  it('never throws when the plugin call rejects', async () => {
    native.value = true
    mocked.impact.mockRejectedValueOnce(new Error('plugin boom'))

    expect(() => impact()).not.toThrow()

    // Let the fire-and-forget rejection settle so an unhandled-rejection
    // failure would surface here instead of after the test.
    await new Promise(resolve => setTimeout(resolve, 0))
  })
})
