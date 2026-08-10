/**
 * Pure domain helpers (time + money) — ported from the RN app
 * (utils/utils.ts + savings-modal normalize).
 */

import dayjs from 'dayjs'

import type { Habit } from './types'

export interface Breakdown {
  years: number
  months: number
  days: number
  hours: number
}

const ZERO_BREAKDOWN: Breakdown = { years: 0, months: 0, days: 0, hours: 0 }

// ---------------------------------------------------------------------------
// Habit helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the display name for a habit — translated for standard habits
 * (key set), raw name for custom ones.
 */
export const getHabitName = (
  habit: Habit,
  t: (key: string, params?: Record<string, unknown>) => string,
): string => (habit.key ? t(habit.key) : habit.name)

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

export const daysSince = (isoDate: string | null): number => {
  if (!isoDate) return 0
  const d = dayjs(isoDate)
  return d.isValid() ? dayjs().diff(d, 'days') : 0
}

export const breakdown = (isoDate: string | null): Breakdown => {
  if (!isoDate) return ZERO_BREAKDOWN
  const d = dayjs(isoDate)
  if (!d.isValid()) return ZERO_BREAKDOWN

  let current = d
  const now = dayjs()

  const years = now.diff(current, 'years')
  current = current.add(years, 'years')

  const months = now.diff(current, 'months')
  current = current.add(months, 'months')

  const days = now.diff(current, 'days')
  current = current.add(days, 'days')

  const hours = now.diff(current, 'hours')

  return { years, months, days, hours }
}

// ---------------------------------------------------------------------------
// Savings helpers
// ---------------------------------------------------------------------------

export const parseSavings = (value: string | null): number => {
  if (!value) return 0
  const n = parseFloat(value)
  return Number.isNaN(n) ? 0 : n
}

/**
 * Normalize a raw savings input for storage (ported from the RN savings
 * modal): integers stay without decimals, otherwise two decimals.
 * Returns null for empty or invalid input.
 */
export const normalizeSavings = (raw: string): string | null => {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const num = parseFloat(trimmed)
  if (Number.isNaN(num)) return null
  return num % 1 === 0 ? String(num) : num.toFixed(2)
}

/** Clean a potentially prefixed currency symbol (e.g. "US$" → "$"). */
const cleanSymbol = (raw: string): string => {
  // Match pattern like "US$", "CA$", "A$", "HK$", "MX$", "R$" etc.
  // One or more letters followed by a single non-alphanumeric symbol.
  const match = raw.match(/^[A-Za-z]+([^\w\s])$/)
  return match?.[1] ?? raw
}

/**
 * Format a numeric value as a locale-aware currency string.
 *
 * Uses Intl.NumberFormat with the browser locale so that symbol placement,
 * decimal separators, and grouping are all correct for the current region
 * (e.g. €1,234.57 en-US, 1.234,57 € pt-PT). Strips country disambiguators
 * (e.g. "US$" → "$") so the output always uses a clean symbol.
 *
 * Falls back to a raw code when Intl is unavailable or the code is invalid.
 */
export const formatAmount = (
  value: number,
  currencyCode: string = 'EUR',
): string => {
  try {
    const locale =
      typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : 'en-US'
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).formatToParts(value)

    return parts
      .map((p) => (p.type === 'currency' ? cleanSymbol(p.value) : p.value))
      .join('')
  } catch {
    const rounded = Math.round(value * 100) / 100
    return `${rounded.toFixed(2)} ${currencyCode}`
  }
}
