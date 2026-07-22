import * as Sentry from "@sentry/react-native";
import { Habit } from "@/constants/interfaces";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "habits";

export const getHabits = async (): Promise<Habit[]> => {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveHabits = async (habits: Habit[]): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
};

export const addHabit = async (habit: Omit<Habit, "id">): Promise<Habit> => {
  const habits = await getHabits();
  const newHabit: Habit = {
    ...habit,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  };
  habits.push(newHabit);
  await saveHabits(habits);
  Sentry.addBreadcrumb({
    category: "habits",
    message: `Added habit: ${habit.name}`,
    level: "info",
    data: { habitId: newHabit.id },
  });
  return newHabit;
};

export const updateHabit = async (
  id: string,
  updates: Partial<Habit>,
): Promise<void> => {
  const habits = await getHabits();
  const index = habits.findIndex((h) => h.id === id);
  if (index !== -1) {
    habits[index] = { ...habits[index], ...updates };
    await saveHabits(habits);
    Sentry.addBreadcrumb({
      category: "habits",
      message: `Updated habit: ${habits[index].name}`,
      level: "info",
      data: { habitId: id, updatedFields: Object.keys(updates) },
    });
  }
};

export const deleteHabit = async (id: string): Promise<void> => {
  const habits = await getHabits();
  const target = habits.find((h) => h.id === id);
  const filtered = habits.filter((h) => h.id !== id);
  await saveHabits(filtered);
  Sentry.addBreadcrumb({
    category: "habits",
    message: `Deleted habit: ${target?.name ?? id}`,
    level: "info",
    data: { habitId: id },
  });
};
