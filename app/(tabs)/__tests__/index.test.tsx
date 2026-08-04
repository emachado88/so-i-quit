import { screen, fireEvent } from "@testing-library/react-native";
import { jest } from "@jest/globals";
import React from "react";
import { AppState } from "react-native";

import HomeScreen from "@/app/(tabs)/index";
import * as habitsData from "@/data/habits";
import * as milestoneNotifications from "@/lib/milestone-notifications";
import { makeHabit, renderWithProviders } from "@/test/utils";

// The screen imports lib/milestone-notifications; mock it so the
// notifications-enabled branch is observable without the native module.
jest.mock("@/lib/milestone-notifications", () => ({
  reconcileHabitNotifications: jest.fn(async (_habit: unknown, stored: unknown) => stored),
}));

const seedHabits = async (habits: ReturnType<typeof makeHabit>[]) => {
  (globalThis as unknown as { __rnTestStorage: Map<string, string> }).__rnTestStorage.set(
    "habits",
    JSON.stringify(habits),
  );
};

const seedMilestones = async (habitId: string, milestones: unknown[]) => {
  (globalThis as unknown as { __rnTestStorage: Map<string, string> }).__rnTestStorage.set(
    "milestones-v1",
    JSON.stringify({ [habitId]: milestones }),
  );
};

/** Stored (not-yet-reached) milestone record, as persisted by data/milestones. */
const makeMilestoneFixture = (
  id: string,
  unit: "day" | "week" | "month" | "year",
  amount: number,
) => ({
  id,
  habitId: "h1",
  unit,
  amount,
  reachedAt: null,
  notificationId: null,
});

describe("app/(tabs)/index (progress)", () => {
  beforeEach(() => {
    // The celebration queue only enqueues while the app is the active
    // surface; the jest RN preset leaves currentState undefined.
    (AppState as unknown as { currentState: string }).currentState = "active";
    jest.clearAllMocks();
    // Spy implementations (e.g. getHabits mockRejectedValue) must not leak
    // into subsequent tests.
    jest.restoreAllMocks();
  });

  it("redirects to the habits tab when there are no habits", async () => {
    await renderWithProviders(<HomeScreen />);
    const router = (globalThis as unknown as { __rnTestRouter: { replace: jest.Mock } }).__rnTestRouter;
    expect(router.replace).toHaveBeenCalledWith("/habits");
  });

  it("renders dated habits sorted oldest-first with breakdown and savings", async () => {
    await seedHabits([
      makeHabit({ id: "h2", name: "Smoking", date: "2025-01-01T00:00:00.000Z", savings: "2" }),
      makeHabit({ id: "h1", name: "Alcohol", date: "2020-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderWithProviders(<HomeScreen />);

    // Oldest first.
    const titles = screen.getAllByText(/ free for$/);
    expect(titles).toHaveLength(2);
    expect(titles[0]).toHaveTextContent("Alcohol free for");
    expect(titles[1]).toHaveTextContent("Smoking free for");

    // Breakdown years for the 2020 habit (2026 − 2020 = 6 years).
    expect(screen.getByText("6")).toBeOnTheScreen();
    expect(screen.getByText("years")).toBeOnTheScreen();

    // Per-habit savings line (€ per day × days since).
    expect(screen.getByText(/^€12,0/)).toBeTruthy(); // formatAmount, locale en-US
  });

  it("shows the total savings card when savings accumulate", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2024-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderWithProviders(<HomeScreen />);
    expect(screen.getByText("Total savings")).toBeOnTheScreen();
  });

  it("hides the total savings card when nothing has accumulated", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: null }),
    ]);
    await renderWithProviders(<HomeScreen />);
    expect(screen.queryByText("Total savings")).toBeNull();
  });

  it("shows the noData message and a link to habits for undated habits", async () => {
    await seedHabits([makeHabit({ id: "h1", name: "Alcohol", date: null, savings: null })]);
    await renderWithProviders(<HomeScreen />);
    expect(screen.getByText("No data saved in settings")).toBeOnTheScreen();
    expect(screen.getByText("Go to habits")).toBeOnTheScreen();
    expect(screen.queryByText(/ free for$/)).toBeNull();
  });

  it("enqueues an in-app celebration for a newly reached milestone", async () => {
    // Habit started 3 days ago, with day-1 and day-3 milestones stored as
    // NOT yet reached → both roll forward on load → day-1 celebrates first.
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await seedHabits([makeHabit({ id: "h1", name: "Alcohol", date: threeDaysAgo, savings: null })]);
    await seedMilestones("h1", [
      makeMilestoneFixture("h1-day-1", "day", 1),
      makeMilestoneFixture("h1-day-3", "day", 3),
    ]);
    await renderWithProviders(<HomeScreen />);
    expect(screen.getByText("Alcohol free for 1 day!")).toBeOnTheScreen();
  });

  it("shows a snackbar when a reload fails (habits already on screen)", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    const { rerender } = await renderWithProviders(<HomeScreen />);

    // The screen early-returns when the list is empty, so the snackbar is
    // only reachable when a subsequent load fails. Changing the
    // milestoneNotificationsEnabled dep re-runs the focus effect.
    jest.spyOn(habitsData, "getHabits").mockRejectedValue(new Error("boom"));
    await rerender(<HomeScreen />, { milestoneNotificationsEnabled: true });

    expect(screen.getByText("Failed to load habits")).toBeOnTheScreen();
  });

  it("reconciles native notifications when the preference is enabled", async () => {
    const reconcile = milestoneNotifications.reconcileHabitNotifications as jest.Mock;
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderWithProviders(<HomeScreen />, { milestoneNotificationsEnabled: true });
    expect(reconcile).toHaveBeenCalled();
  });

  it("does not reconcile notifications when the preference is off", async () => {
    const reconcile = milestoneNotifications.reconcileHabitNotifications as jest.Mock;
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderWithProviders(<HomeScreen />);
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("dismisses the celebration toast", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await seedHabits([makeHabit({ id: "h1", name: "Alcohol", date: threeDaysAgo, savings: null })]);
    await seedMilestones("h1", [
      makeMilestoneFixture("h1-day-1", "day", 1),
      makeMilestoneFixture("h1-day-3", "day", 3),
    ]);
    const { getByText, queryByText } = await renderWithProviders(<HomeScreen />);
    expect(getByText("Alcohol free for 1 day!")).toBeOnTheScreen();
    await fireEvent.press(getByText("Dismiss"));
    expect(queryByText("Alcohol free for 1 day!")).toBeNull();
  });
});
