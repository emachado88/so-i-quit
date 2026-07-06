import { ThemedText } from "@/components/themed-text";
import { Habit } from "@/constants/interfaces";
import { globalStyles } from "@/constants/styles";
import { themes } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getHabits } from "@/utils/habits";
import { useIsFocused } from "@react-navigation/core";
import { Link } from "@react-navigation/native";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Card from "react-native-paper/src/components/Card/Card";

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const isFocused = useIsFocused();
  const [habits, setHabits] = useState<Habit[]>([]);

  // Helper functions to safely parse and format dates/numbers
  const daysSince = (isoDate: string | null) => {
    if (!isoDate) return 0;
    const d = dayjs(isoDate);
    return d.isValid() ? dayjs().diff(d, "days") : 0;
  };

  const breakdown = (isoDate: string | null) => {
    if (!isoDate) return { years: 0, months: 0, days: 0, hours: 0 };
    const d = dayjs(isoDate);
    if (!d.isValid()) return { years: 0, months: 0, days: 0, hours: 0 };

    let current = d;
    const now = dayjs();

    const years = now.diff(current, "years");
    current = current.add(years, "years");

    const months = now.diff(current, "months");
    current = current.add(months, "months");

    const days = now.diff(current, "days");
    current = current.add(days, "days");

    const hours = now.diff(current, "hours");

    return { years, months, days, hours };
  };

  const parseSavings = (value: string | null) => {
    if (!value) return 0;
    const n = parseFloat(value.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const formatAmount = (value: number) => {
    return `${Math.round(value * 100) / 100}€`;
  };

  const loadHabits = async () => {
    const data = await getHabits();
    setHabits(data);
  };

  useEffect(() => {
    if (!isFocused) return;
    loadHabits();

    const interval = setInterval(loadHabits, 1000);
    return () => clearInterval(interval);
  }, [isFocused]);

  const hasAnyHabitWithDate = habits.some((h) => h.date);

  // Calculate total savings across all habits
  const totalSavings = habits.reduce((acc, habit) => {
    return acc + daysSince(habit.date) * parseSavings(habit.savings);
  }, 0);

  return (
    <View style={{ flex: 1 }}>
      <View style={[globalStyles.container, globalStyles.shadow]}>
        <ThemedText type="subtitle">
          {hasAnyHabitWithDate
            ? "You're doing great"
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
      <ScrollView contentContainerStyle={[globalStyles.container, { gap: 20 }]}>
        {habits
          .filter((h) => h.date)
          .map((habit) => {
            const { years, months, days, hours } = breakdown(habit.date);
            const totalHabitSavings =
              daysSince(habit.date) * parseSavings(habit.savings);

            return (
              <Card key={habit.id}>
                <Card.Title title={`${habit.name} free for`} />
                <Card.Content>
                  <View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "center",
                        gap: 10,
                      }}
                    >
                      {years ? (
                        <View style={{ alignItems: "center" }}>
                          <ThemedText type="title">{years}</ThemedText>
                          <ThemedText>years</ThemedText>
                        </View>
                      ) : null}
                      {months ? (
                        <View style={{ alignItems: "center" }}>
                          <ThemedText type="title">{months}</ThemedText>
                          <ThemedText>months</ThemedText>
                        </View>
                      ) : null}
                      {days ? (
                        <View style={{ alignItems: "center" }}>
                          <ThemedText type="title">{days}</ThemedText>
                          <ThemedText>days</ThemedText>
                        </View>
                      ) : null}
                      {hours ? (
                        <View style={{ alignItems: "center" }}>
                          <ThemedText type="title">{hours}</ThemedText>
                          <ThemedText>hours</ThemedText>
                        </View>
                      ) : null}
                      {!years && !months && !days && !hours ? (
                        <View style={{ alignItems: "center" }}>
                          <ThemedText>
                            You&apos;ve just started, check later
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Card.Content>
                <Card.Actions>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                    }}
                  >
                    <ThemedText style={{ marginInlineEnd: 5 }}>
                      {totalHabitSavings > 0
                        ? formatAmount(totalHabitSavings)
                        : null}
                    </ThemedText>
                  </View>
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
              backgroundColor: themes[colorScheme].colors.primaryContainer,
            }}
          >
            <Card.Content>
              <View style={{ alignItems: "flex-end" }}>
                <ThemedText type="subtitle">Total savings</ThemedText>
                <ThemedText type="title">
                  {formatAmount(totalSavings)}
                </ThemedText>
              </View>
            </Card.Content>
          </Card>
        </View>
      ) : null}
    </View>
  );
}
