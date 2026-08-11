<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { Theme } from '../../utils/types'

defineProps<{ value: Theme }>()
const emit = defineEmits<{ change: [theme: Theme] }>()

const { t } = useI18n()

const options: { value: Theme, label: string }[] = [
  { value: 'system', label: 'settings.system' },
  { value: 'light', label: 'settings.light' },
  { value: 'dark', label: 'settings.dark' },
]
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="t('settings.appearance')"
    class="flex gap-0.5 rounded-[10px] bg-card p-0.5"
  >
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="value === option.value"
      class="flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
      :class="
        value === option.value
          ? 'bg-surface text-primary shadow-sm'
          : 'text-muted hover:text-ink'
      "
      @click="emit('change', option.value)"
    >
      {{ t(option.label) }}
    </button>
  </div>
</template>
