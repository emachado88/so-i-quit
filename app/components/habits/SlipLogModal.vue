<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'

import { registerBackHandler } from '../../utils/back-handler'
import { impact, ImpactStyle } from '../../utils/haptics'
import { useFocusTrap } from '../../composables/useFocusTrap'

/**
 * Log-a-slip dialog: a single date field (defaults to today, future blocked).
 * A slip is a one-time thing — unlike the relapse wizard it takes no time and
 * no savings, and confirms inline instead of restarting a streak.
 *
 * The date input uses the same iOS overlay trick as WizardModal: WKWebView
 * renders temporal inputs from un-stylable UA shadow-DOM rules, so iOS gets an
 * invisible native input over a styled value div.
 */
const { t, locale } = useI18n()

/** iOS WKWebView only — Android/browser keep the plain native input. */
const isIOS = Capacitor.getPlatform() === 'ios'

const props = defineProps<{ visible: boolean, habitName: string }>()
const emit = defineEmits<{ save: [date: Date], cancel: [] }>()

const dialogRef = ref<HTMLElement | null>(null)
useFocusTrap(computed(() => props.visible), dialogRef)

const today = ref<Date>(new Date())
const dateStr = ref('')

const pad = (n: number): string => String(n).padStart(2, '0')
const toInput = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const todayStr = computed(() => toInput(today.value))

/** Localized compact date for the iOS overlay display (no UTC day-shift). */
const formatDateInput = (value: string): string => {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      // Refresh "today" so the max stays pinned even across a midnight edge.
      today.value = new Date()
      dateStr.value = toInput(today.value)
    }
  },
)

const selectedDate = (): Date | null => {
  if (!dateStr.value) return null
  const [y, m, d] = dateStr.value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

const handleSave = (): void => {
  const date = selectedDate()
  if (!date) return
  impact(ImpactStyle.Medium)
  emit('save', date)
}

// ── Hardware back (Android) ──
// Back dismisses the dialog — the same as tapping outside or Cancel.
let removeBackHandler: (() => void) | null = null

watch(
  () => props.visible,
  (visible) => {
    if (visible && !removeBackHandler) {
      removeBackHandler = registerBackHandler(() => {
        emit('cancel')
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
      ref="dialogRef"
      class="fixed inset-0 z-60 flex items-center-safe justify-center bg-black/40 backdrop-blur p-4 sm:items-center"
    >
      <div class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
        <p class="text-xs font-bold uppercase tracking-widest text-primary">
          {{ t("slips.logTitle") }}
        </p>
        <h3 class="mt-1 text-lg font-bold text-ink">
          {{ habitName }}
        </h3>
        <p class="mt-1 text-sm text-muted">
          {{ t("slips.logSubtitle") }}
        </p>

        <div class="mt-4">
          <label
            for="slip-date"
            class="mb-1 block text-xs font-semibold text-muted"
          >
            {{ t("habits.date") }}
          </label>
          <template v-if="isIOS">
            <div
              class="relative flex min-h-11 w-full items-center rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink focus-within:border-primary"
            >
              <input
                id="slip-date"
                v-model="dateStr"
                type="date"
                :max="todayStr"
                class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              >
              <span
                class="pointer-events-none min-w-0 flex-1 truncate"
                :class="dateStr ? 'text-ink' : 'text-muted'"
              >
                {{ dateStr ? formatDateInput(dateStr) : "—" }}
              </span>
            </div>
          </template>
          <input
            v-else
            id="slip-date"
            v-model="dateStr"
            type="date"
            :max="todayStr"
            class="min-w-0 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
          >
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
            :disabled="!dateStr"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            @click="handleSave"
          >
            {{ t("slips.confirm") }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
