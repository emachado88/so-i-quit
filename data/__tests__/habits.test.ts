import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sentry from "@sentry/react-native";
import { beforeEach, describe, expect, it } from "@jest/globals";

import { makeHabit } from "@/test/utils";
import {
  addHabit,
  deleteHabit,
  getHabits,
  saveHabits,
  updateHabit,
} from "@/data/habits";

const ID_PATTERN = /^\d+-[a-z0-9]{9}$/;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("data/habits", () => {
  describe("getHabits", () => {
    it("returns [] when nothing is stored", async () => {
      expect(await getHabits()).toEqual([]);
    });

    it("round-trips stored habits", async () => {
      await saveHabits([makeHabit()]);
      expect(await getHabits()).toEqual([makeHabit()]);
    });

    it("propagates corrupt JSON as an error (screens surface it)", async () => {
      await AsyncStorage.setItem("habits", "{not json");
      await expect(getHabits()).rejects.toThrow();
    });
  });

  describe("saveHabits", () => {
    it("persists the full list", async () => {
      const habits = [makeHabit(), makeHabit({ id: "h2", name: "Tobacco" })];
      await saveHabits(habits);
      expect(await getHabits()).toEqual(habits);
    });
  });

  describe("addHabit", () => {
    it("assigns a timestamp+random id", async () => {
      const created = await addHabit({
        name: "Alcohol",
        date: null,
        savings: null,
      });
      expect(created.id).toMatch(ID_PATTERN);
      expect(created.name).toBe("Alcohol");
    });

    it("appends to the stored list", async () => {
      const first = await addHabit({ name: "A", date: null, savings: null });
      const second = await addHabit({ name: "B", date: null, savings: null });
      const stored = await getHabits();
      expect(stored.map((h) => h.id)).toEqual([first.id, second.id]);
    });

    it("records a Sentry breadcrumb", async () => {
      await addHabit({ name: "Coffee", date: null, savings: null });
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "habits",
          level: "info",
          data: expect.objectContaining({ habitId: expect.stringMatching(ID_PATTERN) }),
        }),
      );
    });
  });

  describe("updateHabit", () => {
    it("merges updates and persists", async () => {
      const created = await addHabit({
        name: "Alcohol",
        date: null,
        savings: null,
      });
      await updateHabit(created.id, {
        date: "2025-01-01T00:00:00.000Z",
        savings: "5",
      });
      const [stored] = await getHabits();
      expect(stored).toMatchObject({
        id: created.id,
        name: "Alcohol",
        date: "2025-01-01T00:00:00.000Z",
        savings: "5",
      });
    });

    it("is a no-op for unknown ids (no throw)", async () => {
      await expect(updateHabit("missing", { savings: "1" })).resolves.toBeUndefined();
    });

    it("records a breadcrumb with the updated fields", async () => {
      const created = await addHabit({
        name: "Alcohol",
        date: null,
        savings: null,
      });
      await updateHabit(created.id, { savings: "5" });
      expect(Sentry.addBreadcrumb).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            habitId: created.id,
            updatedFields: ["savings"],
          }),
        }),
      );
    });
  });

  describe("deleteHabit", () => {
    it("removes the habit and persists", async () => {
      const first = await addHabit({ name: "A", date: null, savings: null });
      await addHabit({ name: "B", date: null, savings: null });
      await deleteHabit(first.id);
      const stored = await getHabits();
      expect(stored).toHaveLength(1);
      expect(stored[0].id).not.toBe(first.id);
    });

    it("is a no-op for unknown ids", async () => {
      await expect(deleteHabit("missing")).resolves.toBeUndefined();
      expect(await getHabits()).toEqual([]);
    });

    it("records a breadcrumb with the habit name", async () => {
      const created = await addHabit({
        name: "Tobacco",
        date: null,
        savings: null,
      });
      await deleteHabit(created.id);
      expect(Sentry.addBreadcrumb).toHaveBeenLastCalledWith(
        expect.objectContaining({
          message: "Deleted habit: Tobacco",
          data: expect.objectContaining({ habitId: created.id }),
        }),
      );
    });
  });
});
