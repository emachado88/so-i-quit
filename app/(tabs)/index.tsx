import { ThemedText } from "@/components/themed-text";
import { CounterText, TimeValue } from "@/components/animated-counters";
import type { Habit, Milestone } from "@/constants/types";
import { globalStyles } from "@/constants/styles";
import { themes } from "@/constants/theme";
import { useAppSettings } from "@/contexts/settings-context";
import { getHabits } from "@/data/habits";
import {
  ensureMilestonesForHabit,
  getMilestonesForHabits,
  saveMilestonesForHabit,
} from "@/data/milestones";
import {
  formatMilestoneLabel,
  getNextMilestone,
  ringProgress,
} from "@/lib/milestones";
import { reconcileHabitNotifications } from "@/lib/milestone-notifications";
import {
  breakdown,
  daysSince,
  formatAmount,
  getHabitName,
  parseSavings,
} from "@/utils/utils";
import { Link, useFocusEffect, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { AppState, ScrollView, StyleSheet, View } from "react-native";
import { Card, Snackbar } from "react-native-paper";
import dayjs from "dayjs";
import { MilestoneRing } from "@/components/milestone-ring";

/** Pending in-app celebration (newly crossed milestone). */
interface Celebration {
  habitId: string;
  milestone: Milestone;
}

export default function HomeScreen() {
  const { scheme, currency, t, milestoneNotificationsEnabled } =
    useAppSettings();
  const navigation = useNavigation();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [milestonesByHabit, setMilestonesByHabit] = useState<
    Record<string, Milestone[]>
  >({});
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);

  // Tick counter to trigger re-renders so breakdown() updates in real-time
  const [, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const loadHabits = async () => {
        try {
          const data = await getHabits();
          setHabits(data);

          // Reconcile milestones: roll reached targets forward and collect
          // newly crossed milestones for the in-app celebration queue.
          const now = new Date();
          const newly: Celebration[] = [];
          const dated = data.filter((h) => h.date);
          const byHabit = await getMilestonesForHabits(dated, now);
          for (const habit of dated) {
            const result = await ensureMilestonesForHabit(habit, now);
            byHabit[habit.id] = result.milestones;
            for (const milestone of result.newlyReached) {
              newly.push({ habitId: habit.id, milestone });
            }
            // Extend the native schedule through the current rolling horizon
            // when notifications are enabled (new annuals get scheduled).
            if (milestoneNotificationsEnabled) {
              const reconciled = await reconcileHabitNotifications(
                habit,
                byHabit[habit.id],
                t,
                now,
              );
              byHabit[habit.id] = reconciled;
              await saveMilestonesForHabit(habit.id, reconciled);
            }
          }
          setMilestonesByHabit(byHabit);

          // Only enqueue in-app toasts while the app is the active surface;
          // when backgrounded the OS notification already covered it.
          if (newly.length > 0 && AppState.currentState === "active") {
            setCelebrations((prev) => [...prev, ...newly]);
          }
        } catch (error) {
          console.error("Error loading habits:", error);
          setSnackbarMessage(t("progress.failedToLoad"));
        }
      };

      loadHabits();
      const interval = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(interval);
    }, [t, milestoneNotificationsEnabled]),
  );

  useEffect(() => {
    const title =
      habits.length === 0
        ? t("progress.readyToGetBetter")
        : t("progress.congratulations");
    navigation.setOptions({ headerTitle: title });
  }, [habits, navigation, t]);

  // Pop the front of the celebration queue, one toast at a time.
  const dismissCelebration = useCallback(() => {
    setCelebrations((prev) => prev.slice(1));
  }, []);

  const activeCelebration = celebrations[0] ?? null;
  const activeHabit =
    activeCelebration != null
      ? (habits.find((h) => h.id === activeCelebration.habitId) ?? null)
      : null;

  const hasAnyHabitWithDate = habits.some((h) => h.date);

  // Calculate total savings across all habits
  const totalSavings = habits.reduce((acc, habit) => {
    return acc + daysSince(habit.date) * parseSavings(habit.savings);
  }, 0);

  return (
    <View style={globalStyles.flex1}>
      <View style={[globalStyles.container, globalStyles.shadow]}>
        <ThemedText type="subtitle">
          {hasAnyHabitWithDate
            ? t("progress.doingGreat")
            : t("progress.noData")}
        </ThemedText>
        {!hasAnyHabitWithDate && (
          <Link href="/habits" style={{ color: themes[scheme].colors.primary }}>
            {t("progress.goToHabits")}
          </Link>
        )}
      </View>
      <ScrollView
        contentContainerStyle={[globalStyles.container, styles.scrollContent]}
      >
        {habits
          .filter((h) => h.date)
          .sort((a, b) => a.date?.localeCompare(b.date as string) as number)
          .map((habit) => {
            const { years, months, days, hours } = breakdown(habit.date);
            const totalHabitSavings =
              daysSince(habit.date) * parseSavings(habit.savings);
            const milestones = milestonesByHabit[habit.id] ?? [];
            const next = getNextMilestone(habit, milestones, new Date());
            const progress = ringProgress(habit, milestones, new Date());

            return (
              <Card key={habit.id} mode="contained">
                <Card.Title
                  title={t("progress.freeFor", {
                    name: getHabitName(habit, t),
                  })}
                  titleStyle={[
                    globalStyles.spacedUppercase,
                    { color: themes[scheme].colors.secondary },
                  ]}
                />
                <Card.Content>
                  <View style={styles.cardCounters}>
                    <View style={styles.cardRow}>
                      {years ? (
                        <View style={styles.statColumn}>
                          <TimeValue value={years} />
                          <ThemedText style={styles.timeSubtitle}>
                            {t(
                              years === 1 ? "progress.year" : "progress.years",
                            )}
                          </ThemedText>
                        </View>
                      ) : null}
                      {months ? (
                        <View style={styles.statColumn}>
                          <TimeValue value={months} />
                          <ThemedText style={styles.timeSubtitle}>
                            {t(
                              months === 1
                                ? "progress.month"
                                : "progress.months",
                            )}
                          </ThemedText>
                        </View>
                      ) : null}
                      {days ? (
                        <View style={styles.statColumn}>
                          <TimeValue value={days} />
                          <ThemedText style={styles.timeSubtitle}>
                            {t(days === 1 ? "progress.day" : "progress.days")}
                          </ThemedText>
                        </View>
                      ) : null}
                      {hours ? (
                        <View style={styles.statColumn}>
                          <TimeValue value={hours} />
                          <ThemedText style={styles.timeSubtitle}>
                            {t(
                              hours === 1 ? "progress.hour" : "progress.hours",
                            )}
                          </ThemedText>
                        </View>
                      ) : null}
                      {!years && !months && !days && !hours && (
                        <View style={styles.statColumn}>
                          <ThemedText>{t("progress.justStarted")}</ThemedText>
                        </View>
                      )}
                    </View>
                    <MilestoneRing
                      progress={progress}
                      size={60}
                      strokeWidth={8}
                      color={themes[scheme].colors.primary}
                      trackColor={themes[scheme].colors.surfaceDisabled}
                    />
                  </View>
                  {next != null && (
                    <View style={{ width: "100%" }}>
                      <ThemedText style={styles.nextText}>
                        {t("milestone.next", {
                          milestone: formatMilestoneLabel(next, t),
                        })}
                      </ThemedText>
                    </View>
                  )}
                </Card.Content>
                <Card.Actions style={styles.actionsRow}>
                  <ThemedText
                    style={[
                      styles.cardActions,
                      { color: themes[scheme].colors.secondary },
                    ]}
                  >
                    {totalHabitSavings > 0
                      ? formatAmount(totalHabitSavings, currency)
                      : null}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.cardActions,
                      { color: themes[scheme].colors.secondary },
                    ]}
                  >
                    {t("progress.since", {
                      date: dayjs(habit.date).format("D MMM YYYY"),
                    })}
                  </ThemedText>
                </Card.Actions>
              </Card>
            );
          })}
      </ScrollView>
      {totalSavings > 0 && (
        <View style={[globalStyles.container, globalStyles.shadow]}>
          <Card
            mode="contained"
            style={{
              backgroundColor: themes[scheme].colors.primary,
            }}
          >
            <Card.Content>
              <View>
                <ThemedText
                  type="subtitle"
                  style={[
                    globalStyles.spacedUppercase,
                    { color: themes[scheme].colors.onPrimary },
                  ]}
                >
                  {t("progress.totalSavings")}
                </ThemedText>
                <CounterText
                  value={totalSavings}
                  style={{ color: themes[scheme].colors.onPrimary }}
                />
              </View>
            </Card.Content>
          </Card>
        </View>
      )}

      {/* Milestone celebration toast */}
      <Snackbar
        visible={activeCelebration != null}
        duration={5000}
        action={{
          label: t("common.dismiss"),
          textColor: themes[scheme].colors.onPrimary,
          onPress: dismissCelebration,
        }}
        style={{
          backgroundColor: themes[scheme].colors.secondary,
        }}
        onDismiss={dismissCelebration}
      >
        <ThemedText style={{ color: themes[scheme].colors.onSecondary }}>
          {activeHabit != null && activeCelebration != null
            ? t("milestone.reachedBody", {
                habit: getHabitName(activeHabit, t),
                milestone: formatMilestoneLabel(activeCelebration.milestone, t),
              })
            : t("milestone.reached")}
        </ThemedText>
      </Snackbar>

      <Snackbar
        visible={!!snackbarMessage}
        duration={5000}
        action={{
          label: t("common.dismiss"),
          textColor: themes[scheme].colors.onPrimary,
          onPress: () => setSnackbarMessage(null),
        }}
        style={{
          backgroundColor: themes[scheme].colors.error,
        }}
        onDismiss={() => setSnackbarMessage(null)}
      >
        <ThemedText style={{ color: themes[scheme].colors.onPrimary }}>
          {snackbarMessage}
        </ThemedText>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginBottom: 14,
  },
  statColumn: {
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingInlineEnd: 15,
  },
  timeSubtitle: {
    fontSize: 13,
  },
  cardCounters: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  cardActions: {
    fontSize: 12,
  },
  alignItemsEnd: {
    alignItems: "flex-end",
  },
  scrollContent: {
    gap: 20,
  },
  nextText: {
    fontSize: 12,
    textAlign: "right",
  },
});
