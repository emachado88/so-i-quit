import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import type { Habit, Milestone } from "@/constants/types";
import type { TranslationKey } from "@/i18n/en";
import {
  generateMilestones,
  isMilestoneReached,
  milestoneTargetDate,
  formatMilestoneLabel,
} from "@/lib/milestones";
import { getHabitName } from "@/utils/utils";
import {
  getMilestonesForHabits,
  saveMilestonesForHabit,
} from "@/data/milestones";

// ---------------------------------------------------------------------------
// Lazy expo-notifications access
// ---------------------------------------------------------------------------

/**
 * expo-notifications requires a development/production build. In Expo Go
 * (SDK 53+) the push-notification subsystem was removed and the module
 * itself throws when loaded. A static `import` would therefore crash Expo Go
 * before any guard could run, so we:
 *   - import the type only (erased at runtime, no module load);
 *   - load the module via `require()` lazily, and only when NOT in Expo Go.
 */
type NotificationsModule = typeof import("expo-notifications");

const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notificationsModule: NotificationsModule | null = null;

const getNotifications = (): NotificationsModule => {
  if (!notificationsModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require("expo-notifications") as NotificationsModule;
  }
  return notificationsModule;
};

// ---------------------------------------------------------------------------
// Foreground behavior
// ---------------------------------------------------------------------------

/**
 * Deliberate foreground behavior: while the app is active, incoming
 * milestone notifications are NOT surfaced as a native banner — the in-app
 * celebration queue is the single surface (see Progress screen). When the
 * app is backgrounded/closed, the OS delivers the scheduled notification
 * directly (this handler is not invoked in that state).
 */
if (!IS_EXPO_GO) {
  try {
    getNotifications().setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,
        shouldShowList: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Notifications unavailable (e.g. web) — ignore.
  }
}

export const MILESTONE_CHANNEL_ID = "milestones";

/** Ensure the Android notification channel exists before scheduling. */
export const ensureNotificationChannel = async (): Promise<void> => {
  if (Platform.OS !== "android" || IS_EXPO_GO) return;
  const Notifications = getNotifications();
  await Notifications.setNotificationChannelAsync(MILESTONE_CHANNEL_ID, {
    name: "Milestones",
    importance: Notifications.AndroidImportance.HIGH,
  });
};

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/** Current permission state (no user-facing prompt). */
export const getNotificationPermissionGranted = async (): Promise<boolean> => {
  if (IS_EXPO_GO) return false;
  const settings = await getNotifications().getPermissionsAsync();
  return settings.granted;
};

/** OS notification permission state (coarse, for the settings toggle). */
export type NotificationPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined";

/**
 * Read the OS-level notification permission. In Expo Go the subsystem is
 * unavailable — report "undetermined" so the toggle keeps working there.
 */
export const getNotificationPermissionStatus =
  async (): Promise<NotificationPermissionStatus> => {
    if (IS_EXPO_GO) return "undetermined";
    const settings = await getNotifications().getPermissionsAsync();
    // `granted` is already true for iOS provisional status.
    if (settings.granted) return "granted";
    if (settings.status === "denied") return "denied";
    return "undetermined";
  };

/** Whether the native notification subsystem is available (false in Expo Go). */
export const isNotificationsSupported = (): boolean => !IS_EXPO_GO;

/** Request permission (only inside the explained opt-in flow). */
export const requestNotificationPermission = async (): Promise<boolean> => {
  await ensureNotificationChannel();
  if (IS_EXPO_GO) return false;
  const settings = await getNotifications().requestPermissionsAsync();
  return settings.granted;
};

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

/** Schedule a single milestone notification and return the Expo id. */
export const scheduleMilestoneNotification = async (
  habit: Habit,
  milestone: Milestone,
  t: (key: TranslationKey, params?: Record<string, string>) => string,
): Promise<string> => {
  const target = milestoneTargetDate(habit, milestone);
  if (target.isBefore(new Date())) {
    throw new Error(
      `Cannot schedule milestone ${milestone.id}: target is in the past`,
    );
  }
  const Notifications = getNotifications();
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: t("milestone.notificationTitle"),
      body: t("milestone.notificationBody", {
        habit: getHabitName(habit, t),
        milestone: formatMilestoneLabel(milestone, t),
      }),
      data: { habitId: habit.id, milestoneId: milestone.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target.toDate(),
    },
  });
  return notificationId;
};

/** Cancel a single pending notification by Expo id. */
export const cancelMilestoneNotification = async (
  notificationId: string | null,
): Promise<void> => {
  if (!notificationId || IS_EXPO_GO) return;
  await getNotifications().cancelScheduledNotificationAsync(notificationId);
};

/** Register a listener for notification taps. No-op (returns a no-op
 * subscription) in Expo Go, where notifications are unavailable. */
export const addNotificationResponseListener = (
  onResponse: (habitId: string) => void,
): { remove: () => void } => {
  if (IS_EXPO_GO) return { remove: () => {} };
  const sub = getNotifications().addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as
        | { habitId?: string }
        | undefined;
      if (data?.habitId) onResponse(data.habitId);
    },
  );
  return sub;
};

// ---------------------------------------------------------------------------
// Reconcile
// ---------------------------------------------------------------------------

/**
 * Idempotently reconcile a habit's schedule against the current horizon:
 *  - preserve valid pending ids;
 *  - cancel stale ids (targets that no longer exist or already passed);
 *  - create missing future notifications;
 *  - persist the resulting milestone list.
 *
 * Returns the reconciled milestones; the caller persists via
 * saveMilestonesForHabit. Never schedules past targets.
 */
export const reconcileHabitNotifications = async (
  habit: Habit,
  stored: Milestone[],
  t: (key: TranslationKey, params?: Record<string, string>) => string,
  now: Date = new Date(),
): Promise<Milestone[]> => {
  if (!habit.date) return stored;
  // Scheduling is not available in Expo Go — return the stored list so the
  // rest of the app (in-app celebrations) keeps working unchanged.
  if (IS_EXPO_GO) return stored;

  const Notifications = getNotifications();
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const pendingById = new Map(
    pending.map((n) => [n.identifier, n] as [string, typeof n]),
  );

  const generated = generateMilestones(habit, now);
  const generatedIds = new Set(generated.map((m) => m.id));
  const storedById = new Map(stored.map((m) => [m.id, m]));

  // 1. Cancel notifications whose milestone no longer exists in the
  //    regenerated horizon (e.g. after a date edit shrinks the list).
  const staleIds = stored
    .filter((m) => m.notificationId && !generatedIds.has(m.id))
    .map((m) => m.notificationId as string);
  for (const id of staleIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }

  // 2. Reconcile each generated milestone.
  const reconciled: Milestone[] = [];
  for (const milestone of generated) {
    const previous = storedById.get(milestone.id);
    const reached = isMilestoneReached(habit, milestone, now);

    if (reached) {
      // Past target: never scheduled. Drop any stale stored id.
      if (previous?.notificationId && pendingById.has(previous.notificationId)) {
        await Notifications.cancelScheduledNotificationAsync(
          previous.notificationId,
        );
      }
      reconciled.push({
        ...milestone,
        reachedAt: previous?.reachedAt ?? now.toISOString(),
        notificationId: null,
      });
      continue;
    }

    // Future target: keep a still-pending id, otherwise schedule fresh.
    let notificationId: string | null = previous?.notificationId ?? null;
    if (!notificationId || !pendingById.has(notificationId)) {
      notificationId = await scheduleMilestoneNotification(
        habit,
        milestone,
        t,
      );
    }
    reconciled.push({
      ...milestone,
      reachedAt: previous?.reachedAt ?? null,
      notificationId,
    });
  }

  return reconciled;
};

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

/** Cancel every known milestone schedule across all habits. */
export const cancelAllMilestoneNotifications = async (
  habits: Habit[],
): Promise<void> => {
  if (IS_EXPO_GO) return;
  const Notifications = getNotifications();
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const known = new Set<string>();
  for (const habit of habits) {
    const milestones = await getMilestonesForHabits([habit], new Date());
    for (const milestone of milestones[habit.id] ?? []) {
      if (milestone.notificationId) known.add(milestone.notificationId);
    }
  }
  for (const notification of pending) {
    if (known.has(notification.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier,
      );
    }
  }
};

/** Cancel all pending ids stored for one habit (before delete/reset/edit). */
export const cancelHabitNotifications = async (
  milestones: Milestone[],
): Promise<void> => {
  if (IS_EXPO_GO) return;
  const Notifications = getNotifications();
  const ids = milestones
    .map((m) => m.notificationId)
    .filter((id): id is string => id !== null);
  for (const id of ids) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
};

/** Reconcile every dated habit after the preference is enabled. */
export const reconcileAllHabitNotifications = async (
  habits: Habit[],
  t: (key: TranslationKey, params?: Record<string, string>) => string,
): Promise<void> => {
  if (IS_EXPO_GO) return;
  const now = new Date();
  const dated = habits.filter((h) => h.date);
  const byHabit = await getMilestonesForHabits(dated, now);
  for (const habit of dated) {
    const stored = byHabit[habit.id] ?? [];
    const reconciled = await reconcileHabitNotifications(habit, stored, t, now);
    await saveMilestonesForHabit(habit.id, reconciled);
  }
};
