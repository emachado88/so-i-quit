import { ThemedText } from "@/components/themed-text";
import { Habit } from "@/constants/interfaces";
import { globalStyles } from "@/constants/styles";
import { themes } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getHabits } from "@/utils/habits";
import {
  breakdown,
  daysSince,
  formatAmount,
  parseSavings,
} from "@/utils/format";
import { Link, useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Snackbar } from "react-native-paper";
import dayjs from "dayjs";

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const navigation = useNavigation();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const loadHabits = async () => {
    try {
      const data = await getHabits();
      setHabits(data);
    } catch (error) {
      console.error("Error loading habits:", error);
      setSnackbarMessage("Failed to load habits");
    }
  };

  // Tick counter to trigger re-renders so breakdown() updates in real-time
  const [, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadHabits();
      const interval = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(interval);
    }, []),
  );

  useEffect(() => {
    const title =
      habits.length === 0 ? "Ready to get better?" : "Congratulations!";
    navigation.setOptions({ headerTitle: title });
  }, [habits, navigation]);

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
            ? "You're doing great,"
            : "No data saved in settings"}
        </ThemedText>
        {!hasAnyHabitWithDate && (
          <Link
            screen="settings"
            style={{ color: themes[colorScheme].colors.primary }}
            params={{}}
          >
            Go to settings
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
                  title={`${habit.name} free for`}
                  titleStyle={[
                    globalStyles.spacedUppercase,
                    { color: themes[colorScheme].colors.secondary },
                  ]}
                />
                <Card.Content>
                  <View>
                    <View style={styles.cardRow}>
                      {years ? (
                        <View style={styles.statColumn}>
                          <ThemedText type="title">{years}</ThemedText>
                          <ThemedText style={styles.timeSubtitle}>
                            years
                          </ThemedText>
                        </View>
                      ) : null}
                      {months ? (
                        <View style={styles.statColumn}>
                          <ThemedText type="title">{months}</ThemedText>
                          <ThemedText style={styles.timeSubtitle}>
                            months
                          </ThemedText>
                        </View>
                      ) : null}
                      {days ? (
                        <View style={styles.statColumn}>
                          <ThemedText type="title">{days}</ThemedText>
                          <ThemedText style={styles.timeSubtitle}>
                            days
                          </ThemedText>
                        </View>
                      ) : null}
                      {hours ? (
                        <View style={styles.statColumn}>
                          <ThemedText type="title">{hours}</ThemedText>
                          <ThemedText style={styles.timeSubtitle}>
                            hours
                          </ThemedText>
                        </View>
                      ) : null}
                      {!years && !months && !days && !hours ? (
                        <View style={styles.statColumn}>
                          <ThemedText>
                            You&apos;ve just started, keep going
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Card.Content>
                <Card.Actions style={styles.actionsRow}>
                  <ThemedText style={styles.cardActions}>
                    {totalHabitSavings > 0
                      ? formatAmount(totalHabitSavings)
                      : null}
                  </ThemedText>
                  <ThemedText style={styles.cardActions}>
                    since {dayjs(habit.date).format("DD MMM YYYY")}
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
              backgroundColor: themes[colorScheme].colors.primary,
            }}
          >
            <Card.Content>
              <View>
                <ThemedText
                  type="subtitle"
                  style={[
                    globalStyles.spacedUppercase,
                    { color: themes[colorScheme].colors.onPrimary },
                  ]}
                >
                  Total savings
                </ThemedText>
                <ThemedText
                  type="title"
                  style={{ color: themes[colorScheme].colors.onPrimary }}
                >
                  {formatAmount(totalSavings)}
                </ThemedText>
              </View>
            </Card.Content>
          </Card>
        </View>
      ) : null}

      <Snackbar
        visible={!!snackbarMessage}
        duration={5000}
        action={{
          label: "Dismiss",
          textColor: themes[colorScheme].colors.onPrimary,
          onPress: () => setSnackbarMessage(null),
        }}
        style={{
          backgroundColor: themes[colorScheme].colors.error,
        }}
        onDismiss={() => setSnackbarMessage(null)}
      >
        <ThemedText style={{ color: themes[colorScheme].colors.onPrimary }}>
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
