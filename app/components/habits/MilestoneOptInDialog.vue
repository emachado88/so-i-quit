<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ enable: []; "not-now": [] }>();
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center-safe justify-center bg-black/40 p-4"
    @click.self="emit('not-now')"
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
          @click="emit('enable')"
        >
          {{ t("milestone.enableNotifications") }}
        </button>
      </div>
    </div>
  </div>
</template>
