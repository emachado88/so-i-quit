import { ref, type Ref } from 'vue'

/**
 * App-lifetime state for the exact-alarm re-ask dialog.
 *
 * Module-level singleton on purpose: the import chain is async (OS
 * permission → reconcile → check) and the settings page can be re-created
 * mid-chain (tab switch, locale navigation, WebView reload). A per-instance
 * ref would lose a queued re-ask on remount — a shared ref keeps the
 * dialog bound to whatever page instance is alive, so the re-ask survives
 * and shows as soon as a Settings instance renders.
 */
const visible = ref(false)

export const useExactAlarmPrompt = (): { visible: Ref<boolean> } => ({
  visible,
})

/** Reset the singleton (used by component tests between mounts). */
export const resetExactAlarmPrompt = (): void => {
  visible.value = false
}
