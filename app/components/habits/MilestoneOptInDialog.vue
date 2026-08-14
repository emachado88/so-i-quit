<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { registerBackHandler } from '../../utils/back-handler'
import { impact, ImpactStyle } from '../../utils/haptics'

const { t } = useI18n()

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ 'enable': [], 'not-now': [] }>()

// Hardware back (Android): treat it like "Not now" — dismiss without
// enabling notifications. The dialog is always mounted, so registration
// follows the `visible` prop.
let removeBackHandler: (() => void) | null = null

watch(
  () => props.visible,
  (visible) => {
    if (visible && !removeBackHandler) {
      removeBackHandler = registerBackHandler(() => {
        emit('not-now')
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
      class="fixed inset-0 z-[60] flex items-center-safe justify-center bg-black/40 backdrop-blur p-4"
    >
      <div class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
        <h3 class="text-lg font-bold text-ink">
          {{ t("milestone.notificationsOptInTitle") }}
        </h3>
        <p class="mt-1 text-sm leading-relaxed text-muted">
          {{ t("milestone.notificationsOptInBody") }}
        </p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
            @click="emit('not-now')"
          >
            {{ t("milestone.notNow") }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            @click="impact(ImpactStyle.Medium); emit('enable')"
          >
            {{ t("milestone.enableNotifications") }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
