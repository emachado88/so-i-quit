<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { Clock3, Coins, ListChecks, MoreHorizontal, Pen, Trash2 } from 'lucide-vue-next'

import { registerBackHandler } from '../../utils/back-handler'
import { opensUpward } from '../../utils/popover'

const { t } = useI18n()

defineProps<{ name: string, isCustom?: boolean }>()
const emit = defineEmits<{
  'edit-name': []
  'edit-date': []
  'edit-savings': []
  'manage-slips': []
  'delete': []
}>()

const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
/** Direction of the current opening: below the trigger, or flipped above. */
const opensUp = ref(false)

/**
 * Nearest scrollable ancestor — the box that clips the dropdown. The page
 * scroll area is `overflow-y: auto`, and an absolutely positioned menu
 * cannot escape it (nor contribute scrollable height), so a card near the
 * bottom edge would show a truncated, partly untappable menu.
 */
const findScrollArea = (el: HTMLElement | null): HTMLElement | null => {
  let node = el?.parentElement ?? null
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

/**
 * Toggle the menu. On open, measure once and pick the direction —
 * `offsetHeight` reads the final layout size (the entrance transform does
 * not affect it). Older browsers/happy-dom without a scroll ancestor fall
 * back to the viewport, which keeps the familiar downward placement.
 */
const toggleMenu = async (): Promise<void> => {
  if (open.value) {
    open.value = false
    return
  }
  open.value = true
  await nextTick()
  const triggerEl = trigger.value
  const menuEl = menu.value
  if (!triggerEl || !menuEl) return
  const rect = triggerEl.getBoundingClientRect()
  const area = findScrollArea(triggerEl)?.getBoundingClientRect()
  opensUp.value = opensUpward({
    triggerTop: rect.top,
    triggerBottom: rect.bottom,
    boundaryTop: area?.top ?? 0,
    boundaryBottom: area?.bottom ?? window.innerHeight,
    menuHeight: menuEl.offsetHeight,
  })
}

type MenuAction
  = | 'edit-name'
    | 'edit-date'
    | 'edit-savings'
    | 'manage-slips'
    | 'delete'

// `emit()` is typed as one overload per event, so calling it with the union
// variable would not match any overload — dispatch through literal calls.
const emitAction: Record<MenuAction, () => void> = {
  'edit-name': () => emit('edit-name'),
  'edit-date': () => emit('edit-date'),
  'edit-savings': () => emit('edit-savings'),
  'manage-slips': () => emit('manage-slips'),
  'delete': () => emit('delete'),
}

const action = (emitName: MenuAction): void => {
  open.value = false
  emitAction[emitName]()
}

// Hardware back (Android): close the menu — same as tapping outside.
// Always mounted (one per habit card), so registration follows `open`.
let removeBackHandler: (() => void) | null = null

watch(
  open,
  (isOpen) => {
    // Reset the direction so the next opening measures fresh.
    if (!isOpen) opensUp.value = false
    if (isOpen && !removeBackHandler) {
      removeBackHandler = registerBackHandler(() => {
        open.value = false
        return true
      })
    }
    else if (!isOpen && removeBackHandler) {
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
      ref="trigger"
      type="button"
      class="rounded-full p-1.5 text-muted transition hover:bg-card hover:text-ink"
      :aria-label="t('habits.openMenu', { name })"
      @click="toggleMenu"
    >
      <MoreHorizontal class="h-5 w-5" />
    </button>

    <!-- click-outside catcher -->
    <div
      v-if="open"
      class="fixed inset-0 z-60"
      @click="open = false"
    />

    <!-- Dropdown: subtle pop-in from the ⋮ button (fade + scale, origin
         top-right). Same zoom language as the modals, smaller amplitude. -->
    <Transition
      enter-active-class="transition duration-150 ease-out motion-reduce:transition-none"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in motion-reduce:transition-none"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        ref="menu"
        class="absolute right-0 z-60 w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        :class="
          opensUp
            ? 'bottom-full mb-1 origin-bottom-right'
            : 'top-full mt-1 origin-top-right'
        "
      >
        <button
          v-if="isCustom"
          type="button"
          class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-card"
          @click="action('edit-name')"
        >
          <Pen class="h-4 w-4 shrink-0 text-muted" />
          {{ t('habits.editName') }}
        </button>
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
          class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-card"
          @click="action('manage-slips')"
        >
          <ListChecks class="h-4 w-4 shrink-0 text-muted" />
          {{ t('habits.manageSlips') }}
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
    </Transition>
  </div>
</template>
