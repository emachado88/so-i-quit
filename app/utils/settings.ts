/**
 * Settings persistence + first-run detection over localStorage —
 * ported from the RN data layer (data/settings.ts + i18n/index.ts).
 *
 * The RN app spread settings across five AsyncStorage keys; the port
 * stores the whole AppSettings object under the single key "settings-v1"
 * (per the rewrite plan's storage keys).
 */

import { REGION_TO_CURRENCY } from './currencies'
import { STORAGE_KEYS, readJSON, writeJSON } from './storage'
import type { AppSettings, Theme } from './types'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: '',
  currency: 'EUR',
  milestoneNotificationsEnabled: false,
  milestoneNotificationsPrompted: false,
}

// ---------------------------------------------------------------------------
// First-run detection
// ---------------------------------------------------------------------------

/** Supported language codes for the settings picker (order = picker order). */
export const SUPPORTED_LANGUAGES = [
  'en',
  'pt',
  'fr',
  'es',
  'it',
  'zh',
  'de',
  'nl',
] as const

/** Map device language tags to supported codes (ported from i18n/index.ts). */
const LANGUAGE_MAP: Record<string, string> = {
  en: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  pt: 'pt',
  'pt-br': 'pt',
  fr: 'fr',
  es: 'es',
  it: 'it',
  zh: 'zh',
  'zh-cn': 'zh',
  'zh-tw': 'zh',
  'zh-hk': 'zh',
  de: 'de',
  nl: 'nl',
}

const getNavigatorLanguage = (): string => {
  if (typeof navigator === 'undefined') return ''
  try {
    return navigator.language ?? ''
  } catch {
    return ''
  }
}

/** Detect the best language code from the browser locale (default "en"). */
export const detectLanguage = (): string => {
  const tag = getNavigatorLanguage().toLowerCase()
  if (LANGUAGE_MAP[tag]) return LANGUAGE_MAP[tag]
  const code = tag.split('-')[0]
  if (code && LANGUAGE_MAP[code]) return LANGUAGE_MAP[code]
  return 'en'
}

/** Detect preferred currency from the locale region (fallback EUR). */
const detectDefaultCurrency = (): string => {
  const tag = getNavigatorLanguage().toLowerCase()
  const region = tag.split('-')[1]?.toUpperCase()
  if (region && REGION_TO_CURRENCY[region]) return REGION_TO_CURRENCY[region]
  return DEFAULT_SETTINGS.currency
}

const isTheme = (value: unknown): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system'

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Load all settings in one pass, filling defaults + first-run detection. */
export const getSettings = (): AppSettings => {
  const stored = readJSON<Partial<AppSettings>>(STORAGE_KEYS.settings, {})
  return {
    theme: isTheme(stored.theme) ? stored.theme : DEFAULT_SETTINGS.theme,
    language: stored.language || detectLanguage(),
    currency: stored.currency || detectDefaultCurrency(),
    milestoneNotificationsEnabled:
      stored.milestoneNotificationsEnabled ??
      DEFAULT_SETTINGS.milestoneNotificationsEnabled,
    milestoneNotificationsPrompted:
      stored.milestoneNotificationsPrompted ??
      DEFAULT_SETTINGS.milestoneNotificationsPrompted,
  }
}

export const getTheme = (): Theme => getSettings().theme
export const getLanguage = (): string => getSettings().language
export const getCurrency = (): string => getSettings().currency
export const getMilestoneNotificationsEnabled = (): boolean =>
  getSettings().milestoneNotificationsEnabled
export const getMilestoneNotificationsPrompted = (): boolean =>
  getSettings().milestoneNotificationsPrompted

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** Merge one or more fields into the persisted settings. */
const mergeSettings = (updates: Partial<AppSettings>): void => {
  writeJSON(STORAGE_KEYS.settings, { ...getSettings(), ...updates })
}

export const saveTheme = (theme: Theme): void => mergeSettings({ theme })
export const saveLanguage = (language: string): void =>
  mergeSettings({ language })
export const saveCurrency = (currency: string): void =>
  mergeSettings({ currency })
export const saveMilestoneNotificationsEnabled = (enabled: boolean): void =>
  mergeSettings({ milestoneNotificationsEnabled: enabled })
export const saveMilestoneNotificationsPrompted = (prompted: boolean): void =>
  mergeSettings({ milestoneNotificationsPrompted: prompted })

/** Persist all settings in a single write. */
export const saveSettings = (settings: AppSettings): void => {
  writeJSON(STORAGE_KEYS.settings, settings)
}
