import { ThemedText } from "@/components/themed-text";
import { CounterText, TimeValue } from "@/components/animated-counters";
import { Habit } from "@/constants/interfaces";
import { globalStyles } from "@/constants/styles";
import { themes } from "@/constants/theme";
import { useAppSettings } from "@/contexts/settings-context";
import { getHabits } from "@/data/habits";
import {
  breakdown,
  daysSince,
  formatAmount,
  getHabitName,
  parseSavings,
} from "@/utils/utils";
import { Link, useFocusEffect, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Snackbar } from "react-native-paper";
import dayjs from "dayjs";

export default function HomeScreen() {
  const { scheme, currency, t } = useAppSettings();
  const navigation = useNavigation();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  // Tick counter to trigger re-renders so breakdown() updates in real-time
  const [, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const loadHabits = async () => {
        try {
          const data = await getHabits();
          setHabits(data);
        } catch (error) {
          console.error("Error loading habits:", error);
          setSnackbarMessage(t("progress.failedToLoad"));
        }
      };

      loadHabits();
      const interval = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(interval);
    }, [t]),
  );

  useEffect(() => {
    const title =
      habits.length === 0
        ? t("progress.readyToGetBetter")
        : t("progress.congratulations");
    navigation.setOptions({ headerTitle: title });
  }, [habits, navigation, t]);

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

            return (
              <Card key={habit.id} mode="contained">
                <Card.Title
                  title={t("progress.freeFor", { name: getHabitName(habit, t) })}
                  titleStyle={[
                    globalStyles.spacedUppercase,
                    { color: themes[scheme].colors.secondary },
                  ]}
                />
                <Card.Content>
                  <View>
                    <View style={styles.cardRow}>
                      {years ? (
                        <View style={styles.statColumn}>
                          <TimeValue value={years} />
                          <ThemedText style={styles.timeSubtitle}>
                            {t("progress.years")}
                          </ThemedText>
                        </View>
                      ) : null}
                      {months ? (
                        <View style={styles.statColumn}>
                          <TimeValue value={months} />
                          <ThemedText style={styles.timeSubtitle}>
                            {t("progress.months")}
                          </ThemedText>
                        </View>
                      ) : null}
                      {days ? (
                        <View style={styles.statColumn}>
                          <TimeValue value={days} />
                          <ThemedText style={styles.timeSubtitle}>
                            {t("progress.days")}
                          </ThemedText>
                        </View>
                      ) : null}
                      {hours ? (
                        <View style={styles.statColumn}>
                          <TimeValue value={hours} />
                          <ThemedText style={styles.timeSubtitle}>
                            {t("progress.hours")}
                          </ThemedText>
                        </View>
                      ) : null}
                      {!years && !months && !days && !hours ? (
                        <View style={styles.statColumn}>
                          <ThemedText>{t("progress.justStarted")}</ThemedText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Card.Content>
                <Card.Actions style={styles.actionsRow}>
                  <ThemedText style={styles.cardActions}>
                    {totalHabitSavings > 0
                      ? formatAmount(totalHabitSavings, currency)
                      : null}
                  </ThemedText>
                  <ThemedText style={styles.cardActions}>
                    {t("progress.since", {
                      date: dayjs(habit.date).format("D MMM YYYY"),
                    })}
                  </ThemedText>
                </Card.Actions>
              </Card>
            );
          })}
      </ScrollView>
      {totalSavings > 0 ? (
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
      ) : null}

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
    gap: 5,
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
  cardActions: {
    fontSize: 12,
  },
  alignItemsEnd: {
    alignItems: "flex-end",
  },
  scrollContent: {
    gap: 20,
  },
});
