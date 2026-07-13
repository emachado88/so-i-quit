export interface Habit {
  id: string;
  name: string;
  date: string | null;
  savings: string | null;
}

export type Theme = "system" | "light" | "dark";

export interface AppSettings {
  theme: Theme;
  language: string;
  currency: string;
}
