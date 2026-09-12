<script setup lang="ts">
import { registerBackHandler } from '../../utils/back-handler'
import { impact, ImpactStyle } from '../../utils/haptics'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    visible: boolean
    value: string | null
    /**
     * Register a hardware-back handler that dismisses this modal. Only the
     * STANDALONE usage passes it (edit-savings on the habits screen) — the
     * wizard renders its savings step with this modal and owns back
     * handling itself (step back to the time step, not dismiss).
     */
    handleBack?: boolean
  }>(),
  { handleBack: false },
)
const emit = defineEmits<{ save: [name: string], dismiss: [] }>()

const localValue = ref(props.value ?? '')

// Focus trap: keyboard navigation stays inside the dialog while it is open,
// and focus returns to the trigger element on close. The ref sits on the
// dialog root (not the input) so Tab/Shift+Tab can cycle the buttons;
// opening still lands focus on the name input (first focusable).
const dialogRef = ref<HTMLElement | null>(null)
useFocusTrap(computed(() => props.visible), dialogRef)

watch(
  () => props.visible,
  (visible) => {
    if (visible) localValue.value = props.value ?? ''
  },
)

const handleSave = (): void => {
  const trimmed = localValue.value.trim()
  if (!trimmed) {
    impact(ImpactStyle.Light)
    return
  }
  impact(ImpactStyle.Medium)
  emit('save', trimmed)
}

/** Cancel keeps the previous value (wizard flow). */
const handleCancel = (): void => {
  emit('dismiss')
}

// ── Hardware back (Android) ──
//
// Standalone usage only (`handle-back` prop): back dismisses the modal —
// the same as tapping outside or Cancel.
let removeBackHandler: (() => void) | null = null

watch(
  () => props.visible,
  (visible) => {
    if (visible && props.handleBack && !removeBackHandler) {
      removeBackHandler = registerBackHandler(() => {
        emit('dismiss')
        return true
      })
    }
    else if ((!visible || !props.handleBack) && removeBackHandler) {
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
          {{ t("name.title") }}
        </h3>
        <p class="mt-1 text-sm text-muted">
          {{ t("name.subtitle", { habit: value }) }}
        </p>

        <div class="mt-4">
          <label
            for="name"
            class="mb-1 block text-xs font-semibold text-muted"
          >
            {{ t("name.label") }}
          </label>
          <div
            class="flex items-center rounded-xl border border-border bg-bg px-3 transition-colors focus-within:border-primary"
          >
            <input
              id="name"
              type="text"
              :placeholder="t('name.hint')"
              :value="localValue"
              class="w-full bg-transparent px-2 py-2.5 text-sm text-ink outline-none"
              @input="
                localValue = ($event.target as HTMLInputElement).value
              "
            >
          </div>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
            @click="handleCancel"
          >
            {{ t("name.cancel") }}
          </button>
          <button
            type="button"
            :disabled="!localValue || localValue === value"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            @click="handleSave"
          >
            {{ t("name.confirm") }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
