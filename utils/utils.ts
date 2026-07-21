import { getLocales } from "expo-localization";
import dayjs from "dayjs";
import type { Habit } from "@/constants/interfaces";
import type { TranslationKey } from "@/i18n/en";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Breakdown {
  years: number;
  months: number;
  days: number;
  hours: number;
}

// ---------------------------------------------------------------------------
// Habit helpers
// ---------------------------------------------------------------------------

/** Resolve the display name for a habit — translated for standard, raw for custom. */
export const getHabitName = (
  habit: Habit,
  t: (key: TranslationKey, params?: Record<string, string>) => string,
): string => (habit.key ? t(habit.key as TranslationKey) : habit.name);

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

export const daysSince = (isoDate: string | null): number => {
  if (!isoDate) return 0;
  const d = dayjs(isoDate);
  return d.isValid() ? dayjs().diff(d, "days") : 0;
};

export const breakdown = (isoDate: string | null): Breakdown => {
  if (!isoDate) return { years: 0, months: 0, days: 0, hours: 0 };
  const d = dayjs(isoDate);
  if (!d.isValid()) return { years: 0, months: 0, days: 0, hours: 0 };

  let current = d;
  const now = dayjs();

  const years = now.diff(current, "years");
  current = current.add(years, "years");

  const months = now.diff(current, "months");
  current = current.add(months, "months");

  const days = now.diff(current, "days");
  current = current.add(days, "days");

  const hours = now.diff(current, "hours");

  return { years, months, days, hours };
};

// ---------------------------------------------------------------------------
// Savings helpers
// ---------------------------------------------------------------------------

export const parseSavings = (value: string | null): number => {
  if (!value) return 0;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
};

/** Clean a potentially prefixed currency symbol (e.g. "US$" → "$", "A$" → "$"). */
const cleanSymbol = (raw: string): string => {
  // Match pattern like "US$", "CA$", "A$", "HK$", "MX$", "R$" etc.
  // One or more letters followed by a single non-alphanumeric symbol.
  const match = raw.match(/^[A-Za-z]+([^\w\s])$/);
  return match ? match[1] : raw;
};

/**
 * Format a numeric value as a locale-aware currency string.
 *
 * Uses Intl.NumberFormat with the user's device locale so that symbol
 * placement, decimal separators, and grouping are all correct for the
 * current region (e.g. €1,234.57 en-US, 1.234,57 € pt-PT, 1 234,57 €
 * fr-FR). Strips country disambiguators (e.g. "US$" → "$") so the
 * output always uses a clean symbol.
 *
 * Falls back when Intl is unavailable (shouldn't happen on RN 0.81+).
 */
export const formatAmount = (
  value: number,
  currencyCode: string = "EUR",
): string => {
  try {
    const locale = getLocales()[0]?.languageTag ?? "en-US";
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    }).formatToParts(value);

    return parts
      .map((p) => (p.type === "currency" ? cleanSymbol(p.value) : p.value))
      .join("");
  } catch {
    const rounded = Math.round(value * 100) / 100;
    return `${rounded.toFixed(2)} ${currencyCode}`;
  }
};
