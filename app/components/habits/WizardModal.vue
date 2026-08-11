<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { registerBackHandler } from '../../utils/back-handler'
import { impact, ImpactStyle } from '../../utils/haptics'
import SavingsModal from './SavingsModal.vue'

/**
 * Wizard: date + time on one step → (optional) savings.
 *
 * Uses native `<input type="date|time">` — on Android WebView these open
 * the platform pickers. `max` pins the quit date to today. The confirm
 * button stays disabled until both fields are filled.
 */
const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    visible: boolean
    flow: 'new' | 'reset' | 'edit'
    habitName: string
    /** Current quit date (ISO) — pre-filled into the datetime step for the edit flow. */
    initialDate?: string | null
    initialSavings: string | null
    currency: string
    withSavings?: boolean
  }>(),
  { withSavings: true, initialDate: null },
)
const emit = defineEmits<{
  finish: [date: Date, savings: string | null]
  cancel: []
}>()

type Step = 'datetime' | 'savings'
const step = ref<Step>('datetime')
const dateStr = ref('')
const timeStr = ref('')

const today = new Date()
const todayStr = computed(() => {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
})

/** Local yyyy-mm-dd + hh:mm from an ISO string ('' when null/invalid). */
const isoToInputs = (iso: string | null): { date: string, time: string } => {
  if (!iso) return { date: '', time: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { date: '', time: '' }
  const pad = (n: number): string => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      step.value = 'datetime'
      // Edit flow: pre-fill the current saved date so the user sees/tweaks
      // it instead of retyping from scratch. New/reset start blank.
      const initial
        = props.flow === 'edit' ? isoToInputs(props.initialDate) : null
      dateStr.value = initial?.date ?? ''
      timeStr.value = initial?.time ?? ''
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

const goToSavingsOrFinish = (): void => {
  const date = selectedDate()
  if (!date) return
  impact(ImpactStyle.Medium)
  if (props.withSavings) {
    step.value = 'savings'
  }
  else {
    // Edit-date flow: finish right after the datetime step (savings untouched).
    emit('finish', date, null)
  }
}

// ── Hardware back (Android) ──
//
// The wizard owns the whole stepper (including the savings sub-step, which
// is rendered as a SavingsModal without `handle-back` so it does not
// register its own handler). Back steps to the previous step and cancels
// from the first one — mirroring the RN app's modal back behavior.
let removeBackHandler: (() => void) | null = null

watch(
  () => props.visible,
  (visible) => {
    if (visible && !removeBackHandler) {
      removeBackHandler = registerBackHandler(() => {
        if (step.value === 'savings') {
          step.value = 'datetime'
        }
        else {
          emit('cancel')
        }
        return true
      })
    }
    else if (!visible && removeBackHandler) {
      removeBackHandler()
      removeBackHandler = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  removeBackHandler?.()
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-105"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-105"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-50 flex items-center-safe justify-center bg-black/40 backdrop-blur p-4 sm:items-center"
    >
      <div class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
        <p class="text-xs font-bold uppercase tracking-widest text-primary">
          {{
            flow === "edit"
              ? t("habits.editDate")
              : flow === "reset"
                ? t("habits.logRelapse")
                : t("habits.addNew")
          }}
        </p>
        <h3 class="mt-1 text-lg font-bold text-ink">
          {{ habitName }}
        </h3>

        <template v-if="step === 'datetime'">
          <div class="mt-4 flex gap-3">
            <div class="flex-1">
              <label
                for="wizard-date"
                class="mb-1 block text-xs font-semibold text-muted"
              >
                {{ t("habits.date") }}
              </label>
              <input
                id="wizard-date"
                v-model="dateStr"
                type="date"
                :max="todayStr"
                class="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
              >
            </div>
            <div class="w-28">
              <label
                for="wizard-time"
                class="mb-1 block text-xs font-semibold text-muted"
              >
                {{ t("habits.time") }}
              </label>
              <input
                id="wizard-time"
                v-model="timeStr"
                type="time"
                class="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
              >
            </div>
          </div>
          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
              @click="emit('cancel')"
            >
              {{ t("common.cancel") }}
            </button>
            <button
              type="button"
              :disabled="!dateStr || !timeStr"
              class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              @click="goToSavingsOrFinish"
            >
              {{ t("savings.confirm") }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </Transition>

  <SavingsModal
    :visible="visible && step === 'savings'"
    :value="initialSavings"
    :currency="currency"
    optional
    @save="
      (savings) => {
        const date = selectedDate();
        if (date) emit('finish', date, savings);
      }
    "
    @dismiss="emit('cancel')"
  />
</template>
