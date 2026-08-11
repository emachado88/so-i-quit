# AGENTS.md

## Project Overview

A habit tracker that counts time since quitting and calculates accumulated savings. Local-only, no backend. **This branch (`rewrite-nuxt-cap`) is a full rewrite from React Native/Expo to Nuxt 4 SPA + Capacitor (Android)** — the RN app still lives on `master` until the rewrite lands. Visual contract: `docs/ui-sketch.html`. Work is executed ticket-by-ticket from `.hermes/plans/2026-08-10_114400-rewrite-nuxt-cap.md` (Tickets 1–11 done; 12–13 pending).

**Always mobile** (user decision — no `MOBILE_BUILD` flag): `ssr: false`, everything persisted in localStorage (the WebView drops cookies), domain logic as pure TS modules tested with Vitest. The web build exists only for the dev loop.

## Tech Stack

- **Nuxt 4.5** (`ssr: false`, `compatibilityDate 2026-08-10`) + **Vue 3.5** + **TypeScript 5.9** strict
- **Tailwind CSS v4** via `@tailwindcss/vite` — design tokens live in `app/assets/css/main.css` `@theme` (no `tailwind.config`)
- **@nuxtjs/i18n 10** — 8 locales, `prefix_except_default`, flat JSON keys, `{name}` interpolation
- **@nuxtjs/color-mode 4** — system/light/dark, persisted in localStorage
- **@nuxt/fonts** — Inter 400–900 from Google
- **lucide-vue-next** — icons
- **dayjs** — calendar math for milestone targets
- **Capacitor 8** — `@capacitor/core|cli|android|app|local-notifications`; `android/` is committed; `dist/` (cloudflare_pages preset output) is the webDir
- **Vitest 4 + @vue/test-utils + happy-dom** — unit tests in node env, component tests in happy-dom
- **@nuxt/test-utils**, **unplugin-auto-import** (Vue auto-imports in tests)
- **Not yet installed** (Tickets 12–13): `@capacitor/haptics`, `@sentry/vue`, ESLint

## Project Structure

```
app/
  app.vue                  # Root — NuxtLayout + NuxtPage; notification-tap listener routes to Progress
  layouts/default.vue      # Shell: max-w-107.5 (430px) mx-auto, safe-area padding, TabBar fixed bottom
  pages/
    index.vue              # Progress — live counters, milestone rings, total savings card, celebration toast
    habits.vue             # Habits — CRUD, wizard (date→time→savings), relapse, milestone opt-in
    settings.vue           # Settings — theme, language, currency, milestone notifications
  components/              # auto-imported (pathPrefix: false)
    ui/                    # TabBar, Snackbar, ConfirmDialog
    habits/                # HabitCard, HabitMenu, WizardModal, SavingsModal, MilestoneOptInDialog, RelapseConfirm
    progress/              # HabitProgressCard, MilestoneRing, TotalSavingsCard, CelebrationToast
    settings/              # CurrencyPicker, LangPicker, NotificationToggle, SegmentedTheme
    notifications/         # ExactAlarmHint
  composables/
    useNow.ts              # 1s ticking Date ref (live counters) — cleanup in onUnmounted
    useThemeMode.ts        # color-mode binding
    useLocaleSwitch.ts     # i18n locale switching
  plugins/
    i18n-persist.client.ts # Locale ↔ localStorage mirror + boot redirect (WebView-safe, see Pitfalls)
  utils/                   # pure TS, no Vue imports — keeps them node-testable
    types.ts               # Habit, Milestone, AppSettings, Theme, MilestoneUnit
    storage.ts             # localStorage readJSON/writeJSON composable; keys "habits", "milestones-v1", "settings-v1"
    habits.ts              # Habit CRUD — corrupt JSON deliberately throws (screens surface it)
    milestones.ts          # Milestone calendar: BASE_MILESTONES, generateMilestones (10y horizon), ringProgress, labels
    milestones-store.ts    # Record<habitId, Milestone[]> persistence + roll-forward (returns newlyReached)
    settings.ts            # Settings persistence + first-run language/currency detection
    currencies.ts          # CURRENCY_SYMBOLS + REGION_TO_CURRENCY
    domain.ts              # daysSince, breakdown, parseSavings, formatAmount (Intl), formatDate(Time), getHabitName
    notifications.ts       # Capacitor local-notifications wrapper (native guard, exact alarms, reconcile, taps)
  i18n/locales/            # en (base), pt, fr, es, it, zh, de, nl — flat JSON, 99 keys each
  assets/css/main.css      # Tailwind import + @theme brand tokens + html.dark overrides
android/                   # Capacitor Android project (committed; build/ + .gradle/ gitignored)
  app/src/main/AndroidManifest.xml  # +SCHEDULE_EXACT_ALARM, +POST_NOTIFICATIONS
tests/
  helpers.ts               # installStorageMock() (localStorage stub via vi.stubGlobal) + seedStorage()
  smoke.test.ts            # en.json key-set guard (≥80 keys, no {{ mustache }})
  unit/                    # storage, habits, milestones, milestones-store, settings, currencies, domain, notifications
  component/               # habits, progress, settings
scripts/
  live-reload.mjs          # LAN IP + CAP_LIVE_URL + cap run android (HMR dev loop)
  add-i18n-keys.py         # add new keys to all 8 locale JSONs
  convert-i18n.py          # RN .ts → JSON migration helper
docs/
  ui-sketch.html           # Wireframe — visual contract for the rewrite
capacitor.config.ts        # appId com.soiquit.app (dev: com.soiquit.dev), webDir dist, androidScheme https
nuxt.config.ts             # modules, ssr:false, colorMode, i18n, fonts, cloudflare_pages preset
vitest.config.ts           # vue + AutoImport plugins; node env; include tests/**
```

## Coding Conventions

### Imports
- **Nuxt auto-imports — never import Nuxt or Vue APIs.** `ref`, `computed`, `watch`, `onMounted`, `onUnmounted` (Vue composition API), `useRoute`, `useRouter`, `navigateTo`, `defineNuxtPlugin`, `definePageMeta`, `useLocalePath`, `useSwitchLocalePath`, `markRaw`, the global `NuxtLink` component, etc. are available **without any import** in every SFC/plugin/composable — this is the project standard, do not clutter the top of the file with redundant imports (Nuxt generates `.nuxt/imports.d.ts` with all of them)
- **`useI18n` is imported explicitly** from `'vue-i18n'` in every component/page — that's the current codebase pattern (it also works via @nuxtjs/i18n auto-import, but the existing code imports it; match the file you're editing)
- **Relative imports only** for project modules — no `@/`/`~/` alias usage in app code (e.g. `../composables/useNow`, `./storage`)
- Components are auto-imported (`pathPrefix: false`), but pages often import them explicitly with relative paths — either is fine; keep it consistent within a file
- Group: Vue/Nuxt → i18n → project modules → local
- **Tests are different:** Vitest has NO Nuxt auto-imports — only Vue ones (via `unplugin-auto-import` in `vitest.config.ts`). Nuxt APIs (`useLocalePath`, `navigateTo`, …) must be mocked per-file (see Testing)

### Formatting (mixed tree — match the file you're editing)
- `app/utils/*.ts` (ported code): single quotes, no semicolons
- Vue SFCs and pages (recently edited): double quotes + semicolons (editor prettier). **Do not reformat a file you're only touching in part**

### Components
- `<script setup lang="ts">`, arrow functions, default exports not used (Nuxt SFCs)
- Props via `defineProps`/`withDefaults`, inline or exported interfaces
- Presentational components in `components/`, screens in `pages/`

### Styles
- Tailwind v4 utilities + token classes (`bg-surface`, `text-ink`, `text-primary`, `border-border`) — never hardcoded hex in components
- Dynamic values via `:class` bindings
- Dark mode is automatic: `html.dark` overrides the CSS variables; components use tokens and get both modes for free
- Arbitrary values like `max-w-107.5` (= 430px) and `pb-[calc(5rem+env(safe-area-inset-bottom,0px))]` are normal here

### State & Effects
- `useNow()` composable for live counters (1s `setInterval`, cleanup in `onUnmounted`) — re-render only, no storage I/O on ticks
- Data loads in `onMounted` (pages) — no polling; app-foreground tracking via `addAppForegroundListener` (native `appStateChange`), with `visibilitychange` as browser-dev fallback

### Data Layer
- localStorage only (WebView drops cookies) via `app/utils/storage.ts`
- Keys: `"habits"`, `"milestones-v1"`, `"settings-v1"`
- Error semantics: JSON-level problems (missing key, corrupt JSON, stored null) → absorbed, fall back to default; real storage errors (quota, privacy) → propagate, no silent throws. **Exception:** `habits.ts getHabits()` throws on corrupt JSON by design — screens catch and show the Snackbar
- IDs: `` `${Date.now()}-${Math.random().toString(36).substring(2, 11)}` ``
- `Habit { id, key?, name, date, savings }` — `key` is the i18n key for standard habits (`habits.alcohol`), custom habits use `name`
- Settings stored as **one object** under `settings-v1` (the RN app spread them across five keys — do not reintroduce)

### i18n
- Locale JSONs in `app/i18n/locales/{en,pt,fr,es,it,zh,de,nl}.json` — **en.json is the base**; all 8 must carry the same key set (validate with `scripts/add-i18n-keys.py`)
- Flat dot-separated keys, never nested objects
- Access via `const { t, locale } = useI18n()` in script setup, `$t` in templates — never import locale files in components
- Interpolation: `t('progress.freeFor', { name: habit.name })` replaces `{name}` — **`{{name}}` mustache is rejected by vue-i18n** (error code 9); the smoke test guards this
- Localized links: `useLocalePath()` / `switchLocalePath()` (the locale lives in the URL prefix)
- New locale = new JSON + entry in `nuxt.config.ts` `i18n.locales` (+ `SUPPORTED_LANGUAGES`/`LANGUAGE_NAMES` in `app/utils/settings.ts` if it should appear in the picker)

### Notifications (Capacitor)
- Every call is guarded by `Capacitor.isNativePlatform()` — browser/web builds are silent no-ops
- Permission read uses `areEnabled()` (the real OS switch), **not** `checkPermissions()` alone (stays "granted" when the user turns all notifications off in system settings)
- Deterministic int32 notification ids (djb2 hash of the milestone id) — reconcile works without a stored id map

## Commands

```bash
npm run dev              # Nuxt dev server (browser dev loop)
npm run build            # SPA build → .output
npm run generate         # SPA generate → dist/ (Capacitor webDir)
npx tsc --noEmit         # TypeScript check (strict)
npm test                 # vitest run (unit + component)
npx vitest run --coverage  # coverage (thresholds not enforced yet — Ticket 13; last ~91/86/88/93)
# Mobile (Capacitor)
npm run mobile:sync      # generate + cap sync android
npm run mobile:run       # cap run android
npm run mobile:apk       # gradlew assembleDebug
npm run mobile:apk:preview  # gradlew assemblePreview — debug-keystore-signed, for QA/sideload
npm run mobile:apk:release  # gradlew assembleRelease
npm run mobile:dev       # dev server on 0.0.0.0 (phone dev loop)
npm run mobile:run:live  # scripts/live-reload.mjs — LAN IP + CAP_LIVE_URL + cap run android
```

**There is no `npm run lint`** — ESLint is not configured yet (Ticket 13). Do not invent one.

## Testing

- **Unit** (`tests/unit/`): pure utils, node environment — no setup needed beyond the storage stub
- **Component** (`tests/component/`): `// @vitest-environment happy-dom` header + `mount` from `@vue/test-utils` (RTL is not used on this branch)
- **`tests/helpers.ts`:** `installStorageMock()` stubs a real `localStorage` global via `vi.stubGlobal` (no module mocking — the storage layer guards with `typeof localStorage === 'undefined'`); `seedStorage(key, value)` arranges raw values (corrupt JSON, edge cases)
- **Component test boilerplate:** `createI18n({ legacy: false, locale: 'en', messages: { en } })` from `app/i18n/locales/en.json` + `createRouter` with `createMemoryHistory`; `vi.mock` for `useNow` (hoisted ref for clock control) and `notifications` (foreground handlers)
- `vitest.config.ts` has `vue()` + `AutoImport({ imports: ['vue'] })` — components get Vue auto-imports in tests; **Nuxt auto-imports (`useLocalePath`, `navigateTo`, …) are NOT available in tests** — mock them per-file
- Coverage gate (80%) and ESLint are pending (Ticket 13)

## Key Decisions & Pitfalls

### Always Mobile (the big one)
- `ssr: false` is fixed — no branches, no flags. The web exists only for dev
- **localStorage, never cookies:** the Capacitor WebView resets cookies on restart; color-mode and i18n both persist to localStorage
- `nitro: { preset: 'cloudflare_pages' }` emits `dist/` — that is what Capacitor uses as `webDir`

### Locale Persistence (i18n-persist plugin)
- With `prefix_except_default` the active locale lives in the **URL**, and the WebView always boots at the root URL → without the plugin, language resets every launch
- `app/plugins/i18n-persist.client.ts` mirrors locale to `settings-v1` and, on boot at `/`, redirects to the saved locale's prefix. The async plugin defers mount until the redirect lands — no flash of the default locale
- `detectBrowserLanguage: false` in nuxt.config — the module's cookie-based detection is useless in the WebView

### i18n Interpolation
- `{name}` not `{{name}}` — vue-i18n rejects mustache as a nested placeholder (error code 9). The smoke test guards every locale file

### Native Date/Time Inputs
- `<input type="date">` / `<input type="time">` open the native Android pickers inside the WebView — the wizard is a stepper modal with native inputs, `max="today"` via the `max` attribute

### Notifications
- Exact alarms: `SCHEDULE_EXACT_ALARM` in the manifest; Android 12+ special access checked via `checkExactNotificationSetting()`; if denied → hint component + inexact fallback
- OS permission revoked → cancel pending; restored → reconcile (same semantics as the RN app)
- App foreground is tracked via `App.addListener('appStateChange')` — DOM `visibilitychange` alone is unreliable in the WebView (the DOM visibility doesn't change when the app backgrounds)
- Tap on a notification routes to Progress, including cold starts (the plugin retains the launch intent action until the JS listener registers)
- Notification ids: deterministic djb2 hash → `reconcileHabitNotifications` can rebuild the expected id and check it against pending without storing a map

### Milestone Ring Animation
- Fill is driven by the **Web Animations API** (`el.animate` on `strokeDashoffset`), not CSS transitions — Chromium starts SVG presentation-attribute transitions from 0 on insert ("shrink from 100%" flash), and they can be swallowed if the attribute lands before first paint
- The ring mounts empty and animates up; data arriving later re-animates from the current offset (no full-ring flash)
- Test selector for the fill bar: `circle.stroke-primary-hover` (the class is a token, `stroke-success` was renamed)

### Misc
- **Total savings card is pinned above the tab bar** (`fixed`), not part of the scroll
- Milestone chips scroll fade uses a **pseudo-element** (`::after` gradient), not an overlay element
- `capacitor.config.ts` reads `CAP_LIVE_URL` — dev-only; sets the dev appId/name, `server.url` + `cleartext: true`. Never commit a URL
- Android build variants: `debug`, `preview` (debug-keystore-signed for sideload/QA), `release` — `mobile:apk:preview`/`mobile:apk:release` call gradle directly
- npm 11 blocks esbuild postinstall — `allowScripts` entries in package.json + `npm rebuild esbuild` after fresh installs
- `appId com.soiquit.app` is a placeholder — confirm before Play Store release

## Docs Freshness — CHECK THESE ON EVERY TASK

**At the end of every task that touches the codebase — structure, stack, conventions, features, scripts, tests, i18n, or roadmap — check whether `AGENTS.md` and `README.md` need updating, and update them in the same task/commit if they do.** If the task adds/renames a file or directory, adds a dependency, changes a command, adds a locale, changes a convention, or lands a plan ticket, the docs are probably stale and must be fixed before the task is considered done. Stale docs cost more than the update. Keep the plan file (`.hermes/plans/2026-08-10_114400-rewrite-nuxt-cap.md`) `[DONE]` markers accurate too.

## Roadmap

1. ✅ Scaffold Nuxt 4 + Tailwind + i18n + color-mode + Vitest
2. ✅ Capacitor wrapper + mobile build + live reload
3. ✅ Types + storage layer (localStorage)
4. ✅ Domain utils (time + money)
5. ✅ Milestone engine (pure TS)
6. ✅ i18n: 8 locales
7. ✅ Shell + dark mode + fonts
8. ✅ Habits screen (CRUD + wizard)
9. ✅ Progress screen (counters + ring + celebration)
10. ✅ Settings screen
11. ✅ Local notifications (Capacitor)
12. ⏳ Haptics + Sentry + polish
13. ⏳ Test suite gates (80% coverage in vitest.config) + ESLint + QA checklist + final docs

## Brand

| Token | Value |
|---|---|
| Primary | `#1A6B5C` |
| Hover | `#2A8F7A` |
| Depth | `#12504A` |
| Accent | `#D4922A` |
| SubtleFill | `#E5A94A` |
| Vitality | `#E8735A` |
| Danger | `#D94F4F` |
| Light bg / surface / card / ink | `#F7F6F3` / `#FFFFFF` / `#F0EEEA` / `#1C1B1A` |
| Dark bg / surface / card / ink | `#0F0E0D` / `#1A1918` / `#242321` / `#F0EEEA` |
| App name | So I Quit |
| App ID | `com.soiquit.app` (dev: `com.soiquit.dev`) |
