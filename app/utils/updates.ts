/**
 * GitHub release check for the in-app update feature.
 *
 * This is the app's ONLY outbound request (it is otherwise local-only, no
 * backend — see AGENTS.md). The GitHub REST API is read unauthenticated
 * (60 req/h/IP), which is why the automatic check is throttled to once per
 * 24 h; `markChecked` runs only on a successful response, so an offline
 * boot does not swallow the next attempt.
 *
 * Everything here is transport-agnostic and node-testable: the fetch
 * implementation is injected, and the throttle goes through the same
 * localStorage layer as the rest of the app.
 */

import { readJSON, removeValue, writeJSON } from './storage'
import { isNewerVersion, normalizeVersion } from './version'

/** Public repo the sideloadable releases are published from. */
export const GITHUB_REPO = 'emachado88/so-i-quit'

/** Latest published (non-draft, non-prerelease) release. */
export const LATEST_RELEASE_API_URL
  = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

/** Human-facing release page — the web-only download fallback. */
export const RELEASES_PAGE_URL
  = `https://github.com/${GITHUB_REPO}/releases/latest`

/**
 * localStorage key holding `{ checkedAt: number }`. Deliberately NOT a field
 * of `settings-v1`: a check timestamp must never travel inside a backup.
 */
export const UPDATE_CHECK_KEY = 'update-check-v1'

/** Minimum interval between automatic (app-start) checks. */
export const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export interface GitHubAsset {
  name: string
  browser_download_url: string
}

export interface GitHubRelease {
  tag_name?: string
  html_url?: string
  draft?: boolean
  prerelease?: boolean
  assets?: GitHubAsset[]
}

export interface UpdateInfo {
  version: string
  /** Direct APK asset URL — null when the release carries no APK. */
  downloadUrl: string | null
  releaseUrl: string
}

export type UpdateCheckResult
  = | { status: 'up-to-date', currentVersion: string }
    | { status: 'available', currentVersion: string, update: UpdateInfo }
    | { status: 'error', currentVersion: string }

/**
 * The installable asset of a release — the signed `-release.apk` first, then
 * any `.apk`. Preview APKs and the simulator `.app.tar.gz` never qualify.
 */
export const pickApkAsset = (release: GitHubRelease): GitHubAsset | null => {
  const apks = (release.assets ?? []).filter(asset =>
    asset.name.toLowerCase().endsWith('.apk'),
  )
  const releaseBuild = apks.find(asset => /release\.apk$/i.test(asset.name))
  return releaseBuild ?? apks[0] ?? null
}

/** Compare a release payload against the installed version. */
export const parseRelease = (
  release: GitHubRelease,
  currentVersion: string,
): UpdateCheckResult => {
  const tag = release.tag_name ?? ''
  // `/releases/latest` already excludes these, but the payload is untrusted
  // input here — never offer a draft or a prerelease as an update.
  if (release.draft || release.prerelease || !tag) {
    return { status: 'up-to-date', currentVersion }
  }
  const version = normalizeVersion(tag)
  if (!isNewerVersion(version, currentVersion)) {
    return { status: 'up-to-date', currentVersion }
  }
  const asset = pickApkAsset(release)
  return {
    status: 'available',
    currentVersion,
    update: {
      version,
      downloadUrl: asset?.browser_download_url ?? null,
      releaseUrl: release.html_url ?? RELEASES_PAGE_URL,
    },
  }
}

/**
 * Fetch the latest release and compare it. Never throws — any transport or
 * payload problem resolves to `{ status: 'error' }`: the check is a
 * best-effort convenience, never a blocking failure.
 */
export const fetchLatestRelease = async (
  currentVersion: string,
  fetchImpl: typeof fetch = fetch,
): Promise<UpdateCheckResult> => {
  try {
    const response = await fetchImpl(LATEST_RELEASE_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!response.ok) return { status: 'error', currentVersion }
    const release = (await response.json()) as GitHubRelease
    return parseRelease(release, currentVersion)
  }
  catch {
    return { status: 'error', currentVersion }
  }
}

// ---------------------------------------------------------------------------
// Throttle
// ---------------------------------------------------------------------------

/** Epoch ms of the last successful check (0 when never checked). */
export const getLastCheckAt = (): number => {
  const stored = readJSON<{ checkedAt?: number }>(UPDATE_CHECK_KEY, {})
  return typeof stored.checkedAt === 'number' ? stored.checkedAt : 0
}

/** Record a successful check — call it only when the request succeeded. */
export const markChecked = (now: number = Date.now()): void => {
  writeJSON(UPDATE_CHECK_KEY, { checkedAt: now })
}

/** Whether the automatic (app-start) check is due. */
export const shouldCheck = (now: number = Date.now()): boolean =>
  now - getLastCheckAt() >= UPDATE_CHECK_INTERVAL_MS

/** Forget the last check (forced manual check + tests). */
export const resetUpdateCheck = (): void => removeValue(UPDATE_CHECK_KEY)
