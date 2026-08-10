<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import {
  breakdown,
  daysSince,
  formatAmount,
  getHabitName,
  parseSavings,
} from "../../utils/domain";
import {
  formatMilestoneLabel,
  getNextMilestone,
  ringProgress,
} from "../../utils/milestones";
import type { Habit, Milestone } from "../../utils/types";
import MilestoneRing from "./MilestoneRing.vue";

const props = defineProps<{
  habit: Habit;
  milestones: Milestone[];
  now: Date;
  currency: string;
}>();

const { t } = useI18n();

const name = computed(() => getHabitName(props.habit, t));
const days = computed(() => daysSince(props.habit.date, props.now));
const parts = computed(() => breakdown(props.habit.date, props.now));
const progress = computed(() =>
  ringProgress(props.habit, props.milestones, props.now),
);
const next = computed(() =>
  getNextMilestone(props.habit, props.milestones, props.now),
);
const reached = computed(() =>
  props.milestones.filter((milestone) => milestone.reachedAt !== null),
);
const saved = computed(() => days.value * parseSavings(props.habit.savings));
const percent = computed(() => Math.round(progress.value * 100));

const justStarted = computed(() => {
  const { years, months, days: d, hours } = parts.value;
  return years === 0 && months === 0 && d === 0 && hours === 0;
});

/** Hero number: total days, or hours for streaks under a day. */
const bigValue = computed(() =>
  days.value > 0 ? days.value : parts.value.hours,
);
const bigUnitKey = computed(() => {
  if (days.value > 0) {
    return days.value === 1 ? "progress.day" : "progress.days";
  }
  return parts.value.hours === 1 ? "progress.hour" : "progress.hours";
});

/** Non-zero breakdown parts joined for the sub-line. */
const breakdownLabel = computed(() => {
  const { years, months, days: d, hours } = parts.value;
  const pieces: string[] = [];
  if (years) {
    pieces.push(
      `${years} ${t(years === 1 ? "progress.year" : "progress.years")}`,
    );
  }
  if (months) {
    pieces.push(
      `${months} ${t(months === 1 ? "progress.month" : "progress.months")}`,
    );
  }
  if (d) {
    pieces.push(`${d} ${t(d === 1 ? "progress.day" : "progress.days")}`);
  }
  // Hours are the hero number for sub-day streaks — skip the duplicate.
  if (hours && days.value > 0) {
    pieces.push(
      `${hours} ${t(hours === 1 ? "progress.hour" : "progress.hours")}`,
    );
  }
  return pieces.join(" · ");
});

const milestonesRef = ref<HTMLElement | null>(null);

onMounted(() => {
  // Scroll to the end of the milestones list.
  setTimeout(() => {
    milestonesRef.value?.scrollTo({
      left: milestonesRef.value.scrollWidth,
    });
  }, 300);
});
</script>

<template>
  <article
    class="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
  >
    <div
      class="absolute inset-y-0 left-0 w-1.25 bg-linear-to-b from-primary to-accent"
    />
    <div class="flex items-center gap-3.5 p-4 pl-5">
      <div class="min-w-0 flex-1">
        <p
          class="text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent"
        >
          {{ t("progress.freeFor", { name }) }}
        </p>
        <p
          v-if="!justStarted"
          class="mt-0.5 text-[44px] font-black leading-[1.05] tracking-tight text-ink"
        >
          {{ bigValue }}
          <span class="text-base font-bold text-muted">
            {{ t(bigUnitKey) }}
          </span>
        </p>
        <p v-else class="mt-2 text-sm font-semibold text-ink">
          {{ t("progress.justStarted") }}
        </p>
        <p class="mt-1 text-xs font-medium text-muted">{{ breakdownLabel }}</p>
        <p v-if="saved > 0" class="mt-0.5 text-xs font-bold text-primary">
          {{ formatAmount(saved, currency) }} {{ t("progress.saved") }}
        </p>
      </div>
      <div class="flex shrink-0 flex-col items-center gap-1.5">
        <MilestoneRing :progress="progress" />
        <span class="text-[11px] font-extrabold text-primary"
          >{{ percent }}%</span
        >
      </div>
    </div>
    <div
      ref="milestonesRef"
      class="chips flex gap-1.5 overflow-x-auto px-4 pb-3 scrollbar-none scroll-smooth"
    >
      <span
        class="fixed left-5.5 bg-linear-to-r from-surface to-transparent h-6.5 w-3.5"
      />
      <span
        v-for="milestone in reached"
        :key="milestone.id"
        class="shrink-0 whitespace-nowrap rounded-full border border-transparent bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-on-primary-soft"
      >
        ✓ {{ formatMilestoneLabel(milestone, t) }}
      </span>
      <span
        v-if="next"
        class="shrink-0 whitespace-nowrap rounded-full border border-dashed border-accent bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent"
      >
        {{ t("milestone.next", { milestone: formatMilestoneLabel(next, t) }) }}
      </span>
    </div>
  </article>
</template>

<style scoped>
.chips::-webkit-scrollbar {
  display: none;
}
</style>
