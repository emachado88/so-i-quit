import dayjs from "dayjs";

import type { Habit, Milestone } from "@/constants/types";
import {
  BASE_MILESTONES,
  generateMilestones,
  getMilestoneId,
  getNextMilestone,
  getPreviousMilestone,
  isMilestoneReached,
  milestoneTargetDate,
  ringProgress,
  formatMilestoneLabel,
} from "@/lib/milestones";

const habit = (date: string): Habit => ({
  id: "h1",
  name: "Alcohol",
  date,
  savings: "5",
});

const t = (key: string): string => {
  const labels: Record<string, string> = {
    "milestone.day.one": "day",
    "milestone.day.other": "days",
    "milestone.week.one": "week",
    "milestone.week.other": "weeks",
    "milestone.month.one": "month",
    "milestone.month.other": "months",
    "milestone.year.one": "year",
    "milestone.year.other": "years",
  };
  return labels[key] ?? key;
};

describe("lib/milestones", () => {
  describe("milestoneTargetDate", () => {
    it("adds calendar units from the quit date", () => {
      const h = habit("2025-01-31T10:00:00.000Z");
      const milestone: Milestone = {
        id: "h1-month-1",
        habitId: "h1",
        unit: "month",
        amount: 1,
        reachedAt: null,
        notificationId: null,
      };
      // Calendar month: Jan 31 + 1 month = Feb 28 (short-month semantics)
      expect(milestoneTargetDate(h, milestone).format("YYYY-MM-DD")).toBe(
        "2025-02-28",
      );
    });

    it("treats 1 year as the calendar anniversary, not 365 days", () => {
      const h = habit("2024-02-29T10:00:00.000Z");
      const milestone: Milestone = {
        id: "h1-year-1",
        habitId: "h1",
        unit: "year",
        amount: 1,
        reachedAt: null,
        notificationId: null,
      };
      // Leap day + 1 calendar year
      expect(milestoneTargetDate(h, milestone).format("YYYY-MM-DD")).toBe(
        "2025-02-28",
      );
    });
  });

  describe("getMilestoneId", () => {
    it("is deterministic", () => {
      expect(getMilestoneId("h1", "week", 2)).toBe("h1-week-2");
      expect(getMilestoneId("h1", "week", 2)).toBe("h1-week-2");
    });
  });

  describe("generateMilestones", () => {
    it("returns no milestones for habits without a date", () => {
      expect(generateMilestones({ ...habit("2025-01-01"), date: null }, new Date())).toEqual(
        [],
      );
    });

    it("includes base milestones and yearly anniversaries beyond year 1", () => {
      const h = habit("2024-01-01T00:00:00.000Z");
      const milestones = generateMilestones(h, new Date("2025-06-01T00:00:00Z"));
      const units = milestones.map((m) => `${m.unit}:${m.amount}`);

      // base milestones
      expect(units).toContain("day:1");
      expect(units).toContain("month:6");
      expect(units).toContain("year:1");
      // yearly anniversaries materialized through the horizon
      expect(units).toContain("year:2");
      // Horizon covers now + 10 years (2025-06 + 10y = 2035-06, which is
      // year 11 since the 2024 start), so year:11 exists but year:12 does not.
      expect(units).toContain("year:11");
      expect(units).not.toContain("year:12");
    });

    it("sorts milestones by target date", () => {
      const h = habit("2025-01-01T00:00:00.000Z");
      const milestones = generateMilestones(h, new Date("2025-06-01T00:00:00Z"));
      const dates = milestones.map((m) => milestoneTargetDate(h, m).valueOf());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it("does not mutate the base list", () => {
      const h = habit("2025-01-01T00:00:00.000Z");
      const before = BASE_MILESTONES.length;
      generateMilestones(h, new Date());
      expect(BASE_MILESTONES.length).toBe(before);
    });
  });

  describe("isMilestoneReached", () => {
    it("is true when now is exactly the target date (inclusive)", () => {
      const h = habit("2025-01-01T00:00:00.000Z");
      const milestone: Milestone = {
        id: "h1-day-1",
        habitId: "h1",
        unit: "day",
        amount: 1,
        reachedAt: null,
        notificationId: null,
      };
      expect(
        isMilestoneReached(h, milestone, new Date("2025-01-02T00:00:00.000Z")),
      ).toBe(true);
    });

    it("is false before the target date", () => {
      const h = habit("2025-01-01T00:00:00.000Z");
      const milestone: Milestone = {
        id: "h1-day-1",
        habitId: "h1",
        unit: "day",
        amount: 1,
        reachedAt: null,
        notificationId: null,
      };
      expect(
        isMilestoneReached(h, milestone, new Date("2025-01-01T23:00:00.000Z")),
      ).toBe(false);
    });
  });

  describe("getNextMilestone / getPreviousMilestone", () => {
    const h = habit("2025-01-01T00:00:00.000Z");
    const milestones = generateMilestones(h, new Date("2025-06-01T00:00:00Z"));

    it("returns the first future milestone", () => {
      const next = getNextMilestone(h, milestones, new Date("2025-01-05T00:00:00Z"));
      expect(next).not.toBeNull();
      // day 3 passed, week 1 is next
      expect(next?.unit).toBe("week");
      expect(next?.amount).toBe(1);
    });

    it("returns the last reached milestone as previous", () => {
      const prev = getPreviousMilestone(
        h,
        milestones,
        new Date("2025-01-05T00:00:00Z"),
      );
      expect(prev).not.toBeNull();
      expect(prev?.amount).toBe(3);
      expect(prev?.unit).toBe("day");
    });

    it("returns null previous when nothing reached", () => {
      const prev = getPreviousMilestone(
        h,
        milestones,
        new Date("2025-01-01T00:30:00Z"),
      );
      expect(prev).toBeNull();
    });

    it("returns null next when everything is behind us", () => {
      const farFuture = new Date("2040-01-01T00:00:00Z");
      const next = getNextMilestone(h, milestones, farFuture);
      expect(next).toBeNull();
    });
  });

  describe("ringProgress", () => {
    it("returns 0 at the start of a streak", () => {
      const h = habit("2025-01-01T00:00:00.000Z");
      const milestones = generateMilestones(h, new Date("2025-06-01T00:00:00Z"));
      expect(ringProgress(h, milestones, new Date("2025-01-01T00:00:00.000Z"))).toBe(0);
    });

    it("returns 1 when no next milestone remains", () => {
      const h = habit("2025-01-01T00:00:00.000Z");
      const milestones = generateMilestones(h, new Date("2025-06-01T00:00:00Z"));
      expect(ringProgress(h, milestones, new Date("2050-01-01T00:00:00Z"))).toBe(1);
    });

    it("is clamped to [0, 1]", () => {
      const h = habit("2025-01-01T00:00:00.000Z");
      const milestones = generateMilestones(h, new Date("2025-06-01T00:00:00Z"));
      const progress = ringProgress(h, milestones, new Date("2025-01-01T12:00:00Z"));
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    it("returns 0 for undated habits", () => {
      const h = { ...habit("2025-01-01"), date: null };
      expect(ringProgress(h, [], new Date())).toBe(0);
    });
  });

  describe("formatMilestoneLabel", () => {
    it("formats singular and plural labels", () => {
      const one: Milestone = {
        id: "x",
        habitId: "h",
        unit: "day",
        amount: 1,
        reachedAt: null,
        notificationId: null,
      };
      const many: Milestone = {
        id: "x",
        habitId: "h",
        unit: "month",
        amount: 6,
        reachedAt: null,
        notificationId: null,
      };
      expect(formatMilestoneLabel(one, t as never)).toBe("1 day");
      expect(formatMilestoneLabel(many, t as never)).toBe("6 months");
    });
  });

  it("dayjs locale is not required for calendar math", () => {
    const h = habit("2025-03-15T00:00:00.000Z");
    const m = generateMilestones(h, new Date("2025-04-01T00:00:00Z"));
    expect(m.length).toBeGreaterThan(0);
    expect(dayjs).toBeDefined();
  });
});
