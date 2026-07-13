import { createContext, useContext } from "react";
import type { Theme } from "@/constants/interfaces";

type EffectiveScheme = "light" | "dark";

export interface AppThemeValue {
  scheme: EffectiveScheme;
  storedTheme: Theme;
  setTheme: (theme: Theme) => Promise<void>;
}

export const AppThemeContext = createContext<AppThemeValue | null>(null);

export function useAppTheme(): AppThemeValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within AppThemeProvider");
  return ctx;
}
