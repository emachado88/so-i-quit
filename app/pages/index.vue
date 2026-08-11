<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import { useNow } from "../composables/useNow";
import CelebrationToast from "../components/progress/CelebrationToast.vue";
import HabitProgressCard from "../components/progress/HabitProgressCard.vue";
import TotalSavingsCard from "../components/progress/TotalSavingsCard.vue";
import Snackbar from "../components/ui/Snackbar.vue";
import { daysSince, getHabitName, parseSavings } from "../utils/domain";
import { getHabits } from "../utils/habits";
import { impact, ImpactStyle, notify, NotificationType } from "../utils/haptics";
import { formatMilestoneLabel, isMilestoneReached } from "../utils/milestones";
import {
  ensureMilestonesForHabit,
  saveMilestonesForHabit,
} from "../utils/milestones-store";
import {
  addAppForegroundListener,
  reconcileHabitNotifications,
} from "../utils/notifications";
import { getSettings } from "../utils/settings";
import type { Habit, Milestone } from "../utils/types";

/** Pending in-app celebration (newly crossed milestone). */
interface Celebration {
  habitId: string;
  milestone: Milestone;
}

const { t, locale } = useI18n();
const router = useRouter();

// ── State ──

const habits = ref<Habit[]>([]);
const milestonesByHabit = ref<Record<string, Milestone[]>>({});
const celebrations = ref<Celebration[]>([]);
const snackbarMessage = ref<string | null>(null);
const now = useNow();

// ── App foreground tracking (RN AppState parity) ──
// The toast gate needs "is the app the active surface". The WebView's DOM
// visibility doesn't track app backgrounding (see notifications.ts), so the
// flag is driven by the native app lifecycle, with `visibilitychange` as the
// browser-dev fallback.
const appActive = ref(
  typeof document !== "undefined" && document.visibilityState === "visible",
);
let foregroundSub: { remove: () => void } | null = null;

const handleVisibilityChange = (): void => {
  appActive.value = document.visibilityState === "visible";
  if (appActive.value) void load();
};

// ── Live milestone crossings ──
// The clock ticks every second; while the page stays mounted, a milestone
// target may pass under the user. Re-run the roll-forward the moment a
// crossed target is detected — no storage I/O on plain ticks (the scan is
// in-memory; only an actual crossing persists).
watch(
  () => now.value.getTime(),
  (tick) => {
    if (!appActive.value) return;
    const current = new Date(tick);
    for (const habit of datedHabits.value) {
      const stored = milestonesByHabit.value[habit.id];
      if (!stored || stored.length === 0) continue;
      const crossed = stored.some(
        (m) => m.reachedAt === null && isMilestoneReached(habit, m, current),
      );
      if (!crossed) continue;
      const result = ensureMilestonesForHabit(habit, current);
      milestonesByHabit.value[habit.id] = result.milestones;
      for (const milestone of result.newlyReached) {
        celebrations.value.push({ habitId: habit.id, milestone });
      }
    }
  },
);

const datedHabits = computed(() =>
  [...habits.value]
    .filter((habit) => habit.date)
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
);
const hasAnyHabitWithDate = computed(() => datedHabits.value.length > 0);
const totalSavings = computed(() =>
  habits.value.reduce(
    (sum, habit) =>
      sum + daysSince(habit.date, now.value) * parseSavings(habit.savings),
    0,
  ),
);
const sinceDate = computed(() => datedHabits.value[0]?.date ?? null);
const currency = computed(() => getSettings().currency);

// ── Navigation (locale-aware, no Nuxt auto-imports — unit-test friendly) ──

const goToHabits = (): void => {
  impact(ImpactStyle.Medium);
  const prefix = locale.value === "en" ? "" : `/${locale.value}`;
  router.push(`${prefix}/habits`);
};

// ── Data ──

const load = async (): Promise<void> => {
  try {
    habits.value = getHabits();
    const nowDate = now.value;
    const newly: Celebration[] = [];
    const byHabit: Record<string, Milestone[]> = {};

    for (const habit of datedHabits.value) {
      // Roll reached targets forward and collect newly crossed milestones
      // for the in-app celebration queue.
      const result = ensureMilestonesForHabit(habit, nowDate);
      byHabit[habit.id] = result.milestones;
      for (const milestone of result.newlyReached) {
        newly.push({ habitId: habit.id, milestone });
      }
      // Extend the native schedule through the rolling horizon when
      // notifications are enabled (new annuals get scheduled).
      if (getSettings().milestoneNotificationsEnabled) {
        byHabit[habit.id] = await reconcileHabitNotifications(
          habit,
          byHabit[habit.id] as Milestone[],
          t,
          nowDate,
        );
        saveMilestonesForHabit(habit.id, byHabit[habit.id] as Milestone[]);
      }
    }
    milestonesByHabit.value = byHabit;

    // Only toast while the app is the active surface; backgrounded, the OS
    // notification already covered it (RN AppState parity).
    if (newly.length > 0 && appActive.value) {
      celebrations.value = [...celebrations.value, ...newly];
    }
  } catch {
    snackbarMessage.value = t("progress.failedToLoad");
  }
};

// Re-check on mount and every time the app returns to the foreground — a
// milestone may have been crossed while backgrounded (the OS notification
// covered it, but the in-app celebration should still fire on return; RN
// parity: useFocusEffect re-runs on app resume via React Navigation).
onMounted(() => {
  void load();
  foregroundSub = addAppForegroundListener(() => {
    appActive.value = true;
    void load();
  });
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onUnmounted(() => {
  foregroundSub?.remove();
  foregroundSub = null;
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});

// ── Celebration queue ──

// A milestone was reached → success haptic (native only; no-op in the
// browser). Fires for mount/foreground crossings and live in-page ones —
// every path that pushes into the queue.
watch(celebrations, (list) => {
  if (list.length > 0) notify(NotificationType.Success);
});

const activeCelebration = computed(() => celebrations.value[0] ?? null);
const activeCelebrationText = computed(() => {
  const celebration = activeCelebration.value;
  if (!celebration) return null;
  const habit = habits.value.find((h) => h.id === celebration.habitId);
  return habit
    ? t("milestone.reachedBody", {
        habit: getHabitName(habit, t),
        milestone: formatMilestoneLabel(celebration.milestone, t),
      })
    : t("milestone.reached");
});
const dismissCelebration = (): void => {
  celebrations.value = celebrations.value.slice(1);
};
</script>

<template>
  <main
    class="flex flex-col gap-4 px-4 py-6"
    :class="{ 'pb-28': totalSavings > 0 }"
  >
    <!-- Empty state (wireframe): no habits yet → guide to the Habits tab -->
    <div
      v-if="habits.length === 0"
      class="flex flex-col items-center gap-3 px-6 py-16 text-center"
    >
      <div
        class="flex h-21 w-21 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--color-primary-hover),var(--color-depth))] text-4xl shadow-md"
      >
        🚭
      </div>
      <h1 class="text-xl font-black tracking-tight text-ink">
        {{ t("progress.readyToGetBetter") }}
      </h1>
      <p class="max-w-65 text-[13.5px] leading-relaxed text-muted">
        {{ t("progress.emptyBody") }}
      </p>
      <button
        type="button"
        class="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        @click="goToHabits"
      >
        {{ t("progress.emptyCta") }}
      </button>
    </div>

    <template v-else>
      <div>
        <h1 class="text-2xl font-black tracking-tight text-ink">
          {{ t("tabs.progress") }}
        </h1>
        <p class="mt-0.5 text-[13px] text-muted">
          {{
            hasAnyHabitWithDate
              ? t("progress.doingGreat")
              : t("progress.noData")
          }}
        </p>
        <button
          v-if="!hasAnyHabitWithDate"
          type="button"
          class="mt-1 text-[13px] font-bold text-primary underline underline-offset-2"
          @click="goToHabits"
        >
          {{ t("progress.goToHabits") }}
        </button>
      </div>

      <HabitProgressCard
        v-for="habit in datedHabits"
        :key="habit.id"
        :habit="habit"
        :milestones="milestonesByHabit[habit.id] ?? []"
        :now="now"
        :currency="currency"
      />
    </template>

    <!-- Pinned above the TabBar; the habit cards scroll behind it -->
    <div
      v-if="totalSavings > 0"
      class="fixed py-3 bottom-[calc(3.7rem+env(safe-area-inset-bottom,0px))] left-1/2 z-40 w-full max-w-107.5 -translate-x-1/2 px-4 backdrop-blur bg-linear-to-b from-transparent to-surface/85 border-t border-border"
    >
      <TotalSavingsCard
        :total="totalSavings"
        :since-date="sinceDate"
        :currency="currency"
      />
    </div>

    <CelebrationToast
      :message="activeCelebrationText"
      @dismiss="dismissCelebration"
    />
    <Snackbar :message="snackbarMessage" @dismiss="snackbarMessage = null" />
  </main>
</template>
