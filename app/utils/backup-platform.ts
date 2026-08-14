/**
 * Platform bridge for backup export (native vs web).
 *
 * The settings page keeps its platform logic here so the component tests
 * can mock the whole module (like they do for notifications) — the real
 * Capacitor plugins are only ever touched on native builds.
 *
 * IMPORT: both platforms use a hidden <input type="file"> — in the Capacitor
 * WebView that input opens the native system picker automatically, so no
 * plugin API is needed (Filesystem has no pickFiles in v8).
 */

import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/** Timestamped backup filename: `so-i-quit-backup-YYYYMMDDHHMMSS.json`. */
export const backupFilename = (now: Date = new Date()): string => {
  const pad = (n: number): string => String(n).padStart(2, '0')
  const stamp
    = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
      + `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `so-i-quit-backup-${stamp}.json`
}

export const isNativeBackupPlatform = (): boolean =>
  Capacitor.isNativePlatform()

/**
 * Write the backup to the cache dir and open the native share sheet.
 * The share sheet title carries the timestamped filename; the dialog title
 * is localized by the caller (`dialogTitle`).
 */
export const exportBackupNative = async (
  json: string,
  dialogTitle: string,
): Promise<void> => {
  const filename = backupFilename()
  const result = await Filesystem.writeFile({
    path: filename,
    data: json,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  await Share.share({
    url: result.uri,
    title: filename,
    dialogTitle,
  })
}
