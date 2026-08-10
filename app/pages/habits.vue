<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { getHabitName } from "../utils/domain";
import { addHabit, deleteHabit, getHabits, updateHabit } from "../utils/habits";
import {
  deleteMilestonesForHabit,
  ensureMilestonesForHabit,
  getMilestonesForHabit,
  saveMilestonesForHabit,
} from "../utils/milestones-store";
import {
  cancelHabitNotifications,
  reconcileHabitNotifications,
  requestNotificationPermission,
} from "../utils/notifications";
import {
  getSettings,
  saveMilestoneNotificationsEnabled,
  saveMilestoneNotificationsPrompted,
} from "../utils/settings";
import type { Habit } from "../utils/types";
import ConfirmDialog from "../components/ui/ConfirmDialog.vue";
import Snackbar from "../components/ui/Snackbar.vue";
import HabitCard from "../components/habits/HabitCard.vue";
import MilestoneOptInDialog from "../components/habits/MilestoneOptInDialog.vue";
import RelapseConfirm from "../components/habits/RelapseConfirm.vue";
import SavingsModal from "../components/habits/SavingsModal.vue";
import WizardModal from "../components/habits/WizardModal.vue";

const { t } = useI18n();

// ── State ──

const habits = ref<Habit[]>([]);
const customHabitName = ref("");
const showCustomInput = ref(false);
const snackbarMessage = ref<string | null>(null);

interface WizardState {
  flow: "new" | "reset" | "edit";
  habitId: string;
  initialSavings: string | null;
  withSavings: boolean;
}
const wizard = ref<WizardState | null>(null);
const editSavings = ref<{
  habitId: string;
  currentValue: string | null;
} | null>(null);
const deletePending = ref<Habit | null>(null);
const relapsePending = ref<Habit | null>(null);
const optInVisible = ref(false);
const pendingOptInHabitId = ref<string | null>(null);
const customHabitInput = ref<HTMLInputElement | null>(null);

const settingsCurrency = computed(() => getSettings().currency);

const hasAlcohol = computed(() =>
  habits.value.some((h) => h.key === "habits.alcohol"),
);
const hasTobacco = computed(() =>
  habits.value.some((h) => h.key === "habits.tobacco"),
);

// ── Data ──

const loadHabits = (): void => {
  try {
    habits.value = getHabits();
  } catch {
    snackbarMessage.value = t("habits.failedToLoad");
  }
};

onMounted(loadHabits);

// ── Add ──

const handleAddHabit = (type: "alcohol" | "tobacco" | "Other"): void => {
  if (type === "Other") {
    showCustomInput.value = true;
    nextTick(() => customHabitInput.value?.focus());
    return;
  }
  const key = type === "alcohol" ? "habits.alcohol" : "habits.tobacco";
  try {
    const created = addHabit({ key, name: "", date: null, savings: null });
    loadHabits();
    startWizard("new", created.id, null);
  } catch {
    snackbarMessage.value = t("habits.failedToAdd", { name: t(key) });
  }
};

const handleAddCustomHabit = (): void => {
  const trimmed = customHabitName.value.trim();
  const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  if (!normalized) {
    snackbarMessage.value = t("habits.enterName");
    return;
  }
  try {
    const created = addHabit({ name: normalized, date: null, savings: null });
    customHabitName.value = "";
    showCustomInput.value = false;
    loadHabits();
    startWizard("new", created.id, null);
  } catch {
    snackbarMessage.value = t("habits.failedToAddCustom");
  }
};

// ── Wizard ──

const startWizard = (
  flow: WizardState["flow"],
  habitId: string,
  initialSavings: string | null,
  withSavings = true,
): void => {
  wizard.value = { flow, habitId, initialSavings, withSavings };
};

const wizardHabit = computed(() =>
  wizard.value
    ? (habits.value.find((h) => h.id === wizard.value!.habitId) ?? null)
    : null,
);

const wizardName = computed(() =>
  wizardHabit.value ? getHabitName(wizardHabit.value, t) : "",
);

const handleWizardCancel = (): void => {
  const current = wizard.value;
  if (current && current.flow === "new") {
    // The habit was created before the wizard — drop it when cancelled.
    try {
      deleteHabit(current.habitId);
    } catch {
      // ignore — habit may already be gone
    }
    loadHabits();
  }
  wizard.value = null;
};

const handleWizardFinish = async (
  date: Date,
  savings: string | null,
): Promise<void> => {
  const current = wizard.value;
  if (!current) return;
  const habitId = current.habitId;
  try {
    // Reset flow: tear down the previous streak before the date changes.
    if (current.flow === "reset") {
      await cancelHabitNotifications(getMilestonesForHabit(habitId));
      deleteMilestonesForHabit(habitId);
    }

    const updates: Partial<Habit> = { date: date.toISOString() };
    if (current.flow !== "edit") updates.savings = savings;
    updateHabit(habitId, updates);
    loadHabits();

    // Initialize/refresh the current streak's milestones, then schedule
    // future targets only when the user opted in.
    const habit = getHabits().find((h) => h.id === habitId);
    if (habit?.date) {
      const now = new Date();
      ensureMilestonesForHabit(habit, now);
      if (getSettings().milestoneNotificationsEnabled) {
        const stored = getMilestonesForHabit(habit.id);
        saveMilestonesForHabit(
          habit.id,
          await reconcileHabitNotifications(habit, stored, t, now),
        );
      }
    }

    // First completed wizard: show the one-time opt-in prompt.
    if (
      current.flow === "new" &&
      !getSettings().milestoneNotificationsPrompted
    ) {
      saveMilestoneNotificationsPrompted(true);
      pendingOptInHabitId.value = habitId;
      optInVisible.value = true;
    }
  } catch {
    snackbarMessage.value = t("habits.failedToSave");
  }
  wizard.value = null;
};

// ── Edit savings ──

const handleEditSavingsSave = (savings: string | null): void => {
  const target = editSavings.value;
  if (!target) return;
  try {
    updateHabit(target.habitId, { savings });
    loadHabits();
  } catch {
    snackbarMessage.value = t("habits.failedToUpdateSavings");
  }
  editSavings.value = null;
};

// ── Delete ──

const handleDeleteConfirm = async (): Promise<void> => {
  const habit = deletePending.value;
  if (!habit) return;
  try {
    // Cancel pending schedules first; failures keep the milestone record so
    // ids can be retried (never silently lose ids).
    await cancelHabitNotifications(getMilestonesForHabit(habit.id));
    deleteMilestonesForHabit(habit.id);
    deleteHabit(habit.id);
    loadHabits();
  } catch {
    snackbarMessage.value = t("habits.failedToDelete", {
      name: getHabitName(habit, t),
    });
  }
  deletePending.value = null;
};

// ── Relapse ──

const handleRelapseConfirm = (): void => {
  const habit = relapsePending.value;
  if (!habit) return;
  relapsePending.value = null;
  startWizard("reset", habit.id, habit.savings);
};

// ── Milestone opt-in ──

const handleOptInEnable = async (): Promise<void> => {
  const habitId = pendingOptInHabitId.value;
  optInVisible.value = false;
  pendingOptInHabitId.value = null;

  const granted = await requestNotificationPermission();
  if (!granted) return; // keep preference disabled; in-app celebration still works

  saveMilestoneNotificationsEnabled(true);
  if (habitId) {
    try {
      const habit = getHabits().find((h) => h.id === habitId);
      if (habit?.date) {
        const stored = getMilestonesForHabit(habit.id);
        saveMilestonesForHabit(
          habit.id,
          await reconcileHabitNotifications(habit, stored, t, new Date()),
        );
      }
    } catch {
      snackbarMessage.value = t("habits.failedToSave");
    }
  }
};

const handleOptInNotNow = (): void => {
  optInVisible.value = false;
  pendingOptInHabitId.value = null;
};

const handleCustomHabitInputBlur = (): void => {
  setTimeout(() => {
    showCustomInput.value = false;
  }, 100);
};
</script>

<template>
  <main class="flex flex-col gap-4 px-4 py-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-black tracking-tight text-ink">
        {{ t("tabs.habits") }}
      </h1>
    </div>

    <!-- Standard habits (hidden once added) + custom -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-if="!hasAlcohol"
        type="button"
        class="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-card"
        @click="handleAddHabit('alcohol')"
      >
        {{ t("habits.alcohol") }}
      </button>
      <button
        v-if="!hasTobacco"
        type="button"
        class="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-card"
        @click="handleAddHabit('tobacco')"
      >
        {{ t("habits.tobacco") }}
      </button>
      <button
        type="button"
        class="rounded-full text-sm font-medium border border-dashed border-border align-middle bg-surface px-4 py-1.5 text-ink transition-colors hover:bg-card"
        :aria-label="t('habits.addCustom')"
        @click="handleAddHabit('Other')"
      >
        + {{ t("habits.addAnother") }}
      </button>
    </div>

    <!-- Custom name input -->
    <div v-if="showCustomInput" class="flex items-center gap-2">
      <input
        v-model="customHabitName"
        ref="customHabitInput"
        type="text"
        :placeholder="t('habits.habitName')"
        class="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
        @blur="handleCustomHabitInputBlur"
      />
      <button
        type="button"
        class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        @click="handleAddCustomHabit"
      >
        {{ t("habits.add") }}
      </button>
    </div>

    <!-- List (newest first) -->
    <div
      v-if="habits.length === 0"
      class="py-10 text-center text-sm text-muted"
    >
      {{ t("habits.noHabits") }}
    </div>
    <div v-else class="flex flex-col gap-3">
      <HabitCard
        v-for="habit in [...habits].reverse()"
        :key="habit.id"
        :habit="habit"
        :currency="settingsCurrency"
        @edit-date="startWizard('edit', habit.id, habit.savings, false)"
        @edit-savings="
          editSavings = { habitId: habit.id, currentValue: habit.savings }
        "
        @delete="deletePending = habit"
        @reset="relapsePending = habit"
      />
    </div>

    <!-- Wizard (new / reset / edit-date) -->
    <WizardModal
      v-if="wizard && wizardHabit"
      :visible="true"
      :flow="wizard.flow"
      :habit-name="wizardName"
      :initial-savings="wizard.initialSavings"
      :currency="settingsCurrency"
      :with-savings="wizard.withSavings"
      @finish="handleWizardFinish"
      @cancel="handleWizardCancel"
    />

    <!-- Edit savings -->
    <SavingsModal
      v-if="editSavings"
      :visible="true"
      :value="editSavings.currentValue"
      :currency="settingsCurrency"
      @save="handleEditSavingsSave"
      @dismiss="editSavings = null"
    />

    <!-- Relapse confirm -->
    <RelapseConfirm
      v-if="relapsePending"
      :visible="true"
      :name="getHabitName(relapsePending, t)"
      @confirm="handleRelapseConfirm"
      @cancel="relapsePending = null"
    />

    <!-- Delete confirm -->
    <ConfirmDialog
      v-if="deletePending"
      :title="t('habits.deleteTitle', { name: getHabitName(deletePending, t) })"
      :message="
        t('habits.deleteConfirm', { name: getHabitName(deletePending, t) })
      "
      :confirm-label="t('habits.delete')"
      destructive
      @confirm="handleDeleteConfirm"
      @cancel="deletePending = null"
    />

    <!-- Milestone opt-in (once) -->
    <MilestoneOptInDialog
      :visible="optInVisible"
      @enable="handleOptInEnable"
      @not-now="handleOptInNotNow"
    />

    <Snackbar :message="snackbarMessage" @dismiss="snackbarMessage = null" />
  </main>
</template>
