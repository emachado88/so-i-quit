import { onUnmounted, ref, type Ref } from 'vue'

/**
 * Live clock — a `Date` ref that ticks every second. Single source of truth
 * for all "now" computations on the Progress screen (counters, rings,
 * totals). The interval is cleaned up automatically on unmount.
 */
export const useNow = (): Ref<Date> => {
  const now = ref(new Date())
  const interval = setInterval(() => {
    now.value = new Date()
  }, 1000)
  onUnmounted(() => clearInterval(interval))
  return now
}
