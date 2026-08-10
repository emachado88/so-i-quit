<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import SavingsModal from './SavingsModal.vue'

/**
 * Stepper wizard: date → time → (optional) savings.
 *
 * Uses native `<input type="date|time">` — on Android WebView these open
 * the platform pickers. `max` pins the quit date to today.
 */
const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    visible: boolean
    flow: 'new' | 'reset' | 'edit'
    habitName: string
    initialSavings: string | null
    currency: string
    withSavings?: boolean
  }>(),
  { withSavings: true },
)
const emit = defineEmits<{
  finish: [date: Date, savings: string | null]
  cancel: []
}>()

type Step = 'date' | 'time' | 'savings'
const step = ref<Step>('date')
const dateStr = ref('')
const timeStr = ref('')

const today = new Date()
const todayStr = computed(() => {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      step.value = 'date'
      dateStr.value = ''
      timeStr.value = ''
    }
  },
)

const selectedDate = (): Date | null => {
  if (!dateStr.value || !timeStr.value) return null
  const [y, m, d] = dateStr.value.split('-').map(Number)
  const [hh, mm] = timeStr.value.split(':').map(Number)
  if (!y || !m || !d || hh === undefined || mm === undefined) return null
  return new Date(y, m - 1, d, hh, mm, 0, 0)
}

const goToTime = (): void => {
  if (dateStr.value) step.value = 'time'
}

const goToSavingsOrFinish = (): void => {
  const date = selectedDate()
  if (!date) return
  if (props.withSavings) {
    step.value = 'savings'
  } else {
    // Edit-date flow: finish right after the time step (savings untouched).
    emit('finish', date, null)
  }
}
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    @click.self="emit('cancel')"
  >
    <div class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
      <p class="text-xs font-bold uppercase tracking-widest text-primary">
        {{
          flow === 'edit'
            ? t('habits.editDate')
            : flow === 'reset'
              ? t('habits.logRelapse')
              : t('habits.addNew')
        }}
      </p>
      <h3 class="mt-1 text-lg font-bold text-ink">{{ habitName }}</h3>

      <template v-if="step === 'date'">
        <label for="wizard-date" class="mt-4 mb-1 block text-xs font-semibold text-muted">
          {{ t('habits.date') }}
        </label>
        <input
          id="wizard-date"
          v-model="dateStr"
          type="date"
          :max="todayStr"
          class="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
            @click="emit('cancel')"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="!dateStr"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            @click="goToTime"
          >
            {{ t('savings.confirm') }}
          </button>
        </div>
      </template>

      <template v-else-if="step === 'time'">
        <label for="wizard-time" class="mt-4 mb-1 block text-xs font-semibold text-muted">
          {{ t('habits.time') }}
        </label>
        <input
          id="wizard-time"
          v-model="timeStr"
          type="time"
          class="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
        />
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
            @click="emit('cancel')"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="!timeStr"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            @click="goToSavingsOrFinish"
          >
            {{ t('savings.confirm') }}
          </button>
        </div>
      </template>
    </div>
  </div>

  <SavingsModal
    v-if="visible && step === 'savings'"
    :visible="true"
    :value="initialSavings"
    :currency="currency"
    optional
    @save="(savings) => { const date = selectedDate(); if (date) emit('finish', date, savings) }"
    @dismiss="emit('cancel')"
  />
</template>
