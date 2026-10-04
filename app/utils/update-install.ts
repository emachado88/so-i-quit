/**
 * JS wrapper over the app-local `ApkInstaller` plugin (Android only).
 *
 * The APK is downloaded natively (background thread, streamed into the app
 * cache) and the install intent is fired by the plugin through a
 * FileProvider content:// URI — the two things JS cannot do on its own.
 * Doing the download natively also keeps a ~20 MB binary out of the
 * WebView (no base64 round-trip) and sidesteps CORS on the GitHub asset
 * host, which does not send CORS headers.
 *
 * Every entry point is guarded by the platform check: in the web dev loop
 * and on iOS these are no-ops and the caller falls back to the release
 * page (see `useUpdateCheck`).
 */

import { Capacitor, registerPlugin } from '@capacitor/core'

export interface ApkInstallerPlugin {
  /** Stream an APK into the app cache; resolves with its absolute path. */
  download(options: { url: string, filename: string }): Promise<{ path: string }>
  /** Fire the Android package-installer intent for a cached APK. */
  install(options: { path: string }): Promise<void>
}

let instance: ApkInstallerPlugin | null = null

const plugin = (): ApkInstallerPlugin => {
  if (!instance) {
    instance = registerPlugin<ApkInstallerPlugin>('ApkInstaller')
  }
  return instance
}

/** Whether the in-app download + install flow is available here. */
export const isApkInstallSupported = (): boolean =>
  Capacitor.isNativePlatform()
  && Capacitor.getPlatform() === 'android'
  && Capacitor.isPluginAvailable('ApkInstaller')

/** APK file name in the app cache (versioned, so a stale file is obvious). */
export const apkFilename = (version: string): string =>
  `so-i-quit-${version || 'update'}.apk`

/** Download the release APK into the app cache; resolves with its path. */
export const downloadApk = async (
  url: string,
  version: string,
): Promise<string> => {
  const result = await plugin().download({
    url,
    filename: apkFilename(version),
  })
  return result.path
}

/** Hand a downloaded APK to the Android package installer. */
export const installApk = async (path: string): Promise<void> => {
  await plugin().install({ path })
}
