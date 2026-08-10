<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{ message: string | null }>()
const emit = defineEmits<{ dismiss: [] }>()
</script>

<template>
  <Transition name="snack">
    <div
      v-if="message"
      role="alert"
      class="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2 rounded-xl bg-danger px-4 py-3 text-sm font-medium text-white shadow-lg"
    >
      <div class="flex items-center justify-between gap-3">
        <p>{{ message }}</p>
        <button
          type="button"
          class="shrink-0 font-semibold underline underline-offset-2"
          @click="emit('dismiss')"
        >
          {{ t('common.dismiss') }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.snack-enter-active,
.snack-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.snack-enter-from,
.snack-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>
