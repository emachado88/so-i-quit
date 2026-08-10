import { Capacitor } from '@capacitor/core'

import { STORAGE_KEYS, readJSON } from '../utils/storage'
import { applyNativeLocale, saveCurrency, saveLanguage } from '../utils/settings'
import type { AppSettings } from '../utils/types'

/**
 * First-run locale detection from the native device locale
 * (@capawesome/capacitor-localization).
 *
 * navigator.language in the WebView is unreliable for the region (it can
 * report "en-GB" while the device region is PT) — the native locale carries
 * the real languageCode / regionCode / currencyCode from the OS. Only fills
 * settings the user hasn't chosen yet; everything else keeps the existing
 * navigator/Intl detection.
 *
 * Ordered before the i18n-persist plugin (nuxt.config plugins, order -10)
 * so the boot redirect picks up the native language.
 */
export default defineNuxtPlugin(async () => {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { Localization } = await import('@capawesome/capacitor-localization')
    const { locales } = await Localization.getLocales()
    const locale = locales[0]
    if (!locale) return

    const stored = readJSON<Partial<AppSettings>>(STORAGE_KEYS.settings, {})
    const updates = applyNativeLocale(
      {
        languageCode: locale.languageCode,
        regionCode: locale.regionCode,
        currencyCode: locale.currencyCode,
      },
      stored,
    )
    if (updates.language) saveLanguage(updates.language)
    if (updates.currency) saveCurrency(updates.currency)
  } catch {
    // Plugin unavailable or failed — fall back to the navigator/Intl
    // detection already built into getSettings().
  }
})
