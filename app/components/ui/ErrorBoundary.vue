<script setup lang="ts">
import { captureException, getClient } from '@sentry/vue'
import { useI18n } from 'vue-i18n'

/**
 * Render-error boundary: when a child (page) throws during render, show a
 * branded fallback instead of a blank screen and report the error to Sentry
 * (only when a DSN is configured — see plugins/sentry.client.ts). Returning
 * `false` from errorCaptured stops the error from bubbling to Vue's global
 * handler, so the error is reported exactly once, here.
 */
const { t } = useI18n()

const hasError = ref(false)
const errorDetail = ref('')

onErrorCaptured((err, _instance, info) => {
  hasError.value = true
  errorDetail.value = err instanceof Error ? err.message : String(err)
  if (getClient()) {
    captureException(err, { tags: { vueErrorInfo: info } })
  }
  // Swallow: the boundary owns rendering the fallback; returning false stops
  // the error from bubbling to Vue's global error handler (and double-reporting).
  return false
})

const reload = (): void => {
  window.location.reload()
}
</script>

<template>
  <slot v-if="!hasError" />
  <div
    v-else
    class="flex flex-col items-center gap-3 px-6 py-20 text-center"
  >
    <div
      class="flex h-18 w-18 items-center justify-center rounded-full bg-danger/10 text-3xl"
      aria-hidden="true"
    >
      ⚠️
    </div>
    <h1 class="text-xl font-black tracking-tight text-ink">
      {{ t("error.title") }}
    </h1>
    <p class="max-w-65 text-[13.5px] leading-relaxed text-muted">
      {{ t("error.body") }}
    </p>
    <p
      v-if="errorDetail"
      class="max-w-65 truncate text-[11px] text-muted/70"
      data-testid="error-detail"
    >
      {{ errorDetail }}
    </p>
    <button
      type="button"
      class="mt-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      @click="reload"
    >
      {{ t("error.reload") }}
    </button>
  </div>
</template>
