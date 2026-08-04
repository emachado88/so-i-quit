import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { describe, expect, it } from "@jest/globals";

import {
  DEFAULT_SETTINGS,
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
} from "@/data/settings";

const storage = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  multiGet: jest.Mock;
  multiSet: jest.Mock;
};

const setLocales = (locales: unknown[]) => {
  const target = (globalThis as unknown as { __rnTestLocales: unknown[] })
    .__rnTestLocales;
  target.splice(0, target.length, ...locales);
};

describe("data/settings", () => {
  describe("DEFAULT_SETTINGS", () => {
    it("has the expected shape", () => {
      expect(DEFAULT_SETTINGS).toEqual({
        theme: "system",
        language: "",
        currency: "EUR",
        milestoneNotificationsEnabled: false,
        milestoneNotificationsPrompted: false,
      });
    });
  });

  describe("getTheme", () => {
    it("returns the default when nothing is stored", async () => {
      expect(await getTheme()).toBe("system");
    });

    it("returns the stored theme", async () => {
      await storage.setItem("settings:theme", "dark");
      expect(await getTheme()).toBe("dark");
    });

    it("falls back to the default for invalid values", async () => {
      await storage.setItem("settings:theme", "neon");
      expect(await getTheme()).toBe("system");
    });

    it("falls back to the default when storage throws", async () => {
      storage.getItem.mockRejectedValueOnce(new Error("boom"));
      expect(await getTheme()).toBe("system");
    });
  });

  describe("getLanguage", () => {
    it("detects and persists the device language on first run", async () => {
      expect(await getLanguage()).toBe("en"); // default fixture is en-US
      expect(await storage.getItem("settings:language")).toBe("en");
    });

    it("returns the stored language when present", async () => {
      await storage.setItem("settings:language", "pt");
      expect(await getLanguage()).toBe("pt");
    });

    it("falls back to en when storage throws", async () => {
      storage.getItem.mockRejectedValueOnce(new Error("boom"));
      expect(await getLanguage()).toBe("en");
    });
  });

  describe("getCurrency", () => {
    it("detects from the device region on first run", async () => {
      expect(getLocales()).toHaveLength(1);
      expect(getLocales()[0]?.regionCode).toBe("US");
      expect(await storage.getItem("settings:currency")).toBeNull();
      expect(await getCurrency()).toBe("USD"); // default fixture region US
      expect(await storage.getItem("settings:currency")).toBe("USD");
    });

    it("maps PT region to EUR", async () => {
      setLocales([
        { languageTag: "pt-PT", languageCode: "pt", regionCode: "PT", currencyCode: "EUR" },
      ]);
      expect(await getCurrency()).toBe("EUR");
    });

    it("returns the stored currency when present", async () => {
      await storage.setItem("settings:currency", "GBP");
      expect(await getCurrency()).toBe("GBP");
    });

    it("falls back to the default when storage throws", async () => {
      storage.getItem.mockRejectedValueOnce(new Error("boom"));
      expect(await getCurrency()).toBe("EUR");
    });
  });

  describe("milestone notification flags", () => {
    it("reads 'true' as enabled", async () => {
      await storage.setItem("settings:milestoneNotifications", "true");
      expect(await getMilestoneNotificationsEnabled()).toBe(true);
    });

    it("reads anything else as disabled", async () => {
      await storage.setItem("settings:milestoneNotifications", "false");
      expect(await getMilestoneNotificationsEnabled()).toBe(false);
      expect(await getMilestoneNotificationsEnabled()).toBe(false); // missing key
    });

    it("tracks the prompted flag independently", async () => {
      await storage.setItem("settings:milestoneNotificationsPrompted", "true");
      expect(await getMilestoneNotificationsPrompted()).toBe(true);
      expect(await getMilestoneNotificationsEnabled()).toBe(false);
    });

    it("defaults to false when storage throws", async () => {
      storage.getItem.mockRejectedValueOnce(new Error("boom"));
      expect(await getMilestoneNotificationsEnabled()).toBe(false);
    });
  });

  describe("getSettings (batch)", () => {
    it("returns defaults when nothing is stored", async () => {
      const settings = await getSettings();
      expect(settings).toEqual({
        ...DEFAULT_SETTINGS,
        language: "en", // detected on first run
      });
    });

    it("returns persisted values", async () => {
      await storage.multiSet([
        ["settings:theme", "dark"],
        ["settings:language", "fr"],
        ["settings:currency", "CHF"],
        ["settings:milestoneNotifications", "true"],
        ["settings:milestoneNotificationsPrompted", "true"],
      ]);
      expect(await getSettings()).toEqual({
        theme: "dark",
        language: "fr",
        currency: "CHF",
        milestoneNotificationsEnabled: true,
        milestoneNotificationsPrompted: true,
      });
    });

    it("falls back to defaults when storage throws", async () => {
      storage.multiGet.mockRejectedValueOnce(new Error("boom"));
      expect(await getSettings()).toEqual({ ...DEFAULT_SETTINGS });
    });
  });

  describe("setters", () => {
    it("saveTheme writes the theme key", async () => {
      await saveTheme("dark");
      expect(await storage.getItem("settings:theme")).toBe("dark");
    });

    it("saveLanguage writes the language key", async () => {
      await saveLanguage("pt");
      expect(await storage.getItem("settings:language")).toBe("pt");
    });

    it("saveCurrency writes the currency key", async () => {
      await saveCurrency("USD");
      expect(await storage.getItem("settings:currency")).toBe("USD");
    });

    it("saveMilestoneNotificationsEnabled writes 'true'/'false'", async () => {
      await saveMilestoneNotificationsEnabled(true);
      expect(await storage.getItem("settings:milestoneNotifications")).toBe("true");
      await saveMilestoneNotificationsEnabled(false);
      expect(await storage.getItem("settings:milestoneNotifications")).toBe("false");
    });

    it("saveMilestoneNotificationsPrompted writes 'true'/'false'", async () => {
      await saveMilestoneNotificationsPrompted(true);
      expect(await storage.getItem("settings:milestoneNotificationsPrompted")).toBe("true");
    });

    it("saveSettings persists all five keys in one multiSet", async () => {
      await saveSettings({
        theme: "dark",
        language: "de",
        currency: "EUR",
        milestoneNotificationsEnabled: true,
        milestoneNotificationsPrompted: false,
      });
      expect(storage.multiSet).toHaveBeenCalledWith([
        ["settings:theme", "dark"],
        ["settings:language", "de"],
        ["settings:currency", "EUR"],
        ["settings:milestoneNotifications", "true"],
        ["settings:milestoneNotificationsPrompted", "false"],
      ]);
    });
  });
});
