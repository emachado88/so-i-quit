/**
 * Android hardware back button handling.
 *
 * The Capacitor WebView does NOT drive history navigation from the back
 * button: without a `backButton` listener the OS default applies and the
 * app is sent to the background even when the router can go back. A single
 * root listener (app.vue) resolves every press as:
 *   1. top-most registered overlay handler — modals close themselves, the
 *      wizard steps back (LIFO, mirroring RN's BackHandler);
 *   2. router history, when the WebView can go back;
 *   3. exit the app.
 * Browser/web builds are silent no-ops (the browser owns its own back).
 */

import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

type BackHandler = () => boolean

const handlers: BackHandler[] = []

/**
 * Register a handler for hardware-back presses; the most recently
 * registered handler is consulted first. A handler returns true when it
 * consumed the press (closed a modal, stepped back in the wizard).
 * Returns an unregister function.
 */
export const registerBackHandler = (handler: BackHandler): (() => void) => {
  handlers.push(handler)
  return () => {
    const index = handlers.indexOf(handler)
    if (index >= 0) handlers.splice(index, 1)
  }
}

/** Give the top-most handler first chance; false when nobody consumed it. */
export const handleBackButton = (): boolean => {
  for (let i = handlers.length - 1; i >= 0; i -= 1) {
    const handler = handlers[i]
    if (handler && handler()) return true
  }
  return false
}

export interface BackSubscription {
  remove: () => void
}

/**
 * Root native listener for the hardware back button. Receives the WebView's
 * `canGoBack` so the caller can fall back to history navigation. Browser:
 * no-op subscription.
 */
export const addBackButtonListener = (
  onBack: (canGoBack: boolean) => void,
): BackSubscription => {
  if (!Capacitor.isNativePlatform()) return { remove: () => {} }

  let handle: { remove: () => Promise<void> } | null = null
  void App.addListener('backButton', ({ canGoBack }) => {
    onBack(canGoBack)
  }).then((listenerHandle) => {
    handle = listenerHandle
  })

  return {
    remove: () => {
      void handle?.remove()
    },
  }
}

/** Close the app (root back press with no history left). Browser: no-op. */
export const exitApp = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await App.exitApp()
  }
  catch {
    // Already finishing or unavailable — nothing to do.
  }
}
