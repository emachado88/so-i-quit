import { Habit } from "@/constants/interfaces";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "habits";

export const getHabits = async (): Promise<Habit[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error fetching habits:", error);
    return [];
  }
};

export const saveHabits = async (habits: Habit[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error("Error saving habits:", error);
  }
};

export const addHabit = async (habit: Omit<Habit, "id">): Promise<Habit> => {
  const habits = await getHabits();
  const newHabit: Habit = {
    ...habit,
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
  };
  habits.push(newHabit);
  await saveHabits(habits);
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
  }
};

export const deleteHabit = async (id: string): Promise<void> => {
  const habits = await getHabits();
  const filtered = habits.filter((h) => h.id !== id);
  await saveHabits(filtered);
};
