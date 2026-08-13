<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ message: string | null }>()
const emit = defineEmits<{ dismiss: [] }>()

const { t } = useI18n()

const AUTO_DISMISS_MS = 5000
let timer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.message,
  (message) => {
    clearTimeout(timer)
    if (!message) return
    timer = setTimeout(() => emit('dismiss'), AUTO_DISMISS_MS)
  },
  { immediate: true },
)

onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <Transition name="toast">
    <div
      v-if="message"
      role="status"
      class="fixed top-[calc(env(safe-area-inset-top,0px)+0.75rem)] left-1/2 z-50 flex w-[calc(100%-2.25rem)] max-w-[400px] -translate-x-1/2 items-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-depth px-4 py-3.5 text-white shadow-lg"
    >
      <span class="text-2xl">🎉</span>
      <p class="min-w-0 flex-1 text-[13px] font-bold leading-snug">
        {{ message }}
      </p>
      <button
        type="button"
        :aria-label="t('common.dismiss')"
        class="shrink-0 text-white/80 transition-opacity hover:opacity-100"
        @click="emit('dismiss')"
      >
        ✕
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>
