# Features

Behaviour and edge cases for the app's user-facing features. Rules live in `AGENTS.md`; the traps
against them are here.

## Milestone tracking & slips

- **Slips are cleared by streak resets, never the reverse:** the reset (relapse) flow drops every
  slip for the habit, editing the quit date drops slips dated before the new date (`clearPastSlips`),
  and deleting a habit drops them with the milestones. A slip is a passive log — it never restarts
  the streak or re-schedules milestones. `HabitCard` shows `I slipped` (→ `SlipLogModal`, date-only)
  beside `Log relapse`; `HabitMenu` → `Manage slips` (→ `SlipsModal`, edit/delete with a confirm);
  the Progress card's red `<count> ⓘ` opens the same modal read-only.

## Wizard persistence

- **The wizard persists only on finish:** the new-habit wizard holds `key`/`name` in the wizard state
  and calls `addHabit` in `handleWizardFinish` — a cancelled, tab-switched, or app-killed wizard never
  leaves a dateless habit in localStorage. Reset/edit update the existing habit on finish only;
  Cancel is a pure close.

## Renaming (custom habits only)

- A standard habit's label comes from its `key` (`habits.alcohol` via `getHabitName`), so renaming it
  would be overwritten on the next render. `HabitCard` passes
  `:is-custom="!habit.key && Boolean(habit.name)"` to `HabitMenu`, which renders the "Edit name" entry
  only then.
- `NameModal` (i18n namespace `name.*`) mirrors `SavingsModal`: always-mounted + `visible` prop,
  `handle-back`, Confirm disabled until the text actually changes, save trims and refuses an empty
  name (light haptic), and the page persists it with `updateHabit(id, { name })` — `key` is never
  written, so a renamed custom habit stays keyless. A failed write surfaces
  `name.failedToUpdateName` in the Snackbar (same corrupt-JSON path as `getHabits`).

## Backup / export-import (Settings → Data)

- Export serializes `habits` + `milestones-v1` + `slips-v1` + `settings-v1` into one **versioned**
  JSON (`BACKUP_VERSION` = 2 in `app/utils/backup.ts`; v1 files still import, their missing `slips`
  defaulting to empty): native = `Filesystem.writeFile` to Cache + Share sheet; web = Blob download.
  Filename is timestamped (`so-i-quit-backup-YYYYMMDDHHMMSS.siqb`, `backupFilename()`); the share
  dialog title is localized (`settings.exportShareDialog`).
- Import is a hidden `<input type="file">` — the WebView opens the native system picker automatically,
  no plugin API needed (Filesystem has no `pickFiles` in v8); `parseBackup` never throws — any
  shape/version problem → `{ ok: false, error }` and nothing is written until the ConfirmDialog
  confirm.
- **After import:** pending notifications from the old dataset are cancelled; the imported
  notification settings are **re-validated against the OS** — permission not granted (fresh install
  `undetermined` or revoked) → re-ask, and **schedules are rebuilt only after the permission is
  confirmed** (no dead schedules); enabling notifications via the Settings toggle also reconciles
  immediately, not on the next Progress boot. Android 12+ exact-alarm access denied → `ExactAlarmDialog`
  re-asks (same pattern as the habit opt-in: plain `exactAlarmVisible` ref; Go-to-settings re-checks on
  foreground, Skip leaves the inexact schedules). The re-ask state lives in a module-level singleton
  (`useExactAlarmPrompt`) so a mid-chain page re-creation (tab switch / `setLocale` navigation) cannot
  lose it; a `sessionStorage` flag (`pending-exact-reask`) re-surfaces it after a WebView reload. The
  enable/disable/rebuild chains and the re-ask state are shared via the `useMilestoneNotifications`
  composable — the three pages (habits, settings, progress) hold only their own UI state (snackbars,
  haptics, denied flags, OS-permission sync refs). Imported `settings.theme` is applied to color-mode
  (`themeMode.setTheme`) and `settings.language` to the URL locale — the selector alone reads the
  settings ref, the live theme/locale need the explicit sync.

## In-app updates (GitHub releases)

- **One outbound request:** `app/utils/updates.ts` reads
  `api.github.com/repos/emachado88/so-i-quit/releases/latest` (unauthenticated — 60 req/h/IP, hence
  the throttle). It is the app's only network call.
- **Throttle:** automatic (app-start) checks run at most once per 24 h, tracked in its own
  localStorage key `"update-check-v1"` (`{checkedAt}`) — deliberately **not** a field of `settings-v1`,
  so a check timestamp never travels inside a backup. **Only a successful response writes the
  timestamp**: an offline boot must not swallow the next 24 h of attempts. The Settings button calls
  `check(version, { force: true })`, which always runs a fresh check.
- **Dev skip:** `import.meta.dev` short-circuits the *automatic* check (dev server + `mobile:live`);
  the forced manual check still runs, so the flow stays exercisable in the dev loop.
- **Banner, not a system notification — on purpose:** an OS local notification would need
  `POST_NOTIFICATIONS`, which is only requested for milestone notifications, so a user who never
  enabled those could never be told about an update. The banner is the first item of the shell column
  (in-flow, **not** fixed): no z-index at all, so it can never tie with or cover the TabBar/snackbar
  scale.
- **Version compare is dependency-free** (`app/utils/version.ts`, no `semver`): releases are tagged
  `vX.Y.Z` while package.json holds `X.Y.Z`, so `normalizeVersion` bridges them; a prerelease ranks
  below its release; drafts/prereleases are never offered as updates.
- **Download + install are native** (`ApkInstallerPlugin`, registered in `MainActivity.onCreate` like
  `SystemBarsPlugin`): the APK is streamed from a background thread into `getContext().getCacheDir()`
  and the installer is fired through `FileProvider` (`${applicationId}.fileprovider`, already
  declared; the `cache-path` entry in `res/xml/file_paths.xml` covers the file). Doing it natively
  keeps a ~20 MB binary out of the bridge (no base64 round-trip) and avoids CORS — GitHub redirects
  release assets to a host that sends no `Access-Control-Allow-Origin`. JS only wraps it
  (`app/utils/update-install.ts`).
- **`REQUEST_INSTALL_PACKAGES`** is in the manifest — Android 8+ prompts "allow installs from this
  source" the first time.
- **Android only:** iOS is out of scope (no sideloading — the App Store owns updates). Wherever
  `isApkInstallSupported()` is false (web dev loop, iOS) the Download action opens the release page
  instead.
- **Release assets:** the installable one is `so-i-quit-<version>-release.apk`; `pickApkAsset`
  prefers it over `-preview.apk` and ignores the simulator `.app.tar.gz`.
- **Failures never block:** offline / rate-limited / API error → `{ status: 'error' }` — the Settings
  section says so, the app-start check is silent. A failed download returns the state to `available`,
  so the banner stays on offer for a retry.
