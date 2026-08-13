/**
 * System bar (status + navigation) theme sync for the always-mobile build.
 *
 * Android: the OS derives the nav-bar icon appearance and paints a contrast
 * scrim behind the gesture pill / 3-button keys from its own uiMode, never
 * from the WebView. An in-app dark theme over a light-mode OS keeps light
 * bars — and on Xiaomi/HyperOS the scrim is a fixed light band that ignores
 * everything (see SystemBarsPlugin). This wrapper pushes the resolved
 * color-mode to the native side (SystemBarsPlugin, registered in
 * MainActivity).
 *
 * iOS: there is no nav-bar scrim or band — the home indicator auto-contrasts
 * and the app content shows through behind it. The only lever is the status
 * bar TEXT style, which does NOT follow the in-app theme by itself; a dark
 * page with the default dark status text is unreadable. iOS uses
 * @capacitor/status-bar (its setStyle is exactly the iOS knob; on Android
 * 15+ that plugin is dead for the nav bar, which is why Android has the
 * app-local SystemBarsPlugin instead).
 *
 * Browser/web builds are silent no-ops (platform guard). Same guard pattern
 * as haptics.ts / notifications.ts.
 */

import { Capacitor, registerPlugin } from '@capacitor/core'
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar'

interface SystemBars {
  setTheme: (options: { dark: boolean }) => Promise<void>
}

const SystemBars = registerPlugin<SystemBars>('SystemBars')

/**
 * Tells the native side the resolved theme:
 * - Android: `dark: true` -> light icons on both bars + contrast scrim off
 *   (SystemBarsPlugin.setTheme), `dark: false` -> dark icons.
 * - iOS: status bar text flips to light (`Style.Dark`) for dark themes and
 *   dark (`Style.Light`) for light themes.
 * Best-effort — an unavailable plugin keeps the OS default.
 */
export const applySystemBarTheme = async (dark: boolean): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return

  if (Capacitor.getPlatform() === 'ios') {
    try {
      await StatusBar.setStyle({
        style: dark ? StatusBarStyle.Dark : StatusBarStyle.Light,
      })
    }
    catch {
      // Best effort — the bar keeps the OS default.
    }
    return
  }

  if (!Capacitor.isPluginAvailable('SystemBars')) return
  try {
    await SystemBars.setTheme({ dark })
  }
  catch {
    // Best effort — the bars keep the OS default.
  }
}
