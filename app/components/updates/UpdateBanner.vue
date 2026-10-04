<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Download, X } from 'lucide-vue-next'

import { useUpdateCheck } from '../../composables/useUpdateCheck'

// Shared state (module singleton) — the Settings page drives the same refs,
// so a manual check there surfaces the banner here too.
const { t } = useI18n()
const {
  state,
  error,
  latestVersion,
  bannerVisible,
  download,
  dismissBanner,
} = useUpdateCheck()

const version = computed(() => latestVersion.value ?? '')
const busy = computed(() => state.value === 'downloading')
const failed = computed(() => error.value === 'download')

const handleDownload = async (): Promise<void> => {
  await download()
}
</script>

<template>
  <Transition name="update-banner">
    <div
      v-if="bannerVisible"
      class="shrink-0 px-4 pt-3"
    >
      <div
        class="flex items-start gap-3 rounded-xl border border-primary-soft bg-primary-soft px-4 py-3"
      >
        <Download
          class="mt-0.5 h-4 w-4 shrink-0 text-on-primary-soft"
          :stroke-width="2.5"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-on-primary-soft">
            {{ t("updates.bannerTitle") }}
          </p>
          <p class="text-xs text-on-primary-soft/80">
            {{ t("updates.bannerBody", { version }) }}
          </p>
          <p
            v-if="failed"
            class="mt-1 text-xs font-semibold text-danger"
          >
            {{ t("updates.downloadFailed") }}
          </p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          :disabled="busy"
          @click="handleDownload"
        >
          {{ busy ? t("updates.downloading") : t("updates.download") }}
        </button>
        <button
          type="button"
          class="shrink-0 p-0.5 text-on-primary-soft"
          :aria-label="t('common.dismiss')"
          @click="dismissBanner"
        >
          <X
            class="h-4 w-4"
            :stroke-width="2.5"
          />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.update-banner-enter-active,
.update-banner-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.update-banner-enter-from,
.update-banner-leave-to {
  opacity: 0;
  transform: translateY(-0.5rem);
}
</style>
