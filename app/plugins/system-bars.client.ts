import { Capacitor } from '@capacitor/core'

import { applySystemBarTheme } from '../utils/system-bars'

/**
 * Pushes the app's resolved color-mode (light/dark) to the native Android
 * system bars on every change. The WebView's theme is invisible to the OS —
 * without this, Android keeps light-mode nav-bar icons + the light contrast
 * scrim (a light-grey band behind the gesture pill / 3-button keys) while
 * the app renders dark, and vice-versa. No-op in browser/web (guard inside
 * the wrapper) and on iOS (plugin not registered).
 */
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return

  const colorMode = useColorMode()

  const apply = (): void => {
    void applySystemBarTheme(colorMode.value === 'dark')
  }

  apply()
  watch(() => colorMode.value, apply)
})
