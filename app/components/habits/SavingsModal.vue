<script setup lang="ts">
import { ref, watch } from "vue";

import { CURRENCY_SYMBOLS } from "../../utils/currencies";
import { normalizeSavings } from "../../utils/domain";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    visible: boolean;
    value: string | null;
    currency: string;
    optional?: boolean;
  }>(),
  { optional: false },
);
const emit = defineEmits<{ save: [savings: string | null]; dismiss: [] }>();

const localValue = ref("");

watch(
  () => props.visible,
  (visible) => {
    if (visible) localValue.value = props.value ?? "";
  },
);

/** Digits + one decimal separator + max two decimals (ported from RN). */
const sanitize = (text: string): string =>
  text
    .replace(/[^0-9.]/g, "")
    .replace(/(\..*)\./g, "$1")
    .replace(/(\.\d{2})\d+/g, "$1");

const handleSave = (): void => {
  emit("save", normalizeSavings(localValue.value));
};

/** Skip keeps the previous value (wizard flow). */
const handleSkip = (): void => {
  emit("save", props.value);
};
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center-safe justify-center bg-black/40 p-4 sm:items-center"
    @click.self="emit('dismiss')"
  >
    <div class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
      <h3 class="text-lg font-bold text-ink">
        {{ optional ? t("savings.titleOptional") : t("savings.title") }}
      </h3>
      <p class="mt-1 text-sm text-muted">{{ t("savings.subtitle") }}</p>

      <div class="mt-4">
        <label
          for="savings-amount"
          class="mb-1 block text-xs font-semibold text-muted"
        >
          {{ t("savings.amount") }}
        </label>
        <div
          class="flex items-center rounded-xl border border-border bg-bg px-3 transition-colors focus-within:border-primary"
        >
          <span class="shrink-0 text-sm text-muted">
            {{ CURRENCY_SYMBOLS[currency] ?? currency }}{{ t("common.perDay") }}
          </span>
          <input
            id="savings-amount"
            type="text"
            inputmode="decimal"
            :placeholder="'0.00'"
            :value="localValue"
            class="w-full bg-transparent px-2 py-2.5 text-sm text-ink outline-none"
            @input="
              localValue = sanitize(($event.target as HTMLInputElement).value)
            "
          />
        </div>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button
          v-if="optional"
          type="button"
          class="rounded-lg px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
          @click="handleSkip"
        >
          {{ t("savings.skip") }}
        </button>
        <button
          type="button"
          :disabled="optional && !localValue"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          @click="handleSave"
        >
          {{ optional ? t("savings.save") : t("savings.confirm") }}
        </button>
      </div>
    </div>
  </div>
</template>
