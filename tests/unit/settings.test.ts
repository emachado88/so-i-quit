import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  applyNativeLocale,
  currencyFromLocale,
  DEFAULT_SETTINGS,
  detectLanguage,
  extractRegion,
  getCurrency,
  getLanguage,
  getMilestoneNotificationsEnabled,
  getMilestoneNotificationsPrompted,
  getSettings,
  getTheme,
  saveCurrency,
  saveLanguage,
  saveMilestoneNotificationsEnabled,
  saveMilestoneNotificationsPrompted,
  saveSettings,
  saveTheme,
} from '../../app/utils/settings'
import { installStorageMock, seedStorage } from '../helpers'

installStorageMock()

const setLanguage = (language: string): void => {
  vi.stubGlobal('navigator', { language })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('utils/settings', () => {
  describe('DEFAULT_SETTINGS', () => {
    it('has the expected shape', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        theme: 'system',
        language: '',
        currency: 'EUR',
        milestoneNotificationsEnabled: false,
        milestoneNotificationsPrompted: false,
      })
    })
  })

  describe('detectLanguage', () => {
    it('maps device language tags to supported codes', () => {
      setLanguage('pt-PT')
      expect(detectLanguage()).toBe('pt')
      setLanguage('en-US')
      expect(detectLanguage()).toBe('en')
      setLanguage('zh-CN')
      expect(detectLanguage()).toBe('zh')
    })

    it('falls back to en for unsupported languages', () => {
      setLanguage('xx-YY')
      expect(detectLanguage()).toBe('en')
    })
  })

  describe('applyNativeLocale', () => {
    it('fills language + currency from the native locale on first run', () => {
      const updates = applyNativeLocale(
        { languageCode: 'en', regionCode: 'PT', currencyCode: 'EUR' },
        {},
      )
      expect(updates).toEqual({ language: 'en', currency: 'EUR' })
    })

    it('uses the region mapping when the native currency is unavailable', () => {
      const updates = applyNativeLocale(
        { languageCode: 'en', regionCode: 'PT', currencyCode: null },
        {},
      )
      expect(updates).toEqual({ language: 'en', currency: 'EUR' })
    })

    it('never overrides a stored language or currency', () => {
      const updates = applyNativeLocale(
        { languageCode: 'pt', regionCode: 'PT', currencyCode: 'EUR' },
        { language: 'en', currency: 'USD' },
      )
      expect(updates).toEqual({})
    })

    it('skips unknown language codes but keeps the currency', () => {
      const updates = applyNativeLocale(
        { languageCode: 'xx', regionCode: 'PT', currencyCode: 'EUR' },
        {},
      )
      expect(updates).toEqual({ currency: 'EUR' })
    })

    it('returns no updates when nothing can be detected', () => {
      expect(applyNativeLocale({}, {})).toEqual({})
      expect(
        applyNativeLocale(
          { languageCode: 'xx', regionCode: null, currencyCode: null },
          {},
        ),
      ).toEqual({})
    })
  })

  describe('getTheme', () => {
    it('returns the default when nothing is stored', () => {
      expect(getTheme()).toBe('system')
    })

    it('returns the stored theme', () => {
      saveTheme('dark')
      expect(getTheme()).toBe('dark')
    })

    it('falls back to the default for invalid values', () => {
      seedStorage('settings-v1', JSON.stringify({ theme: 'neon' }))
      expect(getTheme()).toBe('system')
    })
  })

  describe('getLanguage', () => {
    it('detects the language when nothing is stored', () => {
      setLanguage('fr-FR')
      expect(getLanguage()).toBe('fr')
    })

    it('returns the stored language when present', () => {
      saveLanguage('pt')
      expect(getLanguage()).toBe('pt')
    })
  })

  describe('extractRegion / currencyFromLocale', () => {
    it('extracts 2-letter and 3-digit regions', () => {
      expect(extractRegion('en-US')).toBe('US')
      expect(extractRegion('pt-PT')).toBe('PT')
      expect(extractRegion('es-419')).toBe('419')
    })

    it('reads the region from the last segment (script tags)', () => {
      expect(extractRegion('zh-Hans-CN')).toBe('CN')
      expect(currencyFromLocale('zh-Hans-CN')).toBe('CNY')
    })

    it('treats single-segment tags as region-less', () => {
      expect(extractRegion('pt')).toBeUndefined()
      expect(extractRegion('sv')).toBeUndefined()
      // "sv" is the Swedish language, NOT El Salvador
      expect(currencyFromLocale('sv')).toBeUndefined()
    })

    it('maps regions to currencies', () => {
      expect(currencyFromLocale('pt-PT')).toBe('EUR')
      expect(currencyFromLocale('pt-BR')).toBe('BRL')
      expect(currencyFromLocale('en-GB')).toBe('GBP')
      expect(currencyFromLocale('en-US')).toBe('USD')
    })

    it('returns undefined for unknown regions', () => {
      expect(currencyFromLocale('xx-YY')).toBeUndefined()
      expect(currencyFromLocale('es-419')).toBeUndefined()
    })
  })

  describe('getCurrency', () => {
    it('detects from the browser region on first run', () => {
      setLanguage('en-US')
      expect(getCurrency()).toBe('USD')
    })

    it('maps PT region to EUR', () => {
      setLanguage('pt-PT')
      expect(getCurrency()).toBe('EUR')
    })

    it('falls back to the Intl full locale when navigator has no region', () => {
      // Many Android devices report a region-less tag ("pt").
      setLanguage('pt')
      vi.stubGlobal('Intl', {
        ...Intl,
        DateTimeFormat: () => ({ resolvedOptions: () => ({ locale: 'pt-PT' }) }),
      })
      expect(getCurrency()).toBe('EUR')

      vi.stubGlobal('Intl', {
        ...Intl,
        DateTimeFormat: () => ({ resolvedOptions: () => ({ locale: 'pt-BR' }) }),
      })
      expect(getCurrency()).toBe('BRL')
    })

    it('decouples language from currency (English device, PT region)', () => {
      // The user's case: phone language English, locale/region Portugal —
      // EN strings + EUR units.
      vi.stubGlobal('navigator', { language: 'en-PT', languages: ['en-PT'] })
      expect(detectLanguage()).toBe('en')
      expect(getCurrency()).toBe('EUR')
    })

    it('prefers the region from navigator.languages over a defaulted language tag', () => {
      // navigator.language can come defaulted ("en-US") while the device
      // locale list carries the real region ("en-PT").
      vi.stubGlobal('navigator', {
        language: 'en-US',
        languages: ['en-PT', 'en-US'],
      })
      expect(getCurrency()).toBe('EUR')
    })

    it('returns the stored currency when present', () => {
      saveCurrency('GBP')
      expect(getCurrency()).toBe('GBP')
    })
  })

  describe('milestone notification flags', () => {
    it('reads stored booleans', () => {
      saveMilestoneNotificationsEnabled(true)
      saveMilestoneNotificationsPrompted(true)
      expect(getMilestoneNotificationsEnabled()).toBe(true)
      expect(getMilestoneNotificationsPrompted()).toBe(true)
    })

    it('defaults to false', () => {
      expect(getMilestoneNotificationsEnabled()).toBe(false)
      expect(getMilestoneNotificationsPrompted()).toBe(false)
    })
  })

  describe('getSettings (batch)', () => {
    it('returns defaults (with detected language) when nothing is stored', () => {
      setLanguage('en-US')
      expect(getSettings()).toEqual({
        ...DEFAULT_SETTINGS,
        language: 'en',
        currency: 'USD',
      })
    })

    it('returns persisted values', () => {
      saveSettings({
        theme: 'dark',
        language: 'fr',
        currency: 'CHF',
        milestoneNotificationsEnabled: true,
        milestoneNotificationsPrompted: true,
      })
      expect(getSettings()).toEqual({
        theme: 'dark',
        language: 'fr',
        currency: 'CHF',
        milestoneNotificationsEnabled: true,
        milestoneNotificationsPrompted: true,
      })
    })

    it('falls back to defaults for corrupt JSON', () => {
      setLanguage('de-DE')
      seedStorage('settings-v1', '{not json')
      expect(getSettings()).toEqual({
        ...DEFAULT_SETTINGS,
        language: 'de',
        currency: 'EUR',
      })
    })
  })

  describe('setters', () => {
    it('each save merges into the stored settings', () => {
      saveTheme('dark')
      saveLanguage('pt')
      saveCurrency('USD')
      saveMilestoneNotificationsEnabled(true)
      saveMilestoneNotificationsPrompted(true)
      expect(getSettings()).toEqual({
        theme: 'dark',
        language: 'pt',
        currency: 'USD',
        milestoneNotificationsEnabled: true,
        milestoneNotificationsPrompted: true,
      })
    })
  })
})
