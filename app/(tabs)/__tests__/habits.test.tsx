import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { jest } from "@jest/globals";
import React from "react";
import { Alert, Platform } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

import HabitsScreen from "@/app/(tabs)/habits";
import * as habitsData from "@/data/habits";
import * as milestoneNotifications from "@/lib/milestone-notifications";
import { makeHabit, renderWithProviders } from "@/test/utils";

// Notification side effects are mocked (their logic has its own suite); the
// screen only needs to call them with the right arguments.
jest.mock("@/lib/milestone-notifications", () => ({
  requestNotificationPermission: jest.fn(async () => false),
  reconcileHabitNotifications: jest.fn(async (_habit: unknown, stored: unknown) => stored),
  cancelHabitNotifications: jest.fn(async () => {}),
}));

// Controllable DateTimePicker: renders a pressable that fires onValueChange
// (iOS flow), auto-fires on mount/mode change like the native picker, and
// exposes DateTimePickerAndroid.open for the Android flow.
jest.mock("@react-native-community/datetimepicker", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable } = require("react-native");
  const Picker = (props: any) => {
    const pick = () => {
      const forced = (globalThis as unknown as { __rnTestPickerValue?: Date })
        .__rnTestPickerValue;
      props.onValueChange?.({}, forced ?? props.value);
    };
    React.useEffect(() => {
      pick();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.mode]);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Pressable, {
        testID: "date-time-picker",
        onPress: pick,
      }),
      React.createElement(Pressable, {
        testID: "date-time-picker-cancel",
        onPress: () => props.onValueChange?.({}, undefined),
      }),
    );
  };
  return {
    __esModule: true,
    default: Picker,
    DateTimePickerAndroid: { open: jest.fn() },
  };
});

const notif = milestoneNotifications as unknown as {
  requestNotificationPermission: jest.Mock<any>;
  reconcileHabitNotifications: jest.Mock<any>;
  cancelHabitNotifications: jest.Mock<any>;
};

const readHabitsStorage = (): ReturnType<typeof makeHabit>[] =>
  JSON.parse(
    (globalThis as unknown as { __rnTestStorage: Map<string, string> }).__rnTestStorage.get(
      "habits",
    ) ?? "[]",
  );

const seedHabits = async (habits: ReturnType<typeof makeHabit>[]) => {
  (globalThis as unknown as { __rnTestStorage: Map<string, string> }).__rnTestStorage.set(
    "habits",
    JSON.stringify(habits),
  );
};

const openAndroidPicker = (callIndex = 0) =>
  (DateTimePickerAndroid.open as jest.Mock).mock.calls[callIndex][0] as {
    mode: string;
    value: Date;
    onValueChange: (event: unknown, date?: Date) => void;
    onDismiss: () => void;
  };

const completeWizardAndroid = async (date: Date, time: Date) => {
  // date picker → select
  await act(async () => {
    openAndroidPicker(0).onValueChange({}, date);
  });
  // time picker → select
  await act(async () => {
    openAndroidPicker(1).onValueChange({}, time);
  });
};

/**
 * Render the habits screen with fake timers active. The Paper Menu schedules
 * its mount-time hide animation on the (real) clock — its completion
 * callback then races the open (`setRendered(true)` can be undone by the
 * hide's `setRendered(false)`) and closes the menu. That race only loses on
 * cold/slow runs (single-test runs, CI), which is why menu tests must pin
 * the clock from render time.
 */
const renderHabits = async (overrides?: Parameters<typeof renderWithProviders>[1]) => {
  jest.useFakeTimers();
  return renderWithProviders(<HabitsScreen />, overrides);
};

/**
 * Open a habit's menu deterministically. Fake timers (active since the
 * render) let us drain the mount-time hide animation with
 * advanceTimersByTime before pressing, so nothing undoes the open.
 */
const openMenu = async (habitName = "Alcohol") => {
  const anchor = screen.getAllByLabelText(`Open menu ${habitName}`)[0];
  await act(async () => {
    jest.advanceTimersByTime(2000);
  });
  await fireEvent.press(anchor);
  jest.useRealTimers();
};

describe("app/(tabs)/habits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    notif.requestNotificationPermission.mockResolvedValue(false);
    (Platform as unknown as { OS: string }).OS = "android";
    delete (globalThis as unknown as { __rnTestPickerValue?: Date }).__rnTestPickerValue;
  });

  afterEach(() => {
    (Platform as unknown as { OS: string }).OS = "ios";
    // renderHabits() leaves fake timers on; restore so non-menu tests and
    // later suites run against the real clock.
    jest.useRealTimers();
  });

  it("shows the add buttons and the empty state", async () => {
    await renderWithProviders(<HabitsScreen />);
    expect(screen.getByText("Add New Habit")).toBeOnTheScreen();
    expect(screen.getByText("Alcohol")).toBeOnTheScreen();
    expect(screen.getByText("Tobacco")).toBeOnTheScreen();
    expect(screen.getByText("No habits added yet.")).toBeOnTheScreen();
  });

  it("hides standard habit buttons that already exist", async () => {
    await seedHabits([
      makeHabit({ id: "h1", key: "habits.alcohol", name: "", date: null, savings: null }),
    ]);
    await renderWithProviders(<HabitsScreen />);
    // The card still shows the (translated) habit name; the ADD button is gone.
    expect(screen.queryByRole("button", { name: "Alcohol" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tobacco" })).toBeOnTheScreen();
  });

  it("adds a standard habit and starts the Android wizard with the date picker", async () => {
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByText("Alcohol"));

    const stored = readHabitsStorage();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ key: "habits.alcohol", date: null });

    expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
    expect(openAndroidPicker(0).mode).toBe("date");
  });

  it("runs the full wizard, saves savings, and shows the opt-in dialog", async () => {
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByText("Alcohol"));

    const date = new Date("2025-01-01T00:00:00.000Z");
    const time = new Date("2025-01-01T10:30:00.000Z");
    await completeWizardAndroid(date, time);

    // Savings step.
    expect(screen.getByText("Daily Savings (optional)")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("0.00"), "5");
    await fireEvent.press(screen.getByText("Save"));

    // Persisted with merged date + savings; opt-in prompt shown for first wizard.
    const stored = readHabitsStorage();
    expect(stored[0].savings).toBe("5");
    expect(stored[0].date).toBe(new Date("2025-01-01T10:30:00.000Z").toISOString());
    expect(screen.getByText("Celebrate your milestones?")).toBeOnTheScreen();
  });

  it("deletes the just-created habit when the wizard is cancelled", async () => {
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByText("Tobacco"));
    expect(readHabitsStorage()).toHaveLength(1);

    await act(async () => {
      openAndroidPicker(0).onDismiss();
    });

    expect(readHabitsStorage()).toHaveLength(0);
    expect(screen.queryByText("Celebrate your milestones?")).toBeNull();
  });

  it("adds a custom habit with a capitalized name", async () => {
    const { container } = await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText("Add custom habit"));

    const input = container.queryAll(
      (i) => typeof i.props.onChangeText === "function",
    )[0];
    await fireEvent.changeText(input, "beer");
    await fireEvent.press(screen.getByText("Add"));

    const stored = readHabitsStorage();
    expect(stored[0]).toMatchObject({ name: "Beer" });
    expect(stored[0]).not.toHaveProperty("key");
    expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
  });

  it("alerts when the custom name is empty", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText("Add custom habit"));
    await fireEvent.press(screen.getByText("Add"));

    expect(alertSpy).toHaveBeenCalledWith("Error", "Please enter a habit name");
    expect(readHabitsStorage()).toHaveLength(0);
  });

  it("renders habit cards with formatted date and savings", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Vaping", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderWithProviders(<HabitsScreen />);
    expect(screen.getByText("Vaping")).toBeOnTheScreen();
    expect(screen.getByText("1 Jan 2025, 00:00")).toBeOnTheScreen();
    expect(screen.getByText("€5.00/day")).toBeOnTheScreen();
  });

  it("edits the date from the menu (Android date → time chain)", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderHabits();

    // The menu anchor duplicates the label (Pressable + inner IconButton).
    await openMenu();
    await fireEvent.press(screen.getByText("Edit date"));
    expect(openAndroidPicker(0).mode).toBe("date");
    const newDate = new Date("2024-06-15T00:00:00.000Z");
    await act(async () => {
      openAndroidPicker(0).onValueChange({}, newDate);
    });
    expect(openAndroidPicker(1).mode).toBe("time");
    const newTime = new Date("2024-06-15T20:45:00.000Z");
    await act(async () => {
      openAndroidPicker(1).onValueChange({}, newTime);
    });

    const stored = readHabitsStorage();
    expect(stored[0].date).toBe("2024-06-15T20:45:00.000Z");
  });

  it("edits savings from the menu", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderHabits();

    // The menu anchor duplicates the label (Pressable + inner IconButton).
    await openMenu();
    await fireEvent.press(screen.getByText("Edit savings"));
    expect(screen.getByText("Daily Savings")).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByPlaceholderText("0.00"), "5.25");
    await fireEvent.press(screen.getByText("Confirm"));
    expect(readHabitsStorage()[0].savings).toBe("5.25");
  });

  it("deletes a habit after confirmation, cancelling its notifications", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    const alertSpy = jest.spyOn(Alert, "alert");
    await renderHabits();

    // The menu anchor duplicates the label (Pressable + inner IconButton).
    await openMenu();
    await fireEvent.press(screen.getByText("Delete"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Delete Alcohol",
      "Are you sure you want to delete Alcohol?",
      expect.any(Array),
    );
    const buttons = alertSpy.mock.calls[0][2] as {
      text: string;
      style?: string;
      onPress?: () => Promise<void>;
    }[];
    const destructive = buttons.find((b) => b.style === "destructive")!;
    await act(async () => {
      await destructive.onPress!();
    });

    expect(readHabitsStorage()).toHaveLength(0);
    expect(notif.cancelHabitNotifications).toHaveBeenCalled();
  });

  it("resets a habit through the wizard without re-prompting opt-in", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "2" }),
    ]);
    await renderWithProviders(<HabitsScreen />);

    await fireEvent.press(screen.getByText("Log relapse"));
    const date = new Date("2025-03-03T00:00:00.000Z");
    const time = new Date("2025-03-03T09:00:00.000Z");
    await completeWizardAndroid(date, time);

    expect(screen.getByText("Daily Savings (optional)")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Skip"));

    const stored = readHabitsStorage();
    expect(stored[0].date).toBe("2025-03-03T09:00:00.000Z");
    expect(stored[0].savings).toBe("2"); // initial value kept via Skip
    expect(screen.queryByText("Celebrate your milestones?")).toBeNull();
  });

  it("opt-in Enable grants permission and schedules notifications", async () => {
    notif.requestNotificationPermission.mockResolvedValue(true);
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    const setMilestoneNotificationsEnabled = jest.fn(async () => {});
    const setMilestoneNotificationsPrompted = jest.fn(async () => {});
    await renderWithProviders(<HabitsScreen />, {
      setMilestoneNotificationsEnabled,
      setMilestoneNotificationsPrompted,
    });

    // Start + complete a new habit wizard to surface the opt-in dialog.
    await fireEvent.press(screen.getByText("Tobacco"));
    await completeWizardAndroid(
      new Date("2025-01-01T00:00:00.000Z"),
      new Date("2025-01-01T10:30:00.000Z"),
    );
    await fireEvent.press(screen.getByText("Skip"));
    expect(screen.getByText("Celebrate your milestones?")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Enable notifications"));
    expect(notif.requestNotificationPermission).toHaveBeenCalled();
    expect(setMilestoneNotificationsEnabled).toHaveBeenCalledWith(true);
    expect(notif.reconcileHabitNotifications).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText("Celebrate your milestones?")).toBeNull(),
    );
  });

  it("opt-in Not Now closes without enabling", async () => {
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByText("Alcohol"));
    await completeWizardAndroid(
      new Date("2025-01-01T00:00:00.000Z"),
      new Date("2025-01-01T10:30:00.000Z"),
    );
    await fireEvent.press(screen.getByText("Skip"));
    expect(screen.getByText("Celebrate your milestones?")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Not now"));
    expect(notif.requestNotificationPermission).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText("Celebrate your milestones?")).toBeNull(),
    );
  });

  it("shows a snackbar when adding a standard habit fails", async () => {
    jest.spyOn(habitsData, "addHabit").mockRejectedValue(new Error("boom"));
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByText("Alcohol"));
    expect(screen.getByText("Failed to add Alcohol")).toBeOnTheScreen();
  });

  it("runs the full wizard through the iOS date/time pickers", async () => {
    (Platform as unknown as { OS: string }).OS = "ios";
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByText("Alcohol"));

    // Picker rendered (iOS) — the mount auto-fire consumes the skip flag.
    const picker = screen.getByTestId("date-time-picker");
    expect(picker).toBeOnTheScreen();

    // Pick date.
    await fireEvent.press(picker);
    // Picker re-renders in time mode; its auto-fire consumes the skip flag.
    await fireEvent.press(picker);

    // Savings step reached.
    expect(screen.getByText("Daily Savings (optional)")).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByPlaceholderText("0.00"), "7.5");
    await fireEvent.press(screen.getByText("Save"));

    const stored = readHabitsStorage();
    expect(stored[0].savings).toBe("7.50"); // normalize() → toFixed(2)
    expect(stored[0].date).toBeDefined();
  });

  it("shows a snackbar when loading fails", async () => {
    jest.spyOn(habitsData, "getHabits").mockRejectedValue(new Error("boom"));
    await renderWithProviders(<HabitsScreen />);
    expect(screen.getByText("Failed to load habits")).toBeOnTheScreen();
  });

  it("cancels the whole wizard when the time picker is dismissed", async () => {
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByText("Alcohol"));
    expect(readHabitsStorage()).toHaveLength(1);

    // Date selected, then the time picker is cancelled → abort + delete.
    await act(async () => {
      openAndroidPicker(0).onValueChange({}, new Date("2025-01-01T00:00:00.000Z"));
    });
    await act(async () => {
      openAndroidPicker(1).onValueChange({}, undefined);
    });

    expect(readHabitsStorage()).toHaveLength(0);
    expect(screen.queryByText("Daily Savings (optional)")).toBeNull();
  });

  it("cancels the wizard when the date picker reports no value", async () => {
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByText("Alcohol"));

    await act(async () => {
      openAndroidPicker(0).onValueChange({}, undefined);
    });

    expect(readHabitsStorage()).toHaveLength(0);
  });

  it("reconciles notifications after a wizard when the preference is on", async () => {
    await renderWithProviders(<HabitsScreen />, {
      milestoneNotificationsEnabled: true,
    });
    await fireEvent.press(screen.getByText("Alcohol"));
    await completeWizardAndroid(
      new Date("2025-01-01T00:00:00.000Z"),
      new Date("2025-01-01T10:30:00.000Z"),
    );
    await fireEvent.press(screen.getByText("Skip"));

    expect(notif.reconcileHabitNotifications).toHaveBeenCalled();
    expect(screen.getByText("Celebrate your milestones?")).toBeOnTheScreen();
  });

  it("opt-in Enable with denied permission keeps the preference off", async () => {
    notif.requestNotificationPermission.mockResolvedValue(false);
    const setMilestoneNotificationsEnabled = jest.fn(async () => {});
    await renderWithProviders(<HabitsScreen />, {
      setMilestoneNotificationsEnabled,
    });
    await fireEvent.press(screen.getByText("Alcohol"));
    await completeWizardAndroid(
      new Date("2025-01-01T00:00:00.000Z"),
      new Date("2025-01-01T10:30:00.000Z"),
    );
    await fireEvent.press(screen.getByText("Skip"));
    await fireEvent.press(screen.getByText("Enable notifications"));

    expect(notif.requestNotificationPermission).toHaveBeenCalled();
    expect(setMilestoneNotificationsEnabled).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText("Celebrate your milestones?")).toBeNull(),
    );
  });

  it("reconciles notifications when editing the date with the preference on", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderHabits({
      milestoneNotificationsEnabled: true,
    });
    await openMenu();
    await fireEvent.press(screen.getByText("Edit date"));
    await act(async () => {
      openAndroidPicker(0).onValueChange({}, new Date("2024-06-15T00:00:00.000Z"));
    });
    await act(async () => {
      openAndroidPicker(1).onValueChange({}, new Date("2024-06-15T20:45:00.000Z"));
    });

    expect(notif.reconcileHabitNotifications).toHaveBeenCalled();
  });

  it("opens the edit-date picker for an undated habit", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: null, savings: null }),
    ]);
    await renderHabits();
    await openMenu();
    await fireEvent.press(screen.getByText("Edit date"));

    expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
    expect(openAndroidPicker(0).value).toBeInstanceOf(Date);
  });

  it("closes the editor when the edit-date picker is cancelled", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderHabits();
    await openMenu();
    await fireEvent.press(screen.getByText("Edit date"));

    await act(async () => {
      openAndroidPicker(0).onValueChange({}, undefined);
    });
    expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
  });

  it("closes the editor when the edit-time picker is cancelled", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderHabits();
    await openMenu();
    await fireEvent.press(screen.getByText("Edit date"));

    await act(async () => {
      openAndroidPicker(0).onValueChange({}, new Date("2024-06-15T00:00:00.000Z"));
    });
    await act(async () => {
      openAndroidPicker(1).onValueChange({}, undefined);
    });
    expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(2);
  });

  it("shows a snackbar when deleting fails", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    jest.spyOn(habitsData, "deleteHabit").mockRejectedValue(new Error("boom"));
    const alertSpy = jest.spyOn(Alert, "alert");
    await renderHabits();

    await openMenu();
    await fireEvent.press(screen.getByText("Delete"));
    const buttons = alertSpy.mock.calls[0][2] as {
      style?: string;
      onPress?: () => Promise<void>;
    }[];
    const destructive = buttons.find((b) => b.style === "destructive")!;
    await act(async () => {
      await destructive.onPress!();
    });

    expect(screen.getByText("Failed to delete Alcohol")).toBeOnTheScreen();
  });

  it("shows a snackbar when updating savings fails", async () => {
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    jest.spyOn(habitsData, "updateHabit").mockRejectedValue(new Error("boom"));
    await renderHabits();

    await openMenu();
    await fireEvent.press(screen.getByText("Edit savings"));
    await fireEvent.changeText(screen.getByPlaceholderText("0.00"), "5.25");
    await fireEvent.press(screen.getByText("Confirm"));

    expect(screen.getByText("Failed to update savings")).toBeOnTheScreen();
  });

  it("shows a snackbar when adding a custom habit fails", async () => {
    jest.spyOn(habitsData, "addHabit").mockRejectedValue(new Error("boom"));
    const { container } = await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByLabelText("Add custom habit"));
    const input = container.queryAll(
      (i) => typeof i.props.onChangeText === "function",
    )[0];
    await fireEvent.changeText(input, "beer");
    await fireEvent.press(screen.getByText("Add"));
    expect(screen.getByText("Failed to add custom habit")).toBeOnTheScreen();
  });

  it("edits the date through the iOS pickers (menu flow)", async () => {
    (Platform as unknown as { OS: string }).OS = "ios";
    await seedHabits([
      makeHabit({ id: "h1", name: "Alcohol", date: "2025-01-01T00:00:00.000Z", savings: "5" }),
    ]);
    await renderHabits();

    await openMenu();
    await fireEvent.press(screen.getByText("Edit date"));

    const picker = screen.getByTestId("date-time-picker");
    // Mount auto-fire consumes the skip flag.
    (globalThis as unknown as { __rnTestPickerValue?: Date }).__rnTestPickerValue =
      new Date("2024-06-15T00:00:00.000Z");
    // Date step → selects the forced date; time-mode re-render auto-fires;
    // next press merges and saves.
    await fireEvent.press(picker);
    await fireEvent.press(picker);

    const stored = readHabitsStorage();
    expect(stored[0].date).toBeDefined();
    expect(stored[0].date).not.toBe("2025-01-01T00:00:00.000Z");
  });

  it("cancels the iOS wizard when the picker reports no date", async () => {
    (Platform as unknown as { OS: string }).OS = "ios";
    await renderWithProviders(<HabitsScreen />);
    await fireEvent.press(screen.getByText("Alcohol"));
    expect(readHabitsStorage()).toHaveLength(1);

    const cancel = screen.getByTestId("date-time-picker-cancel");
    await fireEvent.press(cancel);

    expect(readHabitsStorage()).toHaveLength(0);
  });
});
