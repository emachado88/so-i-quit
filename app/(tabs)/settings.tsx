import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { getHabits, addHabit, updateHabit, deleteHabit } from "@/utils/habits";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import { Button, Card, Divider, Snackbar, TextInput } from "react-native-paper";
import { Habit } from "@/constants/interfaces";
import { globalStyles } from "@/constants/styles";
import { themes } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SettingsScreen() {
  const colorScheme = useColorScheme() ?? "light";
  const [habits, setHabits] = useState<Habit[]>([]);
  const [customHabitName, setCustomHabitName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [pickerOpen, setPickerOpen] = useState<{
    habitId: string;
    mode: "date" | "time";
  } | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const otherInputRef = React.useRef<any>(null);

  const hasAlcohol = habits.some((h) => h.name === "Alcohol");
  const hasTobacco = habits.some((h) => h.name === "Tobacco");

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const data = await getHabits();
      setHabits(data);
    } catch (error) {
      console.error("Error loading habits:", error);
      setSnackbarMessage("Failed to load habits");
    }
  };

  const handleAddHabit = async (type: "Alcohol" | "Tobacco" | "Other") => {
    if (type === "Other") {
      setShowCustomInput(true);
      setTimeout(() => {
        otherInputRef.current?.focus();
      }, 100);
      return;
    }

    const newHabit = {
      name: type,
      date: null,
      savings: null,
    };
    try {
      await addHabit(newHabit);
      await loadHabits();
    } catch (error) {
      console.error("Error adding habit:", error);
      setSnackbarMessage(`Failed to add ${type}`);
    }
  };

  const handleAddCustomHabit = async () => {
    const trimmed = customHabitName.trim();
    const normalizedHabitName =
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (!normalizedHabitName) {
      Alert.alert("Error", "Please enter a habit name");
      return;
    }
    const newHabit = {
      name: normalizedHabitName,
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
    try {
      await updateHabit(habitId, { date: date?.toISOString() ?? null });
      await loadHabits();
    } catch (error) {
      console.error("Error updating date:", error);
      setSnackbarMessage("Failed to update date");
    }
  };

  const handleSavingsChange = async (habitId: string, value: string) => {
    const normalizedValue = value
      .replace(/[^0-9.]/g, "")
      .replace(/(\..*)\./g, "$1")
      .replace(/(\.\d{2})\d+/g, "$1");
    setHabits((prevHabits) =>
      prevHabits.map((habit) =>
        habit.id === habitId ? { ...habit, savings: normalizedValue } : habit,
      ),
    );
  };

  const handleSavingsBlur = async (habitId: string, value: string | null) => {
    try {
      await updateHabit(habitId, { savings: value || null });
      await loadHabits();
    } catch (error) {
      console.error("Error updating savings:", error);
      setSnackbarMessage("Failed to update savings");
    }
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
            try {
              await updateHabit(habit.id, { date: null, savings: null });
              await loadHabits();
            } catch (error) {
              console.error("Error resetting habit:", error);
              setSnackbarMessage(`Failed to reset ${habit.name}`);
            }
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
            try {
              await deleteHabit(habit.id);
              await loadHabits();
            } catch (error) {
              console.error("Error deleting habit:", error);
              setSnackbarMessage(`Failed to delete ${habit.name}`);
            }
          },
        },
      ],
    );
  };

  const handleOpenPicker = (
    habitId: string,
    mode: "date" | "time",
    currentDate: Date,
  ) => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        mode,
        value: currentDate,
        maximumDate: new Date(),
        onChange: (_event, date) => {
          if (date) handleDateChange(habitId, date);
        },
      });
    } else {
      setPickerOpen({ habitId, mode });
    }
  };

  const handlePickerChange = (_event: any, date?: Date) => {
    if (date && pickerOpen) {
      handleDateChange(pickerOpen.habitId, date);
    }
    setPickerOpen(null);
  };

  const editingHabit = pickerOpen
    ? habits.find((h) => h.id === pickerOpen.habitId)
    : null;

  return (
    <View style={globalStyles.flex1}>
      <View style={[globalStyles.container, globalStyles.shadow]}>
        <ThemedText style={styles.subtitle}>Add New Habit</ThemedText>
        <View style={styles.buttonRow}>
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
          <View style={styles.customInputRow}>
            <TextInput
              ref={otherInputRef}
              label="Habit name"
              value={customHabitName}
              mode="outlined"
              style={globalStyles.flex1}
              onChangeText={setCustomHabitName}
              onBlur={() => !customHabitName && setShowCustomInput(false)}
            />
            <Button mode="contained" onPress={handleAddCustomHabit}>
              Add
            </Button>
          </View>
        )}
      </View>

      <Divider />

      <ScrollView
        contentContainerStyle={[globalStyles.container, styles.scrollContent]}
      >
        {habits.length === 0 && <ThemedText>No habits added yet.</ThemedText>}
        {habits.toReversed().map((habit) => (
          <Card
            key={habit.id}
            mode="contained"
            style={{ backgroundColor: themes[colorScheme].colors.surface }}
          >
            <Card.Content>
              <View style={[styles.cardHeader, globalStyles.flexWrap]}>
                <ThemedText>{habit.name}</ThemedText>

                <View style={globalStyles.flexRow}>
                  <View style={styles.dateTimeButtonContainer}>
                    <Button
                      compact
                      icon="pencil"
                      mode="text"
                      onPress={() =>
                        handleOpenPicker(
                          habit.id,
                          "date",
                          habit.date ? new Date(habit.date) : new Date(),
                        )
                      }
                    >
                      {habit.date
                        ? new Date(habit.date).toLocaleDateString()
                        : "Set Date"}
                    </Button>
                  </View>
                  <View style={styles.dateTimeButtonContainer}>
                    <Button
                      compact
                      icon="pencil"
                      mode="text"
                      onPress={() =>
                        handleOpenPicker(
                          habit.id,
                          "time",
                          habit.date ? new Date(habit.date) : new Date(),
                        )
                      }
                    >
                      {habit.date
                        ? new Date(habit.date).toLocaleTimeString()
                        : "Set Time"}
                    </Button>
                  </View>
                </View>
              </View>

              <View style={[styles.savingsRow, globalStyles.flexWrap]}>
                <TextInput
                  label="Savings"
                  inputMode="decimal"
                  value={habit.savings || ""}
                  keyboardType="numeric"
                  mode="outlined"
                  placeholder="0.00"
                  right={<TextInput.Affix text="€/day" />}
                  onChangeText={(text) => handleSavingsChange(habit.id, text)}
                  onBlur={() => handleSavingsBlur(habit.id, habit.savings)}
                />

                <View style={globalStyles.flexRow}>
                  <Button
                    compact
                    icon="refresh"
                    contentStyle={{ flexDirection: "row-reverse" }}
                    onPress={() => handleReset(habit)}
                  >
                    Reset
                  </Button>
                  <Button
                    compact
                    icon="delete"
                    mode="text"
                    textColor={themes[colorScheme].colors.error}
                    onPress={() => handleDelete(habit)}
                  >
                    Delete
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      {Platform.OS === "ios" && editingHabit && pickerOpen && (
        <DateTimePicker
          mode={pickerOpen.mode}
          value={editingHabit.date ? new Date(editingHabit.date) : new Date()}
          maximumDate={new Date()}
          onChange={handlePickerChange}
        />
      )}

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
  subtitle: {
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  customInputRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  scrollContent: {
    gap: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  dateTimeButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  savingsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
