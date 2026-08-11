/**
 * Haptic feedback over @capacitor/haptics.
 *
 * Browser/web builds are silent no-ops — the Capacitor platform guard
 * short-circuits every call before the plugin is touched (same pattern as
 * notifications.ts). The plugin's web implementation degrades to
 * `navigator.vibrate` where available, which we deliberately skip: the web
 * build exists only for the dev loop.
 *
 * Feedback map (mirrors the RN app's expo-haptics usage):
 *  - tabs: light impact on press
 *  - primary confirmations (wizard, savings, opt-in, delete...): medium
 *  - milestone celebrations: success notification feedback
 */

import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export { ImpactStyle, NotificationType }

const isNative = (): boolean => Capacitor.isNativePlatform()

/** Impact feedback — Light for taps, Medium for confirmations. */
export const impact = (style: ImpactStyle = ImpactStyle.Light): void => {
  if (!isNative()) return
  try {
    void Haptics.impact({ style }).catch(() => {})
  }
  catch {
    // Plugin unavailable — feedback is best-effort.
  }
}

/** Notification feedback — Success for milestones, Error for failures. */
export const notify = (type: NotificationType = NotificationType.Success): void => {
  if (!isNative()) return
  try {
    void Haptics.notification({ type }).catch(() => {})
  }
  catch {
    // Best effort.
  }
}

/** Continuous vibration for `duration` ms. */
export const vibrate = (duration = 300): void => {
  if (!isNative()) return
  try {
    void Haptics.vibrate({ duration }).catch(() => {})
  }
  catch {
    // Best effort.
  }
}
