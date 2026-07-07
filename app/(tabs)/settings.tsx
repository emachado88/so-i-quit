import { Alert, ScrollView, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { getHabits, addHabit, updateHabit, deleteHabit } from "@/utils/habits";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { DarkTheme } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import Button from "react-native-paper/src/components/Button/Button";
import Divider from "react-native-paper/src/components/Divider";
import TextInput from "react-native-paper/src/components/TextInput/TextInput";
import { Habit } from "@/constants/interfaces";
import Card from "react-native-paper/src/components/Card/Card";
import { globalStyles } from "@/constants/styles";

export default function SettingsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [customHabitName, setCustomHabitName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const hasAlcohol = habits.some((h) => h.name === "Alcohol");
  const hasTobacco = habits.some((h) => h.name === "Tobacco");

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    const data = await getHabits();
    setHabits(data);
  };

  const handleAddHabit = (type: "Alcohol" | "Tobacco" | "Other") => {
    if (type === "Other") {
      setShowCustomInput(true);
      return;
    }

    const newHabit = {
      name: type,
      date: null,
      savings: null,
    };
    addHabit(newHabit).then(() => loadHabits());
  };

  const handleAddCustomHabit = async () => {
    if (!customHabitName.trim()) {
      Alert.alert("Error", "Please enter a habit name");
      return;
    }
    const newHabit = {
      name: customHabitName.trim(),
      date: null,
      savings: null,
    };

    try {
      await addHabit(newHabit);
      setCustomHabitName("");
      setShowCustomInput(false);
      loadHabits();
    } catch (error) {
      console.error("Error adding custom habit:", error);
      Alert.alert("Error", "Failed to add custom habit");
    }
  };

  const handleDateChange = async (habitId: string, date: Date | null) => {
    await updateHabit(habitId, { date: date?.toISOString() ?? null });
    loadHabits();
  };

  const handleSavingsChange = async (habitId: string, value: string) => {
    const absValue = value.replace(/[^0-9.]/g, "");
    await updateHabit(habitId, { savings: absValue || null });
    loadHabits();
  };

  const handleReset = (habit: Habit) => {
    Alert.alert(
      `Reset ${habit.name}`,
      `Are you sure you want to reset ${habit.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await updateHabit(habit.id, { date: null, savings: null });
            loadHabits();
          },
        },
      ],
    );
  };

  const handleDelete = (habit: Habit) => {
    Alert.alert(
      `Delete ${habit.name}`,
      `Are you sure you want to delete ${habit.name} data?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteHabit(habit.id);
            loadHabits();
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={[globalStyles.container, globalStyles.shadow]}>
        <ThemedText type="subtitle" style={{ marginBottom: 15 }}>
          Add New Habit
        </ThemedText>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {!hasAlcohol && (
            <Button mode="outlined" onPress={() => handleAddHabit("Alcohol")}>
              Alcohol
            </Button>
          )}
          {!hasTobacco && (
            <Button mode="outlined" onPress={() => handleAddHabit("Tobacco")}>
              Tobacco
            </Button>
          )}
          <Button mode="outlined" onPress={() => handleAddHabit("Other")}>
            Other
          </Button>
        </View>

        {showCustomInput && (
          <View
            style={{
              marginTop: 10,
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
            }}
          >
            <TextInput
              label="Habit name"
              value={customHabitName}
              onChangeText={setCustomHabitName}
              mode="outlined"
              style={{ flex: 1 }}
            />
            <Button mode="contained" onPress={handleAddCustomHabit}>
              Add
            </Button>
          </View>
        )}
      </View>

      <Divider />

      <ScrollView contentContainerStyle={[globalStyles.container, { gap: 20 }]}>
        <ThemedText type="subtitle">Your Habits</ThemedText>
        {habits.length === 0 && <ThemedText>No habits added yet.</ThemedText>}
        {habits.map((habit) => (
          <Card key={habit.id}>
            <Card.Content>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <ThemedText type="subtitle">{habit.name}</ThemedText>
                <Button
                  compact
                  icon="delete"
                  mode="text"
                  textColor="red"
                  onPress={() => handleDelete(habit)}
                >
                  Delete
                </Button>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginVertical: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Button
                    compact
                    icon="pencil"
                    mode="text"
                    contentStyle={{ flexDirection: "row-reverse" }}
                    onPress={() =>
                      DateTimePickerAndroid.open({
                        mode: "date",
                        value: habit.date ? new Date(habit.date) : new Date(),
                        maximumDate: new Date(),
                        style: { backgroundColor: DarkTheme.colors.card },
                        onChange: (_event, date) => {
                          if (date) handleDateChange(habit.id, date);
                        },
                      })
                    }
                  >
                    {habit.date
                      ? new Date(habit.date).toLocaleDateString()
                      : "--/--/----"}
                  </Button>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Button
                    compact
                    icon="pencil"
                    mode="text"
                    contentStyle={{ flexDirection: "row-reverse" }}
                    onPress={() =>
                      DateTimePickerAndroid.open({
                        mode: "time",
                        value: habit.date ? new Date(habit.date) : new Date(),
                        maximumDate: new Date(),
                        style: { backgroundColor: DarkTheme.colors.card },
                        onChange: (_event, date) => {
                          if (date) handleDateChange(habit.id, date);
                        },
                      })
                    }
                  >
                    {habit.date
                      ? new Date(habit.date).toLocaleTimeString()
                      : "--:--"}
                  </Button>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <TextInput
                  label="Savings"
                  inputMode="numeric"
                  value={habit.savings || ""}
                  keyboardType="number-pad"
                  placeholder="- - "
                  mode="outlined"
                  right={<TextInput.Affix text="€/day" />}
                  onChangeText={(text) => handleSavingsChange(habit.id, text)}
                  style={{ flex: 1 }}
                />
                <Button
                  compact
                  icon="refresh"
                  contentStyle={{ flexDirection: "row-reverse" }}
                  onPress={() => handleReset(habit)}
                >
                  Reset
                </Button>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
