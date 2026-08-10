<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../../utils/settings'

defineProps<{ visible: boolean; current: string }>()
const emit = defineEmits<{ select: [code: string]; dismiss: [] }>()

const { t } = useI18n()
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-50 flex items-center-safe justify-center bg-black/40 p-4 sm:items-center"
    @click.self="emit('dismiss')"
  >
    <div class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl">
      <h3 class="text-lg font-bold text-ink">{{ t('settings.language') }}</h3>
      <div class="mt-3 flex max-h-[55vh] flex-col overflow-y-auto">
        <button
          v-for="code in SUPPORTED_LANGUAGES"
          :key="code"
          type="button"
          class="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-card"
          :class="code === current ? 'bg-primary-soft text-on-primary-soft' : ''"
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
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>
