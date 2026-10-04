<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { Check, Pencil, Trash2, X } from 'lucide-vue-next'

import { registerBackHandler } from '../../utils/back-handler'
import { formatDate } from '../../utils/domain'
import { useFocusTrap } from '../../composables/useFocusTrap'
import type { Slip } from '../../utils/types'

/**
 * Slips manager. One component serves both surfaces:
 *  - manage (Habits → "Manage slips"): edit a slip's date inline or delete it;
 *  - readonly (Progress → the slip indicator's ⓘ): just the list.
 *
 * The parent owns persistence: edits emit `update`, deletes emit
 * `delete-request` (the page routes it through the shared ConfirmDialog).
 */
const { t, locale } = useI18n()

/** iOS WKWebView only — Android/browser keep the plain native input. */
const isIOS = Capacitor.getPlatform() === 'ios'

const props = withDefaults(
  defineProps<{
    visible: boolean
    habitName: string
    slips: Slip[]
    readonly?: boolean
  }>(),
  { readonly: false },
)
const emit = defineEmits<{
  'update': [slipId: string, date: Date]
  'delete-request': [slip: Slip]
  'dismiss': []
}>()

const dialogRef = ref<HTMLElement | null>(null)
useFocusTrap(computed(() => props.visible), dialogRef)

/** Newest first — the most recent slip is the one you look for. */
const ordered = computed(() =>
  [...props.slips].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  ),
)

const pad = (n: number): string => String(n).padStart(2, '0')
const toInput = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const todayStr = computed(() => toInput(new Date().toISOString()))

const formatDateInput = (value: string): string => {
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return value
  return new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(y, m - 1, d))
}

const editingId = ref<string | null>(null)
const editDateStr = ref('')

const startEdit = (slip: Slip): void => {
  editingId.value = slip.id
  editDateStr.value = toInput(slip.date)
}

const cancelEdit = (): void => {
  editingId.value = null
  editDateStr.value = ''
}

const saveEdit = (): void => {
  const id = editingId.value
  if (!id || !editDateStr.value) return
  const [y, m, d] = editDateStr.value.split('-').map(Number)
  if (!y || !m || !d) return
  emit('update', id, new Date(y, m - 1, d, 0, 0, 0, 0))
  cancelEdit()
}

// Opening/closing resets any in-flight edit.
watch(
  () => props.visible,
  (visible) => {
    if (!visible) cancelEdit()
  },
)

// ── Hardware back (Android) ──
// Back closes the dialog (or steps out of an edit first).
let removeBackHandler: (() => void) | null = null

watch(
  () => props.visible,
  (visible) => {
    if (visible && !removeBackHandler) {
      removeBackHandler = registerBackHandler(() => {
        if (editingId.value) cancelEdit()
        else emit('dismiss')
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
        <h3 class="text-lg font-bold text-ink">
          {{ t("slips.title") }}
        </h3>
        <p class="mt-1 text-sm text-muted">
          {{ habitName }}
        </p>

        <p
          v-if="ordered.length === 0"
          class="mt-4 rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted"
        >
          {{ t("slips.empty") }}
        </p>
        <ul
          v-else
          class="mt-4 flex max-h-[55vh] flex-col gap-2 overflow-y-auto"
        >
          <li
            v-for="slip in ordered"
            :key="slip.id"
            class="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2"
          >
            <template v-if="editingId === slip.id">
              <template v-if="isIOS">
                <div
                  class="relative flex min-h-9 flex-1 items-center rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink focus-within:border-primary"
                >
                  <input
                    :id="`slip-edit-${slip.id}`"
                    v-model="editDateStr"
                    type="date"
                    :max="todayStr"
                    class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  >
                  <span
                    class="pointer-events-none min-w-0 flex-1 truncate"
                    :class="editDateStr ? 'text-ink' : 'text-muted'"
                  >
                    {{ editDateStr ? formatDateInput(editDateStr) : "—" }}
                  </span>
                </div>
              </template>
              <input
                v-else
                :id="`slip-edit-${slip.id}`"
                v-model="editDateStr"
                type="date"
                :max="todayStr"
                class="min-w-0 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-primary"
              >
              <button
                type="button"
                class="rounded-lg p-1.5 text-primary transition-colors hover:bg-card"
                :aria-label="t('savings.save')"
                @click="saveEdit"
              >
                <Check class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="rounded-lg p-1.5 text-muted transition-colors hover:bg-card"
                :aria-label="t('common.cancel')"
                @click="cancelEdit"
              >
                <X class="h-4 w-4" />
              </button>
            </template>

            <template v-else>
              <span class="flex-1 text-sm text-ink">
                {{ formatDate(slip.date, locale) }}
              </span>
              <template v-if="!readonly">
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-muted transition-colors hover:bg-card hover:text-ink"
                  :aria-label="t('slips.edit')"
                  @click="startEdit(slip)"
                >
                  <Pencil class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-danger transition-colors hover:bg-danger/10"
                  :aria-label="t('slips.delete')"
                  @click="emit('delete-request', slip)"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </template>
            </template>
          </li>
        </ul>

        <div class="mt-5 flex justify-end">
          <button
            type="button"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            @click="emit('dismiss')"
          >
            {{ t("common.dismiss") }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
