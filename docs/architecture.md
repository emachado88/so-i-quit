# Architecture & Decisions

Rationale and traps behind the app's core model. `AGENTS.md` is the short contract an
agent needs before touching code; this file is where the *why* lives. Cross-links point
back to the rules.

## Always mobile (the big one)

- `ssr: false` is fixed — no branches, no flags. The web build exists only for the dev loop.
- **localStorage, never cookies:** the Capacitor WebView resets cookies on restart; color-mode
  and i18n both persist to localStorage.
- `nitro: { preset: 'cloudflare_pages' }` emits `dist/` — that is what Capacitor uses as `webDir`.
- **The app makes exactly one outbound request:** the update check against the GitHub releases
  API (see `docs/features.md`). Everything else stays on-device — no accounts, no sync, no telemetry.

## Data layer

- localStorage only (WebView drops cookies) via `app/utils/storage.ts`.
- Keys: `"habits"`, `"milestones-v1"`, `"slips-v1"`, `"settings-v1"`.
- Error semantics: JSON-level problems (missing key, corrupt JSON, stored null) → absorbed,
  fall back to default; real storage errors (quota, privacy) → propagate, no silent throws.
  **Exception:** `habits.ts getHabits()` throws on corrupt JSON by design — screens catch and
  show the Snackbar.
- IDs: `` `${Date.now()}-${Math.random().toString(36).substring(2, 11)}` ``.
- `Habit { id, key?, name, date, savings }` — `key` is the i18n key for standard habits
  (`habits.alcohol`), custom habits use `name`.
- `Slip { id, habitId, date }` — a one-time lapse, stored per habit in `slips-v1` (`slips-store.ts`).
  Date-only (local midnight ISO); it never touches the streak, milestones or savings.
- Settings stored as **one object** under `settings-v1` (the old RN app spread them across five
  keys — do not reintroduce).

## State & effects

- `useNow()` composable for live counters (1s `setInterval`, cleanup in `onUnmounted`) —
  re-render only, no storage I/O on ticks.
- Data loads in `onMounted` (pages) — no polling; app-foreground tracking via
  `addAppForegroundListener` (native `appStateChange`), with `visibilitychange` as browser-dev fallback.

## i18n

Locale JSONs in `app/i18n/locales/{en,pt,fr,es,it,zh,de,nl}.json`; **en.json is the base** and all
8 carry the same key set (152 keys each). Flat dot-separated keys, never nested objects. Access via
`const { t, locale } = useI18n()` in script setup, `$t` in templates — never import locale files in
components. New locale = new JSON + entry in `nuxt.config.ts` `i18n.locales` (+ `SUPPORTED_LANGUAGES` /
`LANGUAGE_NAMES` in `app/utils/settings.ts` if it should appear in the picker).

### Locale persistence (i18n-persist plugin)

- With `prefix_except_default` the active locale lives in the **URL**, and the WebView always boots at
  the root URL → without the plugin, language resets every launch.
- `app/plugins/i18n-persist.client.ts` mirrors locale to `settings-v1` and, on boot at `/`, redirects to
  the saved locale's prefix (`replace`, so the boot URL doesn't linger in history and the first
  hardware-back press exits instead of bouncing to `/`). The async plugin defers mount until the
  redirect lands — no flash of the default locale.
- `detectBrowserLanguage: false` in `nuxt.config` — the module's cookie-based detection is useless
  in the WebView.

### Interpolation gotcha

- `{name}` not `{{name}}` — vue-i18n rejects mustache as a nested placeholder (error code 9).
  The smoke test guards every locale file.

## Notifications (Capacitor)

Every call is guarded by `Capacitor.isNativePlatform()` — browser/web builds are silent no-ops.

- Permission read uses `areEnabled()` (the real OS switch), **not** `checkPermissions()` alone
  (it stays "granted" when the user turns all notifications off in system settings).
- Deterministic int32 notification ids (djb2 hash of the milestone id) — reconcile works without a
  stored id map.
- **iOS caps pending local notifications at 64 per app** — `reconcileAllHabitNotifications` splits a
  60-notification budget (`IOS_PENDING_BUDGET`) across dated habits
  (`reconcileHabitNotifications(..., maxPending)`); only the earliest milestones are scheduled and
  later boots/foregrounds fill the rest as earlier ones are reached. Android has no limit.
- Exact alarms: `SCHEDULE_EXACT_ALARM` in the manifest; Android 12+ special access checked via
  `checkExactNotificationSetting()`; if denied → hint component + inexact fallback.
- The exact-alarm prompt chains right after the milestone opt-in "Enable" (permission granted AND
  exact denied → `ExactAlarmDialog` with Skip / Go to settings — never when the OS permission was
  refused). "Go to settings" opens the OS screen; the dialog stays open and the foreground listener
  re-checks on return — granted → dismiss + cancel/reconcile all schedules (Android keeps
  already-scheduled alarms inexact, so they are rebuilt as exact). Skip never re-prompts; the
  Settings hint remains as fallback.
- OS permission revoked → cancel pending; restored → reconcile (same semantics as the old RN app).
- App foreground is tracked via `App.addListener('appStateChange')` — DOM `visibilitychange` alone is
  unreliable in the WebView (the DOM visibility doesn't change when the app backgrounds).
- Tap on a notification routes to Progress, including cold starts (the plugin retains the launch
  intent action until the JS listener registers).
