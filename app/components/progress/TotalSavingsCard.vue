<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { formatAmount, formatDate } from '../../utils/domain'

const props = defineProps<{
  total: number
  sinceDate: string | null
  currency: string
}>()

const { t, locale } = useI18n()

/**
 * Money counter (ported from the RN CounterText): eases from the previous
 * display value to the new total (cubic ease-out, 300–1500 ms). Falls back
 * to a direct set when requestAnimationFrame is unavailable.
 */
const display = ref(0)
let raf = 0

watch(
  () => props.total,
  (to) => {
    if (typeof requestAnimationFrame !== 'function') {
      display.value = to
      return
    }
    cancelAnimationFrame(raf)
    const from = display.value
    if (from === to) return
    const duration = Math.min(1500, Math.max(300, Math.abs(to - from) * 15))
    const start = performance.now()
    const tick = (tickTime: number): void => {
      const progress = Math.min((tickTime - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      display.value = from + (to - from) * eased
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  },
  { immediate: true },
)

onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <section class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-depth via-primary to-primary-hover p-5 text-white shadow-md">
    <div class="pointer-events-none absolute -right-8 -top-8 h-[130px] w-[130px] rounded-full bg-white/10" />
    <div class="flex items-center gap-4">
      <div class="min-w-0">
        <p class="text-[11px] font-extrabold uppercase tracking-[0.14em] opacity-85">
          {{ t('progress.totalSavings') }}
        </p>
        <p class="mt-0.5 text-3xl font-black tracking-tight tabular-nums">
          {{ formatAmount(display, currency) }}
        </p>
      </div>
      <p v-if="sinceDate" class="ml-auto text-right text-[11px] font-bold leading-snug opacity-90">
        {{ t('progress.since', { date: formatDate(sinceDate, locale) }) }}
      </p>
    </div>
  </section>
</template>
