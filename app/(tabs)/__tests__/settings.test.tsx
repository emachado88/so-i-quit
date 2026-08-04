import { act, fireEvent, screen } from "@testing-library/react-native";
import { jest } from "@jest/globals";
import React from "react";
import { AppState, Linking } from "react-native";

import SettingsScreen from "@/app/(tabs)/settings";
import * as milestoneNotifications from "@/lib/milestone-notifications";
import { renderWithProviders } from "@/test/utils";

jest.mock("@/lib/milestone-notifications", () => ({
  getNotificationPermissionStatus: jest.fn(async () => "undetermined"),
  isNotificationsSupported: jest.fn(() => false),
  requestNotificationPermission: jest.fn(async () => false),
  reconcileAllHabitNotifications: jest.fn(async () => {}),
  cancelAllMilestoneNotifications: jest.fn(async () => {}),
}));

const notif = milestoneNotifications as unknown as {
  getNotificationPermissionStatus: jest.Mock<any>;
  isNotificationsSupported: jest.Mock<any>;
  requestNotificationPermission: jest.Mock<any>;
  reconcileAllHabitNotifications: jest.Mock<any>;
  cancelAllMilestoneNotifications: jest.Mock<any>;
};

describe("app/(tabs)/settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    notif.isNotificationsSupported.mockReturnValue(false);
    notif.getNotificationPermissionStatus.mockResolvedValue("undetermined");
  });

  it("renders the appearance, language, currency and notification sections", async () => {
    await renderWithProviders(<SettingsScreen />);
    expect(screen.getByText("Appearance")).toBeOnTheScreen();
    expect(screen.getByText("Language")).toBeOnTheScreen();
    expect(screen.getByText("Currency")).toBeOnTheScreen();
    expect(screen.getByText("Milestone notifications")).toBeOnTheScreen();
  });

  it("persists the selected theme", async () => {
    const setTheme = jest.fn(async () => {});
    await renderWithProviders(<SettingsScreen />, { setTheme });
    await fireEvent.press(screen.getByText("Dark"));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("opens the language picker and selects a language", async () => {
    const setLanguage = jest.fn(async () => {});
    await renderWithProviders(<SettingsScreen />, { setLanguage });
    expect(screen.getByText("English")).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText("Language"));
    await fireEvent.press(screen.getByText("Português"));
    expect(setLanguage).toHaveBeenCalledWith("pt");
  });

  it("filters the currency picker by search and selects a currency", async () => {
    const setCurrency = jest.fn(async () => {});
    await renderWithProviders(<SettingsScreen />, { setCurrency });

    await fireEvent.press(screen.getByLabelText("Currency"));
    const searchbar = screen.getByPlaceholderText("Search currency…");
    await fireEvent.changeText(searchbar, "eur");

    // "€ EUR" appears both on the closed picker button and in the modal list.
    const options = screen.getAllByText("€ EUR");
    await fireEvent.press(options[options.length - 1]);
    expect(setCurrency).toHaveBeenCalledWith("EUR");
  });

  it("enables notifications directly when unsupported (Expo Go) and reconciles", async () => {
    const setMilestoneNotificationsEnabled = jest.fn(async () => {});
    await renderWithProviders(<SettingsScreen />, {
      setMilestoneNotificationsEnabled,
    });

    await fireEvent(screen.getByRole("switch"), "valueChange", true);

    expect(notif.requestNotificationPermission).not.toHaveBeenCalled();
    expect(setMilestoneNotificationsEnabled).toHaveBeenCalledWith(true);
    expect(notif.reconcileAllHabitNotifications).toHaveBeenCalled();
  });

  it("requests permission when enabling with undetermined OS permission", async () => {
    notif.isNotificationsSupported.mockReturnValue(true);
    notif.getNotificationPermissionStatus.mockResolvedValue("undetermined");
    notif.requestNotificationPermission.mockResolvedValue(true);
    const setMilestoneNotificationsEnabled = jest.fn(async () => {});
    await renderWithProviders(<SettingsScreen />, {
      setMilestoneNotificationsEnabled,
    });

    await fireEvent(screen.getByRole("switch"), "valueChange", true);

    expect(notif.requestNotificationPermission).toHaveBeenCalled();
    expect(setMilestoneNotificationsEnabled).toHaveBeenCalledWith(true);
    expect(notif.reconcileAllHabitNotifications).toHaveBeenCalled();
  });

  it("enables without re-requesting when permission is already granted", async () => {
    notif.isNotificationsSupported.mockReturnValue(true);
    notif.getNotificationPermissionStatus.mockResolvedValue("granted");
    const setMilestoneNotificationsEnabled = jest.fn(async () => {});
    await renderWithProviders(<SettingsScreen />, {
      setMilestoneNotificationsEnabled,
    });

    await fireEvent(screen.getByRole("switch"), "valueChange", true);

    expect(notif.requestNotificationPermission).not.toHaveBeenCalled();
    expect(setMilestoneNotificationsEnabled).toHaveBeenCalledWith(true);
  });

  it("disabling cancels all pending milestone notifications", async () => {
    notif.isNotificationsSupported.mockReturnValue(true);
    notif.getNotificationPermissionStatus.mockResolvedValue("granted");
    const setMilestoneNotificationsEnabled = jest.fn(async () => {});
    await renderWithProviders(<SettingsScreen />, {
      milestoneNotificationsEnabled: true,
      setMilestoneNotificationsEnabled,
    });

    await fireEvent(screen.getByRole("switch"), "valueChange", false);

    expect(setMilestoneNotificationsEnabled).toHaveBeenCalledWith(false);
    expect(notif.cancelAllMilestoneNotifications).toHaveBeenCalled();
  });

  it("shows the denied hint and links to system settings when permission is denied", async () => {
    notif.isNotificationsSupported.mockReturnValue(true);
    notif.getNotificationPermissionStatus.mockResolvedValue("denied");
    const openSettings = jest.spyOn(Linking, "openSettings").mockImplementation(async () => {});

    await renderWithProviders(<SettingsScreen />);

    expect(
      screen.getByText(
        "Notifications are turned off in your system settings. Enable them there to receive milestone celebrations.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link"));
    expect(openSettings).toHaveBeenCalled();
  });

  it("cancels schedules when the OS permission is revoked while the pref is on", async () => {
    notif.isNotificationsSupported.mockReturnValue(true);
    notif.getNotificationPermissionStatus.mockResolvedValue("denied");
    await renderWithProviders(<SettingsScreen />, {
      milestoneNotificationsEnabled: true,
    });
    expect(notif.cancelAllMilestoneNotifications).toHaveBeenCalled();
  });

  it("reconciles again when a denied permission is restored", async () => {
    notif.isNotificationsSupported.mockReturnValue(true);
    notif.getNotificationPermissionStatus
      .mockResolvedValueOnce("denied")
      .mockResolvedValueOnce("granted");
    const addListener = jest.spyOn(AppState, "addEventListener");

    await renderWithProviders(<SettingsScreen />, {
      milestoneNotificationsEnabled: true,
    });
    expect(notif.cancelAllMilestoneNotifications).toHaveBeenCalled();

    // App returns to the foreground → permission restored → reconcile.
    const handler = addListener.mock.calls[0]?.[1] as (state: string) => void;
    await act(async () => {
      handler("active");
    });
    expect(notif.reconcileAllHabitNotifications).toHaveBeenCalled();
  });

  it("shows an error snackbar when persisting the theme fails", async () => {
    const setTheme = jest.fn(async () => {
      throw new Error("nope");
    });
    await renderWithProviders(<SettingsScreen />, { setTheme });
    await fireEvent.press(screen.getByText("Dark"));
    expect(screen.getByText("Failed to save theme preference")).toBeOnTheScreen();
  });
});
