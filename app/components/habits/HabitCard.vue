<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { formatAmount, formatDateTime, getHabitName } from '../../utils/domain'
import type { Habit } from '../../utils/types'
import HabitMenu from './HabitMenu.vue'

const { t, locale } = useI18n()

const props = defineProps<{ habit: Habit, currency: string }>()
const emit = defineEmits<{
  'edit-name': []
  'edit-date': []
  'edit-savings': []
  'delete': []
  'reset': []
  'slip': []
  'manage-slips': []
}>()

const name = computed(() => getHabitName(props.habit, t))
const dateLabel = computed(() =>
  formatDateTime(props.habit.date, locale.value),
)
const savingsLabel = computed(() =>
  props.habit.savings
    ? `${formatAmount(Number(props.habit.savings), props.currency)}${t('common.perDay')}`
    : '',
)
</script>

<template>
  <article class="rounded-2xl border border-border bg-surface p-4 shadow-sm">
    <div class="flex items-center justify-between gap-3">
      <h3 class="text-xs font-bold uppercase tracking-widest text-primary">
        {{ name }}
      </h3>
      <HabitMenu
        :name="name"
        :is-custom="!habit.key && Boolean(habit.name)"
        @edit-name="emit('edit-name')"
        @edit-date="emit('edit-date')"
        @edit-savings="emit('edit-savings')"
        @manage-slips="emit('manage-slips')"
        @delete="emit('delete')"
      />
    </div>

    <div
      v-if="dateLabel || savingsLabel"
      class="mt-2"
    >
      <p class="text-sm font-medium text-ink">
        {{ dateLabel }}
      </p>
      <p
        v-if="savingsLabel"
        class="text-sm text-muted"
      >
        {{ savingsLabel }}
      </p>
    </div>

    <div class="mt-3 flex gap-2">
      <button
        type="button"
        class="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-card"
        @click="emit('slip')"
      >
        {{ t('habits.iSlipped') }}
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        @click="emit('reset')"
      >
        {{ t('habits.logRelapse') }}
      </button>
    </div>
  </article>
</template>
