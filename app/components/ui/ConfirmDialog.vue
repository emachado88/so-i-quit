<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { registerBackHandler } from "../../utils/back-handler";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
  }>(),
  { destructive: false },
);
const emit = defineEmits<{ confirm: []; cancel: [] }>();

// Hardware back (Android): dismiss the dialog — the same as tapping
// outside or Cancel. Always mounted, so registration follows the
// `visible` prop.
let removeBackHandler: (() => void) | null = null;

watch(
  () => props.visible,
  (visible) => {
    if (visible && !removeBackHandler) {
      removeBackHandler = registerBackHandler(() => {
        emit("cancel");
        return true;
      });
    } else if (!visible && removeBackHandler) {
      removeBackHandler();
      removeBackHandler = null;
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  removeBackHandler?.();
});
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
  </Transition>
</template>
