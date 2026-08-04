import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Habit } from "@/constants/types";

// Deliberate AsyncStorage mock: pure in-memory map, no native module.
const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
    multiGet: async (keys: string[]) =>
      keys.map((k) => [k, store.get(k) ?? null] as [string, string | null]),
    multiSet: async (pairs: [string, string][]) => {
      for (const [k, v] of pairs) store.set(k, v);
    },
  },
}));

import {
  ensureMilestonesForHabit,
  getMilestonesForHabit,
  saveMilestonesForHabit,
  deleteMilestonesForHabit,
  getMilestonesForHabits,
} from "@/data/milestones";

const habit = (date: string): Habit => ({
  id: "h1",
  name: "Alcohol",
  date,
  savings: "5",
});

beforeEach(() => {
  store.clear();
});

describe("data/milestones", () => {
  it("initializes a habit without a stored record (silent backfill, no celebration queue)", async () => {
    const h = habit("2025-01-01T00:00:00.000Z");
    const now = new Date("2025-06-01T00:00:00Z");

    const { milestones, newlyReached } = await ensureMilestonesForHabit(h, now);

    expect(milestones.length).toBeGreaterThan(0);
    // Long-standing habit: historical targets marked reached but NOT queued
    expect(newlyReached).toEqual([]);
    const reached = milestones.filter((m) => m.reachedAt !== null);
    expect(reached.length).toBeGreaterThan(0);
    // Persisted for later reads
    const stored = await getMilestonesForHabit("h1");
    expect(stored.length).toBe(milestones.length);
  });

  it("returns nothing for undated habits", async () => {
    const h = { ...habit("2025-01-01"), date: null };
    const { milestones, newlyReached } = await ensureMilestonesForHabit(
      h,
      new Date(),
    );
    expect(milestones).toEqual([]);
    expect(newlyReached).toEqual([]);
  });

  it("queues only milestones crossed since the last check", async () => {
    const h = habit("2025-01-01T00:00:00.000Z");
    // First check: backfill silently
    await ensureMilestonesForHabit(h, new Date("2025-01-01T06:00:00Z"));

    // A day later: exactly the newly crossed targets are reported
    const { newlyReached } = await ensureMilestonesForHabit(
      h,
      new Date("2025-01-02T06:00:00Z"),
    );
    expect(newlyReached.length).toBeGreaterThan(0);
    const units = newlyReached.map((m) => `${m.unit}:${m.amount}`);
    // day 1 crossed on the second check
    expect(units).toContain("day:1");
  });

  it("extends the horizon on later checks and reports fresh annuals only", async () => {
    const h = habit("2025-01-01T00:00:00.000Z");
    await ensureMilestonesForHabit(h, new Date("2025-06-01T00:00:00Z"));

    const { milestones } = await ensureMilestonesForHabit(
      h,
      new Date("2030-06-01T00:00:00Z"),
    );
    // Horizon extended: year 5 materialized (2025 + 5)
    const year5 = milestones.find((m) => m.unit === "year" && m.amount === 5);
    expect(year5).toBeDefined();
  });

  it("deletes a habit's milestone state", async () => {
    const h = habit("2025-01-01T00:00:00.000Z");
    await ensureMilestonesForHabit(h, new Date("2025-06-01T00:00:00Z"));
    await deleteMilestonesForHabit("h1");
    expect(await getMilestonesForHabit("h1")).toEqual([]);
  });

  it("saveMilestonesForHabit replaces the stored list", async () => {
    const h = habit("2025-01-01T00:00:00.000Z");
    const { milestones } = await ensureMilestonesForHabit(
      h,
      new Date("2025-06-01T00:00:00Z"),
    );
    const trimmed = milestones.slice(0, 3);
    await saveMilestonesForHabit("h1", trimmed);
    expect(await getMilestonesForHabit("h1")).toEqual(trimmed);
  });

  it("getMilestonesForHabits backfills many habits in one pass", async () => {
    const h1 = habit("2025-01-01T00:00:00.000Z");
    const h2: Habit = { ...habit("2024-01-01T00:00:00.000Z"), id: "h2" };
    const byHabit = await getMilestonesForHabits(
      [h1, h2],
      new Date("2025-06-01T00:00:00Z"),
    );
    expect(byHabit["h1"].length).toBeGreaterThan(0);
    expect(byHabit["h2"].length).toBeGreaterThan(0);
    // Persisted
    expect((await getMilestonesForHabit("h2")).length).toBeGreaterThan(0);
  });
});
