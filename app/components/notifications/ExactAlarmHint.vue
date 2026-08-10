<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { openExactNotificationSettings } from '../../utils/notifications'

const { t } = useI18n()

const handleOpen = (): void => {
  void openExactNotificationSettings()
}
</script>

<template>
  <div class="border-t border-border px-4 pb-3.5 pt-3">
    <p class="text-xs leading-relaxed text-muted">
      {{ t('settings.exactAlarmHint') }}
    </p>
    <button
      type="button"
      class="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-card"
      @click="handleOpen"
    >
      {{ t('settings.exactAlarmAction') }}
    </button>
  </div>
</template>
