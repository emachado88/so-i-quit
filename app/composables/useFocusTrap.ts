import { nextTick, onUnmounted, watch, type Ref } from 'vue'

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Generic modal focus trap. While `visible` is true the dialog keeps focus
 * inside itself: Tab/Shift+Tab wrap at the first/last focusable boundary,
 * and a Tab while focus sits outside the dialog (backdrop click, restored
 * body focus) is pulled back in. Opening moves focus to the first focusable
 * (falls back to the dialog root); closing and unmounting restore the
 * element that had focus before the dialog opened.
 */
export const useFocusTrap = (
  visible: Ref<boolean>,
  dialogRef: Ref<HTMLElement | null>,
): void => {
  let previouslyFocused: HTMLElement | null = null
  let removeKeydown: (() => void) | null = null

  const getFocusable = (): HTMLElement[] => {
    const dialog = dialogRef.value
    if (!dialog) return []
    return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return
    const dialog = dialogRef.value
    if (!dialog) return
    const focusable = getFocusable()
    if (focusable.length === 0) return
    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!
    const active = document.activeElement
    // Focus outside the dialog (or on the overlay itself): pull it back in
    // instead of letting the browser tab into the page behind the overlay.
    if (!active || !dialog.contains(active)) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
      return
    }
    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
    }
    else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(visible, async (isVisible) => {
    if (isVisible) {
      previouslyFocused = document.activeElement as HTMLElement | null
      // The dialog root only exists after the v-if render — wait a tick.
      await nextTick()
      ;(getFocusable()[0] ?? dialogRef.value)?.focus()
      removeKeydown?.()
      document.addEventListener('keydown', onKeydown)
      removeKeydown = () => document.removeEventListener('keydown', onKeydown)
    }
    else {
      removeKeydown?.()
      removeKeydown = null
      previouslyFocused?.focus()
      previouslyFocused = null
    }
  })

  onUnmounted(() => {
    removeKeydown?.()
    removeKeydown = null
  })
}
