import { Platform } from "react-native";
import { beforeEach, describe, expect, it } from "@jest/globals";

import { makeHabit, makeMilestone } from "@/test/utils";

// Mocked BEFORE the lib module loads (it lazy-requires expo-notifications
// behind an Expo Go guard; in the native path the module is loaded for real).
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ granted: true, status: "granted" })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, status: "granted" })),
  scheduleNotificationAsync: jest.fn(async () => "notif-1"),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  SchedulableTriggerInputTypes: { DATE: "date" },
  AndroidImportance: { HIGH: 4 },
}));

// Must live in THIS file: jest.isolateModules only re-applies mocks declared
// in the test file (not the setup file) to the isolated registry. The getter
// reads the shared __rnTestConstants fixture so each suite can toggle the
// environment before reloading the module.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    get executionEnvironment() {
      return (
        globalThis as unknown as { __rnTestConstants: { executionEnvironment: string } }
      ).__rnTestConstants.executionEnvironment;
    },
  },
  ExecutionEnvironment: {
    StoreClient: "StoreClient",
    Bare: "Bare",
    Standalone: "Standalone",
  },
}));

import * as Notifications from "expo-notifications";
import * as milestoneData from "@/data/milestones";

type NotificationsLib = typeof import("@/lib/milestone-notifications");

const notificationsMock = Notifications as unknown as Record<
  string,
  jest.Mock
>;

const setExecutionEnvironment = (value: string) => {
  (globalThis as unknown as { __rnTestConstants: { executionEnvironment: string } })
    .__rnTestConstants.executionEnvironment = value;
};

/**
 * Load the lib module inside an isolated registry so the module-level
 * IS_EXPO_GO constant is evaluated against the environment we just set.
 */
const loadModule = (): NotificationsLib => {
  let mod: NotificationsLib;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require("@/lib/milestone-notifications");
  });
  return mod!;
};

const t = (key: string, params?: Record<string, string>): string => {
  const map: Record<string, string> = {
    "milestone.notificationTitle": "Milestone reached!",
    "milestone.notificationBody": "{{habit}}: {{milestone}}",
    "milestone.day.one": "day",
    "milestone.day.other": "days",
  };
  const template = map[key] ?? key;
  return params
    ? template.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? `{{${k}}}`)
    : template;
};

beforeEach(() => {
  jest.clearAllMocks();
  setExecutionEnvironment("StoreClient");
});

// ---------------------------------------------------------------------------
// Expo Go path (executionEnvironment === "StoreClient")
// ---------------------------------------------------------------------------

describe("lib/milestone-notifications (Expo Go)", () => {
  let lib: NotificationsLib;

  beforeEach(() => {
    lib = loadModule();
  });

  it("reports notifications as unsupported", () => {
    expect(lib.isNotificationsSupported()).toBe(false);
  });

  it("reports permission status as undetermined", async () => {
    expect(await lib.getNotificationPermissionStatus()).toBe("undetermined");
    expect(await lib.getNotificationPermissionGranted()).toBe(false);
  });

  it("ensureNotificationChannel is a no-op", async () => {
    await lib.ensureNotificationChannel();
    expect(notificationsMock.setNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it("cancel functions are no-ops", async () => {
    await lib.cancelMilestoneNotification("nid");
    expect(notificationsMock.cancelScheduledNotificationAsync).not.toHaveBeenCalled();

    await lib.cancelHabitNotifications([makeMilestone({ notificationId: "nid" })]);
    expect(notificationsMock.cancelScheduledNotificationAsync).not.toHaveBeenCalled();

    await lib.cancelAllMilestoneNotifications([makeHabit()]);
    expect(notificationsMock.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });

  it("reconcileHabitNotifications returns the stored list unchanged", async () => {
    const stored = [makeMilestone()];
    const result = await lib.reconcileHabitNotifications(
      makeHabit(),
      stored,
      t as never,
      new Date("2025-06-01T00:00:00Z"),
    );
    expect(result).toBe(stored);
    expect(notificationsMock.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("addNotificationResponseListener returns a no-op subscription", () => {
    const sub = lib.addNotificationResponseListener(() => {});
    expect(typeof sub.remove).toBe("function");
    expect(
      notificationsMock.addNotificationResponseReceivedListener,
    ).not.toHaveBeenCalled();
  });

  it("reconcileAllHabitNotifications is a no-op", async () => {
    await lib.reconcileAllHabitNotifications([makeHabit()], t as never);
    expect(notificationsMock.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Native path (non-StoreClient environment)
// ---------------------------------------------------------------------------

describe("lib/milestone-notifications (native)", () => {
  let lib: NotificationsLib;

  beforeEach(() => {
    setExecutionEnvironment("Bare");
    lib = loadModule();
  });

  it("registers the foreground notification handler on load", () => {
    expect(notificationsMock.setNotificationHandler).toHaveBeenCalledWith({
      handleNotification: expect.any(Function),
    });
  });

  it("reports notifications as supported", () => {
    expect(lib.isNotificationsSupported()).toBe(true);
  });

  describe("ensureNotificationChannel", () => {
    it("creates the Android channel only on Android", async () => {
      jest.replaceProperty(Platform, "OS", "android");
      await lib.ensureNotificationChannel();
      expect(notificationsMock.setNotificationChannelAsync).toHaveBeenCalledWith(
        "milestones",
        { name: "Milestones", importance: 4 },
      );
    });

    it("skips on non-Android platforms", async () => {
      jest.replaceProperty(Platform, "OS", "ios");
      await lib.ensureNotificationChannel();
      expect(notificationsMock.setNotificationChannelAsync).not.toHaveBeenCalled();
    });
  });

  describe("permissions", () => {
    it("maps granted permission to 'granted'", async () => {
      notificationsMock.getPermissionsAsync.mockResolvedValue({
        granted: true,
        status: "granted",
      });
      expect(await lib.getNotificationPermissionStatus()).toBe("granted");
      expect(await lib.getNotificationPermissionGranted()).toBe(true);
    });

    it("maps a denied status to 'denied'", async () => {
      notificationsMock.getPermissionsAsync.mockResolvedValue({
        granted: false,
        status: "denied",
      });
      expect(await lib.getNotificationPermissionStatus()).toBe("denied");
    });

    it("maps anything else to 'undetermined'", async () => {
      notificationsMock.getPermissionsAsync.mockResolvedValue({
        granted: false,
        status: "undetermined",
      });
      expect(await lib.getNotificationPermissionStatus()).toBe("undetermined");
    });

    it("requestNotificationPermission requests and returns granted", async () => {
      notificationsMock.requestPermissionsAsync.mockResolvedValue({
        granted: true,
        status: "granted",
      });
      expect(await lib.requestNotificationPermission()).toBe(true);
      expect(notificationsMock.requestPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe("scheduleMilestoneNotification", () => {
    it("throws for targets in the past", async () => {
      const habit = makeHabit({ date: "2020-01-01T00:00:00.000Z" });
      const milestone = makeMilestone({ unit: "day", amount: 1 });
      await expect(
        lib.scheduleMilestoneNotification(habit, milestone, t as never),
      ).rejects.toThrow("Cannot schedule milestone");
      expect(notificationsMock.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("schedules future targets with interpolated content", async () => {
      const habit = makeHabit({ name: "Alcohol", date: "2027-01-01T00:00:00.000Z" });
      const milestone = makeMilestone({ unit: "day", amount: 1 });
      const id = await lib.scheduleMilestoneNotification(habit, milestone, t as never);
      expect(id).toBe("notif-1");
      expect(notificationsMock.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: "Milestone reached!",
            body: "Alcohol: 1 day",
            data: { habitId: "h1", milestoneId: "h1-day-1" },
          }),
          trigger: expect.objectContaining({
            type: "date",
            date: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe("cancelMilestoneNotification", () => {
    it("cancels a pending id", async () => {
      await lib.cancelMilestoneNotification("nid-1");
      expect(notificationsMock.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        "nid-1",
      );
    });

    it("ignores null ids", async () => {
      await lib.cancelMilestoneNotification(null);
      expect(notificationsMock.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe("addNotificationResponseListener", () => {
    const captureListener = () => {
      const listener = jest.fn();
      notificationsMock.addNotificationResponseReceivedListener.mockImplementation(
        (cb: (response: unknown) => void) => {
          listener.mockImplementation(cb);
          return { remove: jest.fn() };
        },
      );
      return listener;
    };

    it("forwards the habitId from tapped notifications", () => {
      const onResponse = jest.fn();
      const listener = captureListener();
      lib.addNotificationResponseListener(onResponse);
      listener({
        notification: { request: { content: { data: { habitId: "h1" } } } },
      });
      expect(onResponse).toHaveBeenCalledWith("h1");
    });

    it("ignores notifications without a habitId", () => {
      const onResponse = jest.fn();
      const listener = captureListener();
      lib.addNotificationResponseListener(onResponse);
      listener({ notification: { request: { content: { data: {} } } } });
      expect(onResponse).not.toHaveBeenCalled();
    });
  });

  describe("reconcileHabitNotifications", () => {
    // Dates in 2027: the scheduler compares targets against the real clock
    // (new Date()), so fixtures must be in the future of the test run.
    const habit = makeHabit({ date: "2027-01-01T00:00:00.000Z" });

    it("schedules every future milestone and persists ids", async () => {
      const reconciled = await lib.reconcileHabitNotifications(
        habit,
        [],
        t as never,
        new Date("2027-01-01T06:00:00Z"),
      );
      expect(reconciled.length).toBeGreaterThan(0);
      expect(notificationsMock.scheduleNotificationAsync).toHaveBeenCalled();
      expect(reconciled.every((m) => m.notificationId === "notif-1")).toBe(true);
    });

    it("marks reached milestones as reached with no notification", async () => {
      const reconciled = await lib.reconcileHabitNotifications(
        habit,
        [],
        t as never,
        new Date("2027-01-05T06:00:00Z"),
      );
      const reached = reconciled.filter((m) => m.reachedAt !== null);
      const pending = reconciled.filter((m) => m.notificationId !== null);
      expect(reached.length).toBeGreaterThan(0);
      expect(pending.length).toBeGreaterThan(0);
      expect(
        reconciled
          .filter((m) => m.reachedAt !== null)
          .every((m) => m.notificationId === null),
      ).toBe(true);
    });

    it("keeps a still-pending notification id without rescheduling", async () => {
      const stored = [
        makeMilestone({ id: "h1-day-1", unit: "day", amount: 1, notificationId: "keep-1" }),
      ];
      notificationsMock.getAllScheduledNotificationsAsync.mockResolvedValue([
        { identifier: "keep-1" },
      ]);
      const reconciled = await lib.reconcileHabitNotifications(
        habit,
        stored,
        t as never,
        new Date("2027-01-01T06:00:00Z"),
      );
      const day1 = reconciled.find((m) => m.id === "h1-day-1");
      expect(day1?.notificationId).toBe("keep-1");
    });

    it("cancels stale ids for milestones that no longer exist", async () => {
      const stored = [
        makeMilestone({ id: "h1-year-99", unit: "year", amount: 99, notificationId: "stale-1" }),
      ];
      await lib.reconcileHabitNotifications(
        habit,
        stored,
        t as never,
        new Date("2027-01-01T06:00:00Z"),
      );
      expect(notificationsMock.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        "stale-1",
      );
    });

    it("returns the stored list unchanged for undated habits", async () => {
      const stored = [makeMilestone()];
      const undated = makeHabit({ date: null });
      const result = await lib.reconcileHabitNotifications(
        undated,
        stored,
        t as never,
        new Date(),
      );
      expect(result).toBe(stored);
      expect(notificationsMock.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe("bulk operations", () => {
    it("cancelHabitNotifications cancels every non-null id", async () => {
      await lib.cancelHabitNotifications([
        makeMilestone({ notificationId: "a" }),
        makeMilestone({ notificationId: null }),
        makeMilestone({ notificationId: "c" }),
      ]);
      expect(notificationsMock.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
    });

    it("cancelAllMilestoneNotifications only cancels known ids", async () => {
      notificationsMock.getAllScheduledNotificationsAsync.mockResolvedValue([
        { identifier: "known-1" },
        { identifier: "unknown-1" },
      ]);
      await milestoneData.saveMilestonesForHabit("h1", [
        makeMilestone({ notificationId: "known-1" }),
      ]);
      await lib.cancelAllMilestoneNotifications([makeHabit()]);
      expect(notificationsMock.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
        "known-1",
      );
      expect(notificationsMock.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(
        "unknown-1",
      );
    });

    it("reconcileAllHabitNotifications schedules and persists per habit", async () => {
      const first = makeHabit({ date: "2027-01-01T00:00:00.000Z" });
      const second = makeHabit({ id: "h2", name: "Tobacco", date: "2027-01-01T00:00:00.000Z" });
      await lib.reconcileAllHabitNotifications([first, second], t as never);
      expect(notificationsMock.scheduleNotificationAsync).toHaveBeenCalled();
      expect((await milestoneData.getMilestonesForHabit("h1")).length).toBeGreaterThan(0);
      expect((await milestoneData.getMilestonesForHabit("h2")).length).toBeGreaterThan(0);
    });
  });
});
