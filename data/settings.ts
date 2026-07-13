import { AppSettings, Theme } from "@/constants/interfaces";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_THEME = "settings:theme";
const STORAGE_KEY_LANGUAGE = "settings:language";
const STORAGE_KEY_CURRENCY = "settings:currency";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  language: "",
  currency: "€",
};

// ---------------------------------------------------------------------------
// Getters
// ---------------------------------------------------------------------------

export const getTheme = async (): Promise<Theme> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY_THEME);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
    return DEFAULT_SETTINGS.theme;
  } catch {
    return DEFAULT_SETTINGS.theme;
  }
};

export const getLanguage = async (): Promise<string> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY_LANGUAGE);
    return value ?? DEFAULT_SETTINGS.language;
  } catch {
    return DEFAULT_SETTINGS.language;
  }
};

export const getCurrency = async (): Promise<string> => {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY_CURRENCY);
    return value ?? DEFAULT_SETTINGS.currency;
  } catch {
    return DEFAULT_SETTINGS.currency;
  }
};

/** Load all persisted settings in a single AsyncStorage call. */
export const getSettings = async (): Promise<AppSettings> => {
  try {
    const keys = [
      STORAGE_KEY_THEME,
      STORAGE_KEY_LANGUAGE,
      STORAGE_KEY_CURRENCY,
    ];
    const entries = await AsyncStorage.multiGet(keys);

    const rawTheme = entries[0][1];
    const theme: Theme =
      rawTheme === "light" || rawTheme === "dark" || rawTheme === "system"
        ? rawTheme
        : DEFAULT_SETTINGS.theme;

    const language = entries[1][1] ?? DEFAULT_SETTINGS.language;
    const currency = entries[2][1] ?? DEFAULT_SETTINGS.currency;

    return { theme, language, currency };
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

/** Persist all settings in a single AsyncStorage batch. */
export const saveSettings = async (settings: AppSettings): Promise<void> => {
  const keys: string[] = [];
  const values: string[] = [];

  keys.push(STORAGE_KEY_THEME);
  values.push(settings.theme);

  keys.push(STORAGE_KEY_LANGUAGE);
  values.push(settings.language);

  keys.push(STORAGE_KEY_CURRENCY);
  values.push(settings.currency);

  await AsyncStorage.multiSet(keys.map((k, i) => [k, values[i]]));
};
