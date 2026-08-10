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

export const daysSince = (
  isoDate: string | null,
  now: Date = new Date(),
): number => {
  if (!isoDate) return 0
  const d = dayjs(isoDate)
  return d.isValid() ? dayjs(now).diff(d, 'days') : 0
}

export const breakdown = (
  isoDate: string | null,
  now: Date = new Date(),
): Breakdown => {
  if (!isoDate) return ZERO_BREAKDOWN
  const d = dayjs(isoDate)
  if (!d.isValid()) return ZERO_BREAKDOWN

  let current = d
  const nowTime = dayjs(now)

  const years = nowTime.diff(current, 'years')
  current = current.add(years, 'years')

  const months = nowTime.diff(current, 'months')
  current = current.add(months, 'months')

  const days = nowTime.diff(current, 'days')
  current = current.add(days, 'days')

  const hours = nowTime.diff(current, 'hours')

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

/**
 * Format an ISO date as a localized date+time string via Intl
 * (e.g. "31 May 2025, 10:00" en — the RN app used dayjs "D MMM YYYY, HH:mm").
 * Returns '' for null/invalid input.
 */
export const formatDateTime = (isoDate: string | null, locale = 'en'): string => {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

/**
 * Format an ISO date as a localized date-only string via Intl
 * (e.g. "10 May 2025" en). Returns '' for null/invalid input.
 */
export const formatDate = (isoDate: string | null, locale = 'en'): string => {
  if (!isoDate) return ''
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
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
  maxFractionDigits: number = 2,
): string => {
  try {
    const locale =
      typeof navigator !== 'undefined' && navigator.language
        ? navigator.language
        : 'en-US'
    const parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      // When maxFractionDigits is lowered below the currency's default,
      // Intl also lowers the minimum — whole-euro totals ("€4,888").
      maximumFractionDigits: maxFractionDigits,
    }).formatToParts(value)

    return parts
      .map((p) => (p.type === 'currency' ? cleanSymbol(p.value) : p.value))
      .join('')
  } catch {
    const rounded = Math.round(value * 100) / 100
    return `${rounded.toFixed(2)} ${currencyCode}`
  }
}
