import { computed, ref, type ComputedRef, type Ref } from 'vue'

import {
  downloadApk,
  installApk,
  isApkInstallSupported,
} from '../utils/update-install'
import {
  fetchLatestRelease,
  markChecked,
  RELEASES_PAGE_URL,
  shouldCheck,
} from '../utils/updates'

/**
 * Shared state for the in-app update check (app start + Settings).
 *
 * Module-level singleton on purpose, like `useExactAlarmPrompt`: the banner
 * lives in the shell layout while the manual check lives in the Settings
 * page, and a page re-creation (tab switch, locale navigation) must not
 * lose "update available". Both read the same refs.
 */

export type UpdateState
  = | 'idle'
    | 'checking'
    | 'up-to-date'
    | 'available'
    | 'downloading'
    | 'installed'
    | 'error'

/** Which step failed — the two failures read differently in the UI. */
export type UpdateErrorKind = 'check' | 'download' | null

export type CheckOutcome = 'up-to-date' | 'available' | 'error' | 'skipped'
export type DownloadOutcome = 'installed' | 'opened' | 'error'

export interface UseUpdateCheck {
  state: Ref<UpdateState>
  error: Ref<UpdateErrorKind>
  latestVersion: Ref<string | null>
  releaseUrl: Ref<string | null>
  bannerVisible: ComputedRef<boolean>
  check: (currentVersion: string, options?: { force?: boolean }) => Promise<CheckOutcome>
  download: () => Promise<DownloadOutcome>
  openReleasePage: () => void
  dismissBanner: () => void
  reset: () => void
}

const state = ref<UpdateState>('idle')
const error = ref<UpdateErrorKind>(null)
const latestVersion = ref<string | null>(null)
const downloadUrl = ref<string | null>(null)
const releaseUrl = ref<string | null>(null)
/** Dismissed for this session only — a new launch re-surfaces the banner. */
const dismissed = ref(false)

const bannerVisible = computed(
  () => state.value === 'available' && !dismissed.value,
)

/**
 * The automatic app-start check is skipped on the dev server and in the
 * Capacitor live-reload loop (`npm run mobile:live`) — the Settings button
 * always forces a real check, so the flow stays testable in the dev loop.
 */
const shouldSkipAuto = (): boolean => Boolean(import.meta.dev)

const openReleasePage = (): void => {
  const url = releaseUrl.value ?? RELEASES_PAGE_URL
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener')
  }
}

/**
 * Check for a newer release. Automatic (app-start) calls are throttled to
 * once per 24 h and skipped in dev; `force: true` (the Settings button)
 * always runs. Never throws — the outcome tells the caller what happened.
 */
const check = async (
  currentVersion: string,
  options: { force?: boolean } = {},
): Promise<CheckOutcome> => {
  if (!options.force) {
    if (shouldSkipAuto()) return 'skipped'
    if (!shouldCheck()) return 'skipped'
  }
  // A check already in flight (or a download) wins — don't interleave.
  if (state.value === 'checking' || state.value === 'downloading') {
    return 'skipped'
  }

  state.value = 'checking'
  error.value = null
  const result = await fetchLatestRelease(currentVersion)

  if (result.status === 'error') {
    state.value = 'error'
    error.value = 'check'
    return 'error'
  }

  // Only a real answer starts the 24 h window: an offline boot retries.
  markChecked()

  if (result.status === 'available') {
    latestVersion.value = result.update.version
    downloadUrl.value = result.update.downloadUrl
    releaseUrl.value = result.update.releaseUrl
    dismissed.value = false
    state.value = 'available'
    return 'available'
  }

  latestVersion.value = null
  downloadUrl.value = null
  state.value = 'up-to-date'
  return 'up-to-date'
}

/**
 * Download and install the available update. On Android the APK is fetched
 * and installed in-app; anywhere else (web dev loop, iOS) the release page
 * opens instead. A failure puts the banner back so the user can retry.
 */
const download = async (): Promise<DownloadOutcome> => {
  const target = downloadUrl.value
  if (!target || !isApkInstallSupported()) {
    openReleasePage()
    return 'opened'
  }

  state.value = 'downloading'
  error.value = null
  try {
    const path = await downloadApk(target, latestVersion.value ?? '')
    await installApk(path)
    state.value = 'installed'
    return 'installed'
  }
  catch {
    // Keep the update on offer — the banner stays for a retry.
    state.value = 'available'
    error.value = 'download'
    return 'error'
  }
}

const dismissBanner = (): void => {
  dismissed.value = true
}

/** Reset the singleton (component tests between mounts). */
const reset = (): void => {
  state.value = 'idle'
  error.value = null
  latestVersion.value = null
  downloadUrl.value = null
  releaseUrl.value = null
  dismissed.value = false
}

export const useUpdateCheck = (): UseUpdateCheck => ({
  state,
  error,
  latestVersion,
  releaseUrl,
  bannerVisible,
  check,
  download,
  openReleasePage,
  dismissBanner,
  reset,
})
