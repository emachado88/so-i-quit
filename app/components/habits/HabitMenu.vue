<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { Clock3, Coins, MoreHorizontal, Trash2 } from 'lucide-vue-next'

import { registerBackHandler } from '../../utils/back-handler'

const { t } = useI18n()

defineProps<{ name: string }>()
const emit = defineEmits<{
  'edit-date': []
  'edit-savings': []
  delete: []
}>()

const open = ref(false)

const action = (emitName: 'edit-date' | 'edit-savings' | 'delete'): void => {
  open.value = false
  emit(emitName)
}

// Hardware back (Android): close the menu — same as tapping outside.
// Always mounted (one per habit card), so registration follows `open`.
let removeBackHandler: (() => void) | null = null

watch(
  open,
  (isOpen) => {
    if (isOpen && !removeBackHandler) {
      removeBackHandler = registerBackHandler(() => {
        open.value = false
        return true
      })
    } else if (!isOpen && removeBackHandler) {
      removeBackHandler()
      removeBackHandler = null
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  removeBackHandler?.()
})
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="rounded-full p-1.5 text-muted transition-colors hover:bg-card hover:text-ink"
      :aria-label="t('habits.openMenu', { name })"
      @click="open = !open"
    >
      <MoreHorizontal class="h-5 w-5" />
    </button>

    <!-- click-outside catcher -->
    <div v-if="open" class="fixed inset-0 z-40" @click="open = false" />

    <div
      v-if="open"
      class="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
    >
      <button
        type="button"
        class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-card"
        @click="action('edit-date')"
      >
        <Clock3 class="h-4 w-4 shrink-0 text-muted" />
        {{ t('habits.editDate') }}
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-card"
        @click="action('edit-savings')"
      >
        <Coins class="h-4 w-4 shrink-0 text-muted" />
        {{ t('habits.editSavings') }}
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger transition-colors hover:bg-danger/10"
        @click="action('delete')"
      >
        <Trash2 class="h-4 w-4 shrink-0" />
        {{ t('habits.delete') }}
      </button>
    </div>
  </div>
</template>
