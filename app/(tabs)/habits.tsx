import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import SavingsModal from "@/components/savings-modal";
import { getHabits, addHabit, updateHabit, deleteHabit } from "@/data/habits";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Button,
  Card,
  Divider,
  IconButton,
  Menu,
  Snackbar,
  TextInput,
} from "react-native-paper";
import { Habit } from "@/constants/interfaces";
import type { TranslationKey } from "@/i18n/en";
import { globalStyles } from "@/constants/styles";
import { themes } from "@/constants/theme";
import { useAppSettings } from "@/contexts/settings-context";
import dayjs from "dayjs";
import { formatAmount, getHabitName } from "@/utils/utils";

// ── Wizard flow: date → time → (optional) savings ──
type WizardFlow = "new" | "reset";

interface WizardState {
  flow: WizardFlow;
  habitId: string;
  step: "date" | "time" | "savings";
  /** Date portion selected during the wizard (time is 00:00). */
  selectedDate: Date | null;
  /** Habit savings to pre-fill (from previous value). */
  initialSavings: string | null;
  /** Whether the savings step is allowed (always true for new, true for reset if prev savings existed). */
  allowSavings: boolean;
}

// ── Edit picker: triggered from menu for existing habits ──
type EditPicker =
  | {
      type: "date";
      habitId: string;
      step: "date" | "time";
      selectedDate: Date | null;
    }
  | { type: "savings"; habitId: string; currentValue: string | null };

export default function HabitsScreen() {
  const { scheme, currency, t } = useAppSettings();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [customHabitName, setCustomHabitName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [wizard, setWizard] = useState<WizardState | null>(null);
  const [editPicker, setEditPicker] = useState<EditPicker | null>(null);
  const [menuVisibleId, setMenuVisibleId] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const otherInputRef = useRef<any>(null);
  const customInputFocusedRef = useRef(false);
  // iOS: skip the auto-fired onChange when DateTimePicker mounts
  const pickerAutoFireSkipRef = useRef(false);
  // Track whether wizard finish was explicit (prevents onDismiss from cancelling a completed flow)
  const wizardFinishedRef = useRef(false);

  // Track whether an iOS DateTimePicker step is active (derived from wizard state)
  const iosPickerActive =
    Platform.OS === "ios" &&
    wizard !== null &&
    (wizard.step === "date" || wizard.step === "time");

  const hasAlcohol = habits.some((h) => h.key === "habits.alcohol");
  const hasTobacco = habits.some((h) => h.key === "habits.tobacco");

  // ── Data loading ──

  const loadHabits = useCallback(async () => {
    try {
      const data = await getHabits();
      setHabits(data);
    } catch (error) {
      console.error("Error loading habits:", error);
      setSnackbarMessage(t("habits.failedToLoad"));
    }
  }, [t]);

  // ── Wizard cancellation (Android picker dismissed) ──

  const handleWizardCancel = useCallback(
    async (habitId: string, flow: WizardFlow) => {
      if (flow === "new") {
        try {
          await deleteHabit(habitId);
          await loadHabits();
        } catch {
          // ignore — habit may already be gone
        }
      }
      setWizard(null);
      wizardFinishedRef.current = false;
    },
    [loadHabits],
  );

  // ── Wizard: advance after date selected (Android) ──

  const handleWizardDateSelected = useCallback(
    (habitId: string, date: Date, flow: WizardFlow) => {
      // Next picker will auto-fire on iOS; skip it
      pickerAutoFireSkipRef.current = true;
      // Open time picker next
      DateTimePickerAndroid.open({
        mode: "time",
        value: date,
        maximumDate: new Date(),
        onValueChange: (_timeEvent, timeDate) => {
          if (timeDate) {
            // Merge date + time into full ISO datetime
            const merged = new Date(date);
            merged.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);

            // Update wizard with selectedDate and move to savings
            setWizard((prev) => {
              if (!prev) return null;
              return { ...prev, selectedDate: merged, step: "savings" };
            });
          } else {
            // Time picker cancelled → abort entire flow
            handleWizardCancel(habitId, flow);
          }
        },
        onDismiss: () => handleWizardCancel(habitId, flow),
      });
    },
    [handleWizardCancel],
  );

  // ── Wizard: finish (after savings or skip savings) ──

  const handleWizardFinish = useCallback(
    async (savings: string | null) => {
      const current = wizard;
      if (!current || !current.selectedDate) return;
      wizardFinishedRef.current = true;
      try {
        await updateHabit(current.habitId, {
          date: current.selectedDate.toISOString(),
          savings,
        });
        await loadHabits();
      } catch (error) {
        console.error("Error completing wizard:", error);
        setSnackbarMessage(t("habits.failedToSave"));
      }
      setWizard(null);
    },
    [wizard, loadHabits, t],
  );

  // ── Menu: Edit date (date → time picker) ──

  const handleEditDateSelected = useCallback(
    async (habitId: string, date: Date) => {
      try {
        await updateHabit(habitId, { date: date.toISOString() });
        await loadHabits();
      } catch (error) {
        console.error("Error updating date:", error);
        setSnackbarMessage(t("habits.failedToUpdateDate"));
      }
      setEditPicker(null);
    },
    [loadHabits, t],
  );

  // ── Menu: Edit savings (modal only) ──

  const handleEditSavingsSave = useCallback(
    async (habitId: string, savings: string | null) => {
      try {
        await updateHabit(habitId, { savings });
        await loadHabits();
      } catch (error) {
        console.error("Error updating savings:", error);
        setSnackbarMessage(t("habits.failedToUpdateSavings"));
      }
      setEditPicker(null);
    },
    [loadHabits, t],
  );

  // ── Menu actions ──

  const handleMenuEditDate = (habit: Habit) => {
    setEditPicker({
      type: "date",
      habitId: habit.id,
      step: "date",
      selectedDate: null,
    });

    if (Platform.OS === "ios") {
      pickerAutoFireSkipRef.current = true;
    }

    if (Platform.OS === "android") {
      const currentDate = habit.date ? new Date(habit.date) : new Date();

      DateTimePickerAndroid.open({
        mode: "date",
        value: currentDate,
        maximumDate: new Date(),
        onValueChange: (_dateEvent, dateVal) => {
          if (dateVal) {
            DateTimePickerAndroid.open({
              mode: "time",
              value: dateVal,
              maximumDate: new Date(),
              onValueChange: (_timeEvent, timeVal) => {
                if (timeVal) {
                  const merged = new Date(dateVal);
                  merged.setHours(
                    timeVal.getHours(),
                    timeVal.getMinutes(),
                    0,
                    0,
                  );
                  handleEditDateSelected(habit.id, merged);
                } else {
                  setEditPicker(null);
                }
              },
              onDismiss: () => setEditPicker(null),
            });
          } else {
            setEditPicker(null);
          }
        },
        onDismiss: () => setEditPicker(null),
      });
    }
  };

  const handleMenuEditSavings = (habit: Habit) => {
    setEditPicker({
      type: "savings",
      habitId: habit.id,
      currentValue: habit.savings,
    });
  };

  const handleDelete = (habit: Habit) => {
    const displayName = getHabitName(habit, t);
    Alert.alert(
      t("habits.deleteTitle", { name: displayName }),
      t("habits.deleteConfirm", { name: displayName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("habits.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteHabit(habit.id);
              await loadHabits();
            } catch (error) {
              console.error("Error deleting habit:", error);
              setSnackbarMessage(
                t("habits.failedToDelete", { name: displayName }),
              );
            }
          },
        },
      ],
    );
  };

  // ── Effects ──

  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [loadHabits]),
  );

  // Dismiss custom input when keyboard hides
  useEffect(() => {
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setShowCustomInput(false);
      customInputFocusedRef.current = false;
    });
    return () => {
      hideSubscription.remove();
    };
  }, []);

  // ── Add / Custom habit ──

  const handleAddHabit = async (type: "alcohol" | "tobacco" | "Other") => {
    if (type === "Other") {
      setShowCustomInput(true);
      setTimeout(() => {
        otherInputRef.current?.focus();
      }, 100);
      return;
    }

    const key = type === "alcohol" ? "habits.alcohol" : "habits.tobacco";
    const newHabit = { key, name: "", date: null, savings: null };
    try {
      const created = await addHabit(newHabit);
      await loadHabits();
      startWizard("new", created.id, null);
    } catch (error) {
      console.error("Error adding habit:", error);
      setSnackbarMessage(
        t("habits.failedToAdd", { name: t(key as TranslationKey) }),
      );
    }
  };

  const handleAddCustomHabit = async () => {
    const trimmed = customHabitName.trim();
    const normalizedHabitName =
      trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (!normalizedHabitName) {
      Alert.alert(t("habits.errorTitle"), t("habits.enterName"));
      return;
    }

    const newHabit = { name: normalizedHabitName, date: null, savings: null };
    try {
      const created = await addHabit(newHabit);
      setCustomHabitName("");
      setShowCustomInput(false);
      await loadHabits();
      startWizard("new", created.id, null);
    } catch (error) {
      console.error("Error adding custom habit:", error);
      setSnackbarMessage(t("habits.failedToAddCustom"));
    }
  };

  // ── Wizard launcher ──

  const startWizard = (
    flow: WizardFlow,
    habitId: string,
    initialSavings: string | null,
  ) => {
    const state: WizardState = {
      flow,
      habitId,
      step: "date",
      selectedDate: null,
      initialSavings,
      allowSavings: true,
    };
    setWizard(state);

    if (Platform.OS === "ios") {
      // iOS DateTimePicker auto-fires onChange on mount — skip it
      pickerAutoFireSkipRef.current = true;
    }

    if (Platform.OS === "android") {
      const currentDate = flow === "reset" ? new Date() : new Date();

      DateTimePickerAndroid.open({
        mode: "date",
        value: currentDate,
        maximumDate: new Date(),
        onValueChange: (_dateEvent, dateVal) => {
          if (dateVal) {
            handleWizardDateSelected(habitId, dateVal, flow);
          } else {
            handleWizardCancel(habitId, flow);
          }
        },
        onDismiss: () => handleWizardCancel(habitId, flow),
      });
    }
    // iOS: picker is rendered via JSX (iosPickerActive)
  };

  // ── Reset ──

  const handleReset = (habit: Habit) => {
    startWizard("reset", habit.id, habit.savings);
  };

  // ── iOS DateTimePicker handlers ──

  const handleIosPickerChange = (_event: any, date?: Date) => {
    if (!wizard) return;

    // iOS auto-fires onChange when DateTimePicker mounts — skip that first event
    if (pickerAutoFireSkipRef.current) {
      pickerAutoFireSkipRef.current = false;
      return;
    }

    if (!date) {
      // User dismissed → cancel wizard
      handleWizardCancel(wizard.habitId, wizard.flow);
      return;
    }

    if (wizard.step === "date") {
      // Store date portion, advance to time step
      pickerAutoFireSkipRef.current = true; // next picker will auto-fire
      const withTime = new Date(date);
      setWizard((prev) =>
        prev ? { ...prev, selectedDate: withTime, step: "time" } : null,
      );
    } else if (wizard.step === "time") {
      // Merge time into the stored date
      const merged = wizard.selectedDate
        ? new Date(wizard.selectedDate)
        : new Date();
      merged.setHours(date.getHours(), date.getMinutes(), 0, 0);
      setWizard((prev) =>
        prev ? { ...prev, selectedDate: merged, step: "savings" } : null,
      );
    }
  };

  // ── iOS Edit date picker handler ──

  const handleIosEditPickerChange = (_event: any, date?: Date) => {
    if (!editPicker || editPicker.type !== "date") return;

    // iOS auto-fires onChange when DateTimePicker mounts — skip that first event
    if (pickerAutoFireSkipRef.current) {
      pickerAutoFireSkipRef.current = false;
      return;
    }

    if (!date) {
      setEditPicker(null);
      return;
    }

    if (editPicker.step === "date") {
      // Store date, advance to time step
      pickerAutoFireSkipRef.current = true; // next picker will auto-fire
      setEditPicker({
        type: "date",
        habitId: editPicker.habitId,
        step: "time",
        selectedDate: date,
      });
    } else if (editPicker.step === "time") {
      // Merge time into stored date, save
      const merged = editPicker.selectedDate
        ? new Date(editPicker.selectedDate)
        : new Date();
      merged.setHours(date.getHours(), date.getMinutes(), 0, 0);
      handleEditDateSelected(editPicker.habitId, merged);
    }
  };

  // ── Rendering helpers ──

  const editingHabit =
    wizard !== null
      ? (habits.find((h) => h.id === wizard.habitId) ?? null)
      : null;

  const editPickerHabit =
    editPicker !== null
      ? (habits.find((h) => h.id === editPicker.habitId) ?? null)
      : null;

  const savingsModalVisible =
    wizard !== null &&
    wizard.step === "savings" &&
    wizard.selectedDate !== null;

  const editSavingsModalVisible =
    editPicker !== null && editPicker.type === "savings";

  return (
    <View style={globalStyles.flex1}>
      <View style={[globalStyles.container, globalStyles.shadow]}>
        <ThemedText style={styles.subtitle}>{t("habits.addNew")}</ThemedText>
        <View style={styles.buttonRow}>
          {!hasAlcohol && (
            <Button mode="outlined" onPress={() => handleAddHabit("alcohol")}>
              {t("habits.alcohol")}
            </Button>
          )}
          {!hasTobacco && (
            <Button mode="outlined" onPress={() => handleAddHabit("tobacco")}>
              {t("habits.tobacco")}
            </Button>
          )}
          <Button mode="outlined" onPress={() => handleAddHabit("Other")}>
            +
          </Button>
        </View>

        {showCustomInput && (
          <View style={styles.customInputRow}>
            <TextInput
              ref={otherInputRef}
              label={t("habits.habitName")}
              value={customHabitName}
              mode="outlined"
              style={globalStyles.flex1}
              onChangeText={setCustomHabitName}
              onFocus={() => {
                customInputFocusedRef.current = true;
              }}
              onBlur={() => {
                customInputFocusedRef.current = false;
                setShowCustomInput(false);
              }}
            />
            <Button mode="contained" onPress={handleAddCustomHabit}>
              {t("habits.add")}
            </Button>
          </View>
        )}
      </View>

      <Divider />

      <KeyboardAvoidingView
        style={globalStyles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={[globalStyles.container, styles.scrollContent]}
        >
          {habits.length === 0 && (
            <ThemedText>{t("habits.noHabits")}</ThemedText>
          )}
          {habits.toReversed().map((habit) => (
            <Card
              key={habit.id}
              mode="contained"
              style={{ backgroundColor: themes[scheme].colors.surface }}
            >
              <Card.Content>
                <View style={styles.cardHeader}>
                  <ThemedText
                    style={[
                      globalStyles.spacedUppercase,
                      { color: themes[scheme].colors.secondary },
                    ]}
                  >
                    {getHabitName(habit, t)}
                  </ThemedText>

                  <View style={globalStyles.flexRow}>
                    <Menu
                      visible={menuVisibleId === habit.id}
                      onDismiss={() => setMenuVisibleId(null)}
                      anchor={
                        <Pressable onPress={() => setMenuVisibleId(habit.id)}>
                          <IconButton
                            icon="dots-horizontal"
                            style={{ margin: 0 }}
                          />
                        </Pressable>
                      }
                    >
                      <Menu.Item
                        leadingIcon="clock-time-ten-outline"
                        onPress={() => {
                          setMenuVisibleId(null);
                          handleMenuEditDate(habit);
                        }}
                        title={t("habits.editDate")}
                      />
                      <Menu.Item
                        leadingIcon="cash-edit"
                        onPress={() => {
                          setMenuVisibleId(null);
                          handleMenuEditSavings(habit);
                        }}
                        title={t("habits.editSavings")}
                      />
                      <Menu.Item
                        leadingIcon="delete"
                        titleStyle={{ color: themes[scheme].colors.error }}
                        onPress={() => {
                          setMenuVisibleId(null);
                          handleDelete(habit);
                        }}
                        title={t("habits.delete")}
                      />
                    </Menu>
                  </View>
                </View>

                {(habit.date || habit.savings) && (
                  <>
                    <Divider style={globalStyles.divider} />
                    <View
                      style={[
                        globalStyles.flexRow,
                        globalStyles.justifyBetween,
                      ]}
                    >
                      <ThemedText>
                        {habit.date &&
                          dayjs(habit.date).format("D MMM YYYY, HH:mm")}
                      </ThemedText>

                      <ThemedText>
                        {habit.savings &&
                          `${formatAmount(Number(habit.savings), currency)}${t("common.perDay")}`}
                      </ThemedText>
                    </View>
                  </>
                )}

                <Divider style={globalStyles.divider} />

                <Button
                  mode="contained"
                  icon="sign-caution"
                  textColor={themes[scheme].colors.onSecondary}
                  style={[
                    globalStyles.flex1,
                    { backgroundColor: themes[scheme].colors.secondary },
                  ]}
                  onPress={() => handleReset(habit)}
                >
                  {t("habits.reset")}
                </Button>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── iOS date/time picker (wizard flow) ── */}
      {iosPickerActive && editingHabit && (
        <DateTimePicker
          mode={wizard!.step === "date" ? "date" : "time"}
          value={
            wizard!.step === "time" && wizard!.selectedDate
              ? wizard!.selectedDate
              : wizard!.flow === "reset"
                ? new Date()
                : editingHabit.date
                  ? new Date(editingHabit.date)
                  : new Date()
          }
          maximumDate={new Date()}
          onValueChange={handleIosPickerChange}
        />
      )}

      {/* ── iOS date picker (edit date menu) ── */}
      {Platform.OS === "ios" &&
        editPicker !== null &&
        editPicker.type === "date" &&
        editPickerHabit && (
          <DateTimePicker
            mode={editPicker.step === "date" ? "date" : "time"}
            value={
              editPicker.step === "time" && editPicker.selectedDate
                ? editPicker.selectedDate
                : editPickerHabit.date
                  ? new Date(editPickerHabit.date)
                  : new Date()
            }
            maximumDate={new Date()}
            onValueChange={handleIosEditPickerChange}
          />
        )}

      {/* ── Savings modal (wizard flow) ── */}
      {wizard !== null && wizard.step === "savings" && (
        <SavingsModal
          visible={savingsModalVisible}
          value={wizard.initialSavings}
          currency={currency}
          scheme={scheme}
          optional
          onSave={(savings) => handleWizardFinish(savings)}
          onDismiss={() => {
            if (wizardFinishedRef.current) {
              wizardFinishedRef.current = false;
              return;
            }
            handleWizardCancel(wizard.habitId, wizard.flow);
          }}
        />
      )}

      {/* ── Savings modal (edit menu) ── */}
      {editPicker !== null && editPicker.type === "savings" && (
        <SavingsModal
          visible={editSavingsModalVisible}
          value={editPicker.currentValue}
          currency={currency}
          scheme={scheme}
          optional={false}
          onSave={(savings) =>
            handleEditSavingsSave(editPicker.habitId, savings)
          }
          onDismiss={() => setEditPicker(null)}
        />
      )}

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
});
