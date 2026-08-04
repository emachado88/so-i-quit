import { createContext, useContext } from "react";
import type { Theme } from "@/constants/types";
import type { TranslationKey } from "@/i18n/en";

type EffectiveScheme = "light" | "dark";

export interface AppSettingsValue {
  /** Resolved colour scheme (always "light" or "dark"). */
  scheme: EffectiveScheme;
  /** Persisted theme preference ("system", "light", or "dark"). */
  storedTheme: Theme;
  /** Persist new theme preference. */
  setTheme: (theme: Theme) => Promise<void>;
  /** ISO 4217 currency code (e.g. "EUR", "USD"). */
  currency: string;
  /** Persist new currency code. */
  setCurrency: (code: string) => Promise<void>;
  /** Current language code (e.g. "en", "pt", "fr"). */
  language: string;
  /** Persist new language code. */
  setLanguage: (code: string) => Promise<void>;
  /** Opt-in local milestone notifications. */
  milestoneNotificationsEnabled: boolean;
  /** Persist new milestone notification preference. */
  setMilestoneNotificationsEnabled: (enabled: boolean) => Promise<void>;
  /** Whether the post-wizard opt-in prompt was already shown. */
  milestoneNotificationsPrompted: boolean;
  /** Persist "prompt shown" flag. */
  setMilestoneNotificationsPrompted: (prompted: boolean) => Promise<void>;
  /** Translate a key with optional interpolation params. */
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

export const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export const useAppSettings = (): AppSettingsValue => {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return ctx;
};
