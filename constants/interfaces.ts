export interface Habit {
  id: string;
  key?: string; // i18n key for standard habits (e.g. "habits.alcohol")
  name: string; // display name for custom habits, empty string for standard
  date: string | null;
  savings: string | null;
}

export type Theme = "system" | "light" | "dark";

export interface AppSettings {
  theme: Theme;
  language: string;
  currency: string;
}
