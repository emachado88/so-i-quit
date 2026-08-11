import type { Theme } from '../utils/types'

/**
 * Thin wrapper over the color-mode module's `useColorMode` (Nuxt
 * auto-import). The wrapper keeps components testable — vitest has no Nuxt
 * auto-imports, so tests mock this composable and never touch the module.
 */
export const useThemeMode = (): {
  preference: string
  setTheme: (theme: Theme) => void
} => {
  const colorMode = useColorMode()
  return {
    preference: colorMode.preference,
    setTheme: (theme: Theme) => {
      colorMode.preference = theme
    },
  }
}
