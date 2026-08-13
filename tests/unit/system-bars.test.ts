import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { applySystemBarTheme } from '../../app/utils/system-bars'

// Flip the native guard to exercise both sides of every call; the plugin
// impl is swappable so the "plugin missing" path can be tested too.
const { native, platform, available, impl } = vi.hoisted(() => ({
  native: { value: false },
  platform: { value: 'android' },
  available: { value: true },
  impl: {
    setTheme: undefined as undefined | ((o: { dark: boolean }) => Promise<void>),
  },
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => native.value,
    getPlatform: () => platform.value,
    isPluginAvailable: () => available.value,
  },
  // Mirrors the native-bridge proxy: an unregistered plugin rejects when
  // called (that is what the wrapper's try/catch absorbs).
  registerPlugin: () => ({
    setTheme: (opts: { dark: boolean }) => {
      if (!impl.setTheme) {
        return Promise.reject(new Error(`Native: SystemBars plugin not registered`))
      }
      return impl.setTheme(opts)
    },
  }),
}))

const { setStyle } = vi.hoisted(() => ({ setStyle: vi.fn(async () => {}) }))

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: { setStyle },
  Style: { Dark: 'DARK', Light: 'LIGHT' },
}))

const setTheme = vi.fn(async () => {})

beforeEach(() => {
  native.value = false
  platform.value = 'android'
  available.value = true
  impl.setTheme = setTheme
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('utils/system-bars', () => {
  it('is a silent no-op in the browser (non-native platform)', async () => {
    await applySystemBarTheme(true)
    await applySystemBarTheme(false)

    expect(setTheme).not.toHaveBeenCalled()
    expect(setStyle).not.toHaveBeenCalled()
  })

  describe('Android (SystemBars plugin)', () => {
    it('is a silent no-op when the plugin is not registered', async () => {
      native.value = true
      available.value = false

      await expect(applySystemBarTheme(true)).resolves.toBeUndefined()
      expect(setTheme).not.toHaveBeenCalled()
    })

    it('absorbs the native rejection when the plugin is missing at call time', async () => {
      native.value = true
      impl.setTheme = undefined

      await expect(applySystemBarTheme(true)).resolves.toBeUndefined()
    })

    it('asks for light icons (dark scrim) when the app is dark', async () => {
      native.value = true

      await applySystemBarTheme(true)

      expect(setTheme).toHaveBeenCalledTimes(1)
      expect(setTheme).toHaveBeenCalledWith({ dark: true })
      expect(setStyle).not.toHaveBeenCalled()
    })

    it('asks for dark icons (light scrim) when the app is light', async () => {
      native.value = true

      await applySystemBarTheme(false)

      expect(setTheme).toHaveBeenCalledTimes(1)
      expect(setTheme).toHaveBeenCalledWith({ dark: false })
    })

    it('never throws when the plugin call rejects', async () => {
      native.value = true
      setTheme.mockRejectedValueOnce(new Error('plugin boom'))

      await expect(applySystemBarTheme(true)).resolves.toBeUndefined()
    })
  })

  describe('iOS (StatusBar plugin)', () => {
    it('flips the status bar text to light (Style.Dark) in dark theme', async () => {
      native.value = true
      platform.value = 'ios'

      await applySystemBarTheme(true)

      expect(setStyle).toHaveBeenCalledTimes(1)
      expect(setStyle).toHaveBeenCalledWith({ style: 'DARK' })
      expect(setTheme).not.toHaveBeenCalled()
    })

    it('flips the status bar text to dark (Style.Light) in light theme', async () => {
      native.value = true
      platform.value = 'ios'

      await applySystemBarTheme(false)

      expect(setStyle).toHaveBeenCalledWith({ style: 'LIGHT' })
    })

    it('never throws when the plugin call rejects', async () => {
      native.value = true
      platform.value = 'ios'
      setStyle.mockRejectedValueOnce(new Error('status bar boom'))

      await expect(applySystemBarTheme(true)).resolves.toBeUndefined()
    })
  })
})
