<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();

withDefaults(
  defineProps<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
  }>(),
  { destructive: false },
);
const emit = defineEmits<{ confirm: []; cancel: [] }>();
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center-safe justify-center bg-black/40 p-4 sm:items-center"
    @click.self="emit('cancel')"
  >
    <div class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
      <h3 class="text-lg font-bold text-ink">{{ title }}</h3>
      <p class="mt-1 text-sm leading-relaxed text-muted">{{ message }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
          @click="emit('cancel')"
        >
          {{ cancelLabel ?? t("common.cancel") }}
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          :class="destructive ? 'bg-danger' : 'bg-primary'"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
