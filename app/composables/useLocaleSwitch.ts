import type { SupportedLanguage } from '../utils/settings'

/**
 * Locale switching wrapper. The URL is the source of truth for the active
 * locale (`prefix_except_default`): navigateTo(switchLocalePath(code)) moves
 * the route to the new prefix and the i18n-persist plugin saves it. Wrapped
 * in a composable so vitest can mock it (no Nuxt auto-imports in tests).
 */
export const useLocaleSwitch = (): {
  setLocale: (code: SupportedLanguage) => void
} => {
  const switchLocalePath = useSwitchLocalePath()
  return {
    setLocale: (code: SupportedLanguage) => {
      const target = switchLocalePath(code)
      if (target) void navigateTo(target)
    },
  }
}
