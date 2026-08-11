<script setup lang="ts">
import { onUnmounted, watch } from "vue";
import { useI18n } from "vue-i18n";

import { registerBackHandler } from "../../utils/back-handler";
import {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "../../utils/settings";

const props = defineProps<{ visible: boolean; current: string }>();
const emit = defineEmits<{ select: [code: SupportedLanguage]; dismiss: [] }>();

const { t } = useI18n();

// Hardware back (Android): dismiss the picker — same as tapping outside or
// Cancel. Always mounted, so registration follows the `visible` prop.
let removeBackHandler: (() => void) | null = null;

watch(
  () => props.visible,
  (visible) => {
    if (visible && !removeBackHandler) {
      removeBackHandler = registerBackHandler(() => {
        emit("dismiss");
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
      @click.self="emit('dismiss')"
    >
    <div class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
      <h3 class="text-lg font-bold text-ink">{{ t("settings.language") }}</h3>
      <div class="mt-3 flex max-h-[55vh] flex-col overflow-y-auto">
        <button
          v-for="code in SUPPORTED_LANGUAGES"
          :key="code"
          type="button"
          class="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-card"
          :class="
            code === current ? 'bg-primary-soft text-on-primary-soft' : ''
          "
          @click="emit('select', code)"
        >
          {{ LANGUAGE_NAMES[code as SupportedLanguage] }}
          <span v-if="code === current" class="text-primary">✓</span>
        </button>
      </div>
      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
          @click="emit('dismiss')"
        >
          {{ t("common.cancel") }}
        </button>
      </div>
    </div>
    </div>
  </Transition>
</template>
