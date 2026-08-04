import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";

import { makeHabit } from "@/test/utils";
import {
  breakdown,
  daysSince,
  formatAmount,
  getHabitName,
  parseSavings,
} from "@/utils/utils";

// Fix "now" so time-relative helpers are deterministic.
const NOW = "2025-06-01T12:00:00.000Z";

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(NOW));
});

afterEach(() => {
  jest.useRealTimers();
});

const t = (key: string): string => `TR:${key}`;

describe("utils/utils", () => {
  describe("getHabitName", () => {
    it("translates standard habits by their i18n key", () => {
      const habit = makeHabit({ key: "habits.alcohol", name: "" });
      expect(getHabitName(habit, t as never)).toBe("TR:habits.alcohol");
    });

    it("returns the raw name for custom habits", () => {
      const habit = makeHabit({ key: undefined, name: "Coffee" });
      expect(getHabitName(habit, t as never)).toBe("Coffee");
    });
  });

  describe("daysSince", () => {
    it("returns 0 for null dates", () => {
      expect(daysSince(null)).toBe(0);
    });

    it("returns 0 for invalid dates", () => {
      expect(daysSince("not-a-date")).toBe(0);
    });

    it("returns whole days elapsed", () => {
      const threeDaysAgo = dayjs(NOW).subtract(3, "days").toISOString();
      expect(daysSince(threeDaysAgo)).toBe(3);
    });
  });

  describe("breakdown", () => {
    it("returns zeros for null dates", () => {
      expect(breakdown(null)).toEqual({ years: 0, months: 0, days: 0, hours: 0 });
    });

    it("returns zeros for invalid dates", () => {
      expect(breakdown("garbage")).toEqual({
        years: 0,
        months: 0,
        days: 0,
        hours: 0,
      });
    });

    it("decomposes a long streak into years/months/days/hours", () => {
      // 2025-05-31 10:00 → 2025-06-01 12:00 = 1 day + 2 hours
      const habit = makeHabit({ date: "2025-05-31T10:00:00.000Z" });
      expect(breakdown(habit.date)).toEqual({
        years: 0,
        months: 0,
        days: 1,
        hours: 2,
      });
    });

    it("reports exact calendar months", () => {
      // May 1 → Jun 1 = 1 month exactly (both within summer/WEST, no DST jump)
      const habit = makeHabit({ date: "2025-05-01T12:00:00.000Z" });
      expect(breakdown(habit.date)).toEqual({
        years: 0,
        months: 1,
        days: 0,
        hours: 0,
      });
    });

    it("reports exact calendar years", () => {
      const habit = makeHabit({ date: "2024-06-01T12:00:00.000Z" });
      expect(breakdown(habit.date)).toEqual({
        years: 1,
        months: 0,
        days: 0,
        hours: 0,
      });
    });
  });

  describe("parseSavings", () => {
    it("returns 0 for null/empty/whitespace", () => {
      expect(parseSavings(null)).toBe(0);
      expect(parseSavings("")).toBe(0);
      expect(parseSavings("   ")).toBe(0);
    });

    it("returns 0 for non-numeric input", () => {
      expect(parseSavings("abc")).toBe(0);
    });

    it("parses integers and decimals", () => {
      expect(parseSavings("5")).toBe(5);
      expect(parseSavings("5.25")).toBe(5.25);
      expect(parseSavings("0.5")).toBe(0.5);
    });
  });

  describe("formatAmount", () => {
    it("formats with the locale-aware symbol (en-US, USD)", () => {
      expect(formatAmount(1234.57, "USD")).toBe("$1,234.57");
    });

    it("formats EUR with the euro symbol", () => {
      expect(formatAmount(42, "EUR")).toBe("€42.00");
    });

    it("rounds to two decimals", () => {
      expect(formatAmount(1234.567, "EUR")).toBe("€1,234.57");
    });

    it("falls back to a raw code when Intl fails", () => {
      expect(formatAmount(5, "NOT-A-CURRENCY")).toBe("5.00 NOT-A-CURRENCY");
    });

    it("uses the device locale from expo-localization (pt-PT)", () => {
      const locales = (
        globalThis as unknown as { __rnTestLocales: unknown[] }
      ).__rnTestLocales;
      locales.splice(0, locales.length, {
        languageTag: "pt-PT",
        languageCode: "pt",
        regionCode: "PT",
        currencyCode: "EUR",
      });
      const out = formatAmount(1234.5, "EUR");
      // pt-PT uses comma decimal separator; symbol placement may vary by ICU,
      // so assert on the value part rather than the full string.
      expect(out).toContain("234,5");
      expect(out).toContain("€");
    });
  });
});
