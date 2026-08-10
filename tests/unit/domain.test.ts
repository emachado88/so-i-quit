import dayjs from 'dayjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  breakdown,
  daysSince,
  formatAmount,
  getHabitName,
  normalizeSavings,
  parseSavings,
} from '../../app/utils/domain'
import type { Habit } from '../../app/utils/types'

// Fix "now" so time-relative helpers are deterministic.
const NOW = '2025-06-01T12:00:00.000Z'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Alcohol',
  date: null,
  savings: null,
  ...overrides,
})

const t = (key: string): string => `TR:${key}`

const setLanguage = (language: string): void => {
  vi.stubGlobal('navigator', { language })
}

describe('utils/domain', () => {
  describe('getHabitName', () => {
    it('translates standard habits by their i18n key', () => {
      const habit = makeHabit({ key: 'habits.alcohol', name: '' })
      expect(getHabitName(habit, t)).toBe('TR:habits.alcohol')
    })

    it('returns the raw name for custom habits', () => {
      const habit = makeHabit({ key: undefined, name: 'Coffee' })
      expect(getHabitName(habit, t)).toBe('Coffee')
    })
  })

  describe('daysSince', () => {
    it('returns 0 for null dates', () => {
      expect(daysSince(null)).toBe(0)
    })

    it('returns 0 for invalid dates', () => {
      expect(daysSince('not-a-date')).toBe(0)
    })

    it('returns whole days elapsed', () => {
      const threeDaysAgo = dayjs(NOW).subtract(3, 'days').toISOString()
      expect(daysSince(threeDaysAgo)).toBe(3)
    })
  })

  describe('breakdown', () => {
    it('returns zeros for null dates', () => {
      expect(breakdown(null)).toEqual({ years: 0, months: 0, days: 0, hours: 0 })
    })

    it('returns zeros for invalid dates', () => {
      expect(breakdown('garbage')).toEqual({ years: 0, months: 0, days: 0, hours: 0 })
    })

    it('decomposes a streak into days and hours', () => {
      // 2025-05-31 10:00 → 2025-06-01 12:00 = 1 day + 2 hours
      expect(breakdown('2025-05-31T10:00:00.000Z')).toEqual({
        years: 0,
        months: 0,
        days: 1,
        hours: 2,
      })
    })

    it('reports exact calendar months', () => {
      // May 1 → Jun 1 = 1 month exactly
      expect(breakdown('2025-05-01T12:00:00.000Z')).toEqual({
        years: 0,
        months: 1,
        days: 0,
        hours: 0,
      })
    })

    it('reports exact calendar years', () => {
      expect(breakdown('2024-06-01T12:00:00.000Z')).toEqual({
        years: 1,
        months: 0,
        days: 0,
        hours: 0,
      })
    })

    it('returns zeros for streaks under an hour', () => {
      // 30 minutes ago → no full unit elapsed yet
      const halfHourAgo = dayjs(NOW).subtract(30, 'minutes').toISOString()
      expect(breakdown(halfHourAgo)).toEqual({ years: 0, months: 0, days: 0, hours: 0 })
    })
  })

  describe('parseSavings', () => {
    it('returns 0 for null/empty/whitespace', () => {
      expect(parseSavings(null)).toBe(0)
      expect(parseSavings('')).toBe(0)
      expect(parseSavings('   ')).toBe(0)
    })

    it('returns 0 for non-numeric input', () => {
      expect(parseSavings('abc')).toBe(0)
    })

    it('parses integers and decimals', () => {
      expect(parseSavings('5')).toBe(5)
      expect(parseSavings('5.25')).toBe(5.25)
      expect(parseSavings('0.5')).toBe(0.5)
    })
  })

  describe('normalizeSavings', () => {
    it('returns null for empty/whitespace', () => {
      expect(normalizeSavings('')).toBeNull()
      expect(normalizeSavings('   ')).toBeNull()
    })

    it('returns null for non-numeric input', () => {
      expect(normalizeSavings('abc')).toBeNull()
    })

    it('keeps integers without decimals', () => {
      expect(normalizeSavings('5')).toBe('5')
      expect(normalizeSavings('  7  ')).toBe('7')
    })

    it('rounds decimals to two places', () => {
      expect(normalizeSavings('5.25')).toBe('5.25')
      expect(normalizeSavings('5.256')).toBe('5.26')
      expect(normalizeSavings('0.5')).toBe('0.50')
    })
  })

  describe('formatAmount', () => {
    it('formats with the locale-aware symbol (en-US, USD)', () => {
      setLanguage('en-US')
      expect(formatAmount(1234.57, 'USD')).toBe('$1,234.57')
    })

    it('formats EUR with the euro symbol', () => {
      setLanguage('en-US')
      expect(formatAmount(42, 'EUR')).toBe('€42.00')
    })

    it('rounds to two decimals', () => {
      setLanguage('en-US')
      expect(formatAmount(1234.567, 'EUR')).toBe('€1,234.57')
    })

    it('falls back to a raw code when Intl fails', () => {
      setLanguage('en-US')
      expect(formatAmount(5, 'NOT-A-CURRENCY')).toBe('5.00 NOT-A-CURRENCY')
    })

    it('uses the browser locale (pt-PT)', () => {
      setLanguage('pt-PT')
      const out = formatAmount(1234.5, 'EUR')
      // pt-PT uses comma decimal separator; symbol placement may vary by ICU,
      // so assert on the value part rather than the full string.
      expect(out).toContain('234,5')
      expect(out).toContain('€')
    })
  })
})
