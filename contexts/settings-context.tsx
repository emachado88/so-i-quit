import { createContext, useContext } from "react";
import type { Theme } from "@/constants/interfaces";

type EffectiveScheme = "light" | "dark";

export interface AppSettingsValue {
  /** Resolved colour scheme (always "light" or "dark"). */
  scheme: EffectiveScheme;
  /** Persisted theme preference ("system", "light", or "dark"). */
  storedTheme: Theme;
  /** Persist a new theme preference. */
  setTheme: (theme: Theme) => Promise<void>;
  /** ISO 4217 currency code (e.g. "EUR", "USD"). */
  currency: string;
  /** Persist a new currency code. */
  setCurrency: (code: string) => Promise<void>;
}

export const AppSettingsContext = createContext<AppSettingsValue | null>(null);

export const useAppSettings = (): AppSettingsValue => {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return ctx;
};
