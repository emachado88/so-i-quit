import { getLocales } from "expo-localization";

import type { AppSettings, Theme } from "@/constants/types";
import { REGION_TO_CURRENCY } from "@/constants/currencies";
import { detectLanguage } from "@/i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_THEME = "settings:theme";
const STORAGE_KEY_LANGUAGE = "settings:language";
const STORAGE_KEY_CURRENCY = "settings:currency";
const STORAGE_KEY_MILESTONE_NOTIFICATIONS = "settings:milestoneNotifications";
const STORAGE_KEY_MILESTONE_PROMPTED = "settings:milestoneNotificationsPrompted";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  language: "",
  currency: "EUR",
  milestoneNotificationsEnabled: false,
  milestoneNotificationsPrompted: false,
};

// ---------------------------------------------------------------------------
// First-run detection
// ---------------------------------------------------------------------------

/** Detect preferred currency from locale. Priority: currencyCode, region, EUR. */
const detectDefaultCurrency = (): string => {
  try {
    const locale = getLocales()[0];
    if (!locale) return DEFAULT_SETTINGS.currency;

    // Region-based mapping first — the user's country setting is more
    // reliable than locale-derived currencyCode (e.g. en-GB language in

    if (locale.regionCode) {
      const mapped = REGION_TO_CURRENCY[locale.regionCode.toUpperCase()];
      if (mapped) return mapped;
    }

    // Fall back to the locale's native currency hint
    if (locale.currencyCode?.length === 3) return locale.currencyCode;
  } catch {
    // fall through
  }
  return DEFAULT_SETTINGS.currency;
};

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

export const getTheme = async (): Promise<Theme> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY_THEME);
    if (value === "light" || value === "dark" || value === "system") {
      return value as Theme;
    }
    return DEFAULT_SETTINGS.theme;
  } catch {
    return DEFAULT_SETTINGS.theme;
  }
};

export const getLanguage = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_LANGUAGE);
    if (stored) return stored;
    const detected = detectLanguage();
    await AsyncStorage.setItem(STORAGE_KEY_LANGUAGE, detected);
    return detected;
  } catch {
    return DEFAULT_SETTINGS.language || "en";
  }
};

export const getCurrency = async (): Promise<string> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_CURRENCY);
    if (stored) return stored;
    const detected = detectDefaultCurrency();
    await AsyncStorage.setItem(STORAGE_KEY_CURRENCY, detected);
    return detected;
  } catch {
    return DEFAULT_SETTINGS.currency;
  }
};

export const getMilestoneNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const stored = await AsyncStorage.getItem(
      STORAGE_KEY_MILESTONE_NOTIFICATIONS,
    );
    return stored === "true";
  } catch {
    return DEFAULT_SETTINGS.milestoneNotificationsEnabled;
  }
};

export const getMilestoneNotificationsPrompted = async (): Promise<boolean> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY_MILESTONE_PROMPTED);
    return stored === "true";
  } catch {
    return DEFAULT_SETTINGS.milestoneNotificationsPrompted;
  }
};

/** Load all persisted settings in a single batch. */
export const getSettings = async (): Promise<AppSettings> => {
  try {
    const entries = await AsyncStorage.multiGet([
      STORAGE_KEY_THEME,
      STORAGE_KEY_LANGUAGE,
      STORAGE_KEY_CURRENCY,
      STORAGE_KEY_MILESTONE_NOTIFICATIONS,
      STORAGE_KEY_MILESTONE_PROMPTED,
    ]);
    const rawTheme = entries[0][1];
    const theme: Theme =
      rawTheme === "light" || rawTheme === "dark" || rawTheme === "system"
        ? (rawTheme as Theme)
        : DEFAULT_SETTINGS.theme;
    const language = entries[1][1] ?? detectLanguage();
    const currency = entries[2][1] ?? DEFAULT_SETTINGS.currency;
    const milestoneNotificationsEnabled = entries[3][1] === "true";
    const milestoneNotificationsPrompted = entries[4][1] === "true";
    return {
      theme,
      language,
      currency,
      milestoneNotificationsEnabled,
      milestoneNotificationsPrompted,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

// ---------------------------------------------------------------------------
// Setters
// ---------------------------------------------------------------------------

export const saveTheme = async (theme: Theme): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY_THEME, theme);
};

export const saveLanguage = async (language: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY_LANGUAGE, language);
};

export const saveCurrency = async (currency: string): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY_CURRENCY, currency);
};

export const saveMilestoneNotificationsEnabled = async (
  enabled: boolean,
): Promise<void> => {
  await AsyncStorage.setItem(
    STORAGE_KEY_MILESTONE_NOTIFICATIONS,
    String(enabled),
  );
};

export const saveMilestoneNotificationsPrompted = async (
  prompted: boolean,
): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY_MILESTONE_PROMPTED, String(prompted));
};

/** Persist all settings in a single batch. */
export const saveSettings = async (settings: AppSettings): Promise<void> => {
  const keys: string[] = [
    STORAGE_KEY_THEME,
    STORAGE_KEY_LANGUAGE,
    STORAGE_KEY_CURRENCY,
    STORAGE_KEY_MILESTONE_NOTIFICATIONS,
    STORAGE_KEY_MILESTONE_PROMPTED,
  ];
  const values: string[] = [
    settings.theme,
    settings.language,
    settings.currency,
    String(settings.milestoneNotificationsEnabled),
    String(settings.milestoneNotificationsPrompted),
  ];
  await AsyncStorage.multiSet(
    keys.map((k, i) => [k, values[i]] as [string, string]),
  );
};
