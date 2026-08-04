/**
 * Shared test helpers: provider-wrapped render + fixtures.
 *
 * - `renderWithProviders` wraps UI in a real AppSettingsContext.Provider with
 *   the real `useTranslation` implementation (so `t()` behaves like in app),
 *   while still allowing per-test overrides of any context field.
 * - `makeSettingsValue` builds a full context value with jest.fn() setters for
 *   tests that need to assert calls.
 */
import { render } from "@testing-library/react-native";
import React from "react";
import type { ReactElement, ReactNode } from "react";
import { jest } from "@jest/globals";

import type { Habit, Milestone } from "@/constants/types";
import {
  AppSettingsContext,
  type AppSettingsValue,
} from "@/contexts/settings-context";
import { useTranslation } from "@/i18n";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

export const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: "h1",
  name: "Alcohol",
  date: "2025-01-01T00:00:00.000Z",
  savings: "5",
  ...overrides,
});

export const makeMilestone = (
  overrides: Partial<Milestone> = {},
): Milestone => ({
  id: "h1-day-1",
  habitId: "h1",
  unit: "day",
  amount: 1,
  reachedAt: null,
  notificationId: null,
  ...overrides,
});

/** Full context value with jest.fn() async setters. */
export const makeSettingsValue = (
  overrides: Partial<AppSettingsValue> = {},
): AppSettingsValue => ({
  scheme: "light",
  storedTheme: "system",
  setTheme: jest.fn(async () => {}),
  currency: "EUR",
  setCurrency: jest.fn(async () => {}),
  language: "en",
  setLanguage: jest.fn(async () => {}),
  milestoneNotificationsEnabled: false,
  setMilestoneNotificationsEnabled: jest.fn(async () => {}),
  milestoneNotificationsPrompted: false,
  setMilestoneNotificationsPrompted: jest.fn(async () => {}),
  t: (key) => key,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Provider + render helper
// ---------------------------------------------------------------------------

const SettingsProvider = ({
  children,
  overrides,
}: {
  children: ReactNode;
  overrides?: Partial<AppSettingsValue>;
}) => {
  const { t } = useTranslation(overrides?.language ?? "en");
  const value: AppSettingsValue = {
    scheme: "light",
    storedTheme: "system",
    setTheme: jest.fn(async () => {}),
    currency: "EUR",
    setCurrency: jest.fn(async () => {}),
    language: overrides?.language ?? "en",
    setLanguage: jest.fn(async () => {}),
    milestoneNotificationsEnabled: false,
    setMilestoneNotificationsEnabled: jest.fn(async () => {}),
    milestoneNotificationsPrompted: false,
    setMilestoneNotificationsPrompted: jest.fn(async () => {}),
    t,
    ...overrides,
  };
  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const renderWithProviders = (
  ui: ReactElement,
  overrides?: Partial<AppSettingsValue>,
) => render(<SettingsProvider overrides={overrides}>{ui}</SettingsProvider>);
