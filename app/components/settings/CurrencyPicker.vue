<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { registerBackHandler } from '../../utils/back-handler'
import { getCurrencyList } from '../../utils/currencies'

const props = defineProps<{ visible: boolean, current: string }>()
const emit = defineEmits<{ select: [code: string], dismiss: [] }>()

const { t, locale } = useI18n()

const search = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (visible) search.value = ''
  },
)

// Hardware back (Android): dismiss the picker — same as tapping outside or
// Cancel. Always mounted, so registration follows the `visible` prop.
let removeBackHandler: (() => void) | null = null

watch(
  () => props.visible,
  (visible) => {
    if (visible && !removeBackHandler) {
      removeBackHandler = registerBackHandler(() => {
        emit('dismiss')
        return true
      })
    }
    else if (!visible && removeBackHandler) {
      removeBackHandler()
      removeBackHandler = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  removeBackHandler?.()
})

const options = computed(() => {
  const query = search.value.trim().toLowerCase()
  const list = getCurrencyList(locale.value)
  if (!query) return list
  return list.filter(
    option =>
      option.code.toLowerCase().includes(query)
      || option.symbol.toLowerCase().includes(query)
      || option.name.toLowerCase().includes(query),
  )
})
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
      class="fixed inset-0 z-[60] flex items-center-safe justify-center bg-black/40 backdrop-blur p-4 sm:items-center"
      @click.self="emit('dismiss')"
    >
      <div
        class="flex max-h-[75vh] w-full max-w-sm flex-col rounded-2xl bg-surface p-5 shadow-xl"
      >
        <h3 class="text-lg font-bold text-ink">
          {{ t("settings.currency") }}
        </h3>
        <input
          id="currency-search"
          v-model="search"
          type="search"
          :placeholder="t('settings.searchCurrency')"
          class="mt-3 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
        >
        <div class="mt-2 flex flex-1 flex-col overflow-y-auto">
          <button
            v-for="option in options"
            :key="option.code"
            type="button"
            class="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-card"
            :class="
              option.code === current
                ? 'bg-primary-soft text-on-primary-soft'
                : ''
            "
            @click="emit('select', option.code)"
          >
            <span>
              {{ option.symbol }} {{ option.code }}
              <span class="font-medium text-muted">· {{ option.name }}</span>
            </span>
            <span
              v-if="option.code === current"
              class="text-primary"
            >✓</span>
          </button>
          <p
            v-if="options.length === 0"
            class="px-3 py-4 text-center text-sm text-muted"
          >
            {{ t("settings.searchCurrency") }}
          </p>
        </div>
        <div class="mt-3 flex justify-end">
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
