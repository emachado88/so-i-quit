# AGENTS.md

> Short contract for agents working in this repo. Deep reasoning and traps live in `docs/` —
> see **Documentation** at the bottom. Read this file first; open the linked doc when you touch
> that area.

## Project Overview

So I Quit — a habit tracker that counts time since quitting and calculates accumulated savings.
Local-only, no backend. **Nuxt 4 SPA + Capacitor (Android + iOS).** The React Native/Expo app was
the pre-rewrite stack and no longer exists in this repo; everything lands on `main` via PR.

**Always mobile** (user decision — no `MOBILE_BUILD` flag): `ssr: false`, everything persisted in
localStorage (the WebView drops cookies), domain logic as pure TS modules tested with Vitest. The
web build exists only for the dev loop.

## Tech Stack

- **Nuxt 4.5** (`ssr: false`, `compatibilityDate 2026-08-10`) + **Vue 3.5** + **TypeScript 5.9** strict
- **Tailwind CSS v4** via `@tailwindcss/vite` — design tokens live in `app/assets/css/main.css` `@theme` (no `tailwind.config`)
- **@nuxtjs/i18n 10** — 8 locales, `prefix_except_default`, flat JSON keys, `{name}` interpolation
- **@nuxtjs/color-mode 4** — system/light/dark, persisted in localStorage
- **@nuxt/fonts** — Inter 400–900 from Google
- **lucide-vue-next** — icons
- **dayjs** — calendar math for milestone targets
- **Capacitor 8** — `@capacitor/core|cli|android|ios|app|local-notifications|haptics|status-bar|filesystem|share`; `android/` + `ios/` are committed; `dist/` (cloudflare_pages preset output) is the webDir. **iOS uses Swift Package Manager** (CapApp-SPM `Package.swift` references the plugins — no Podfile)
- **@capacitor/assets** (devDep) — generates every icon/splash density from the `assets/` SVG masters via `npm run mobile:icons` (rsvg-convert renders the PNGs)
- **@sentry/vue** — opt-in error tracking via `NUXT_PUBLIC_SENTRY_DSN` (no DSN → plugin is a no-op)
- **Vitest 4 + @vue/test-utils + happy-dom** — unit tests in node env, component tests in happy-dom
- **@nuxt/test-utils**, **unplugin-auto-import** (Vue auto-imports in tests; `nuxt/app` composables used by components under test resolve and are mocked per file)
- **ESLint 10 + @nuxt/eslint** — flat config (`eslint.config.mjs`), `npm run lint` / `npm run lint:fix`
- **husky 9 + lint-staged 17** — git hooks; lint-staged runs `eslint --fix` on staged files only (`lint-staged.config.mjs`)

## Project Structure

```
app/
  app.vue                  # Root — NuxtLayout + NuxtPage; notification-tap listener
  layouts/default.vue      # Shell: fixed-height column (the document never scrolls), safe-areas, TabBar, UpdateBanner in-flow
  pages/
    index.vue              # Progress — live counters, milestone rings, total savings card, celebration toast
    habits.vue             # Habits — CRUD, wizard (date+time→savings), relapse, slips (log/manage), rename (custom habits), milestone opt-in
    settings.vue           # Settings — theme, language, currency, milestone notifications, data backup (export/import), update check
  components/              # auto-imported (pathPrefix: false)
    ui/                    # TabBar, Snackbar, ConfirmDialog, ErrorBoundary
    habits/                # HabitCard, HabitMenu, WizardModal, SavingsModal, NameModal, MilestoneOptInDialog, RelapseConfirm, SlipLogModal, SlipsModal
    progress/              # HabitProgressCard, MilestoneRing, TotalSavingsCard, CelebrationToast
    settings/              # CurrencyPicker, LangPicker, NotificationToggle, SegmentedTheme
    notifications/         # ExactAlarmHint, ExactAlarmDialog
    updates/               # UpdateBanner (in-app "update available" banner, in-flow in the shell)
  composables/
    useNow.ts              # 1s ticking Date ref (live counters) — cleanup in onUnmounted
    useThemeMode.ts        # color-mode binding
    useLocaleSwitch.ts     # i18n locale switching
    useFocusTrap.ts        # focus trap for modal dialogs (WizardModal, NameModal, SavingsModal) — restores focus on close
    useExactAlarmPrompt.ts # module-level singleton for the exact-alarm re-ask dialog — survives page re-creation
    useMilestoneNotifications.ts # shared notification orchestration — enable/disable/rebuild chains + exact-alarm re-ask state
    useUpdateCheck.ts      # module-level singleton for the GitHub update check — check({force}) / download() / banner state
  plugins/
    i18n-persist.client.ts # Locale ↔ localStorage mirror + boot redirect (WebView-safe)
    sentry.client.ts       # @sentry/vue init — no-op unless NUXT_PUBLIC_SENTRY_DSN is set
    system-bars.client.ts  # resolved color-mode → native Android system bars (SystemBarsPlugin)
  utils/                   # pure TS, no Vue imports — keeps them node-testable
    types.ts               # Habit, Milestone, Slip, AppSettings, Theme, MilestoneUnit
    storage.ts             # localStorage readJSON/writeJSON composable; keys "habits", "milestones-v1", "slips-v1", "settings-v1"
    habits.ts              # Habit CRUD — corrupt JSON deliberately throws (screens surface it)
    validators.ts          # runtime guards for parsed/stored shapes (shared by stores + backup)
    migrations.ts          # legacy stored-shape migrations (applied on read)
    milestones.ts          # Milestone calendar: BASE_MILESTONES, generateMilestones (10y horizon), ringProgress, labels
    milestones-store.ts    # Record<habitId, Milestone[]> persistence + roll-forward (returns newlyReached)
    slips-store.ts         # Record<habitId, Slip[]> persistence (add/update/delete, clearPastSlips on quit-date edit)
    settings.ts            # Settings persistence + first-run language/currency detection
    currencies.ts          # CURRENCY_SYMBOLS + REGION_TO_CURRENCY
    domain.ts              # daysSince, breakdown, parseSavings, formatAmount (Intl), formatDate(Time), getHabitName
    notifications.ts       # Capacitor local-notifications wrapper (native guard, exact alarms, reconcile, taps)
    haptics.ts             # Capacitor haptics wrapper (native guard; light tabs / medium confirms / success milestones)
    system-bars.ts         # SystemBars plugin wrapper — Android: SystemBarsPlugin.setTheme; iOS: StatusBar.setStyle
    back-handler.ts        # Hardware-back: LIFO overlay handler stack + root backButton listener + exitApp
    backup.ts              # Versioned backup file ({version, exportedAt, habits, milestones, slips, settings}) — build/parse/import; never throws
    backup-platform.ts     # Platform bridge: native export = Filesystem cache + Share sheet; import = hidden <input type="file">; web export = download
    popover.ts             # Pure flip geometry for dropdowns near a clipped edge — opensUpward(trigger, panel, viewport)
    version.ts             # Semver-ish compare (normalizeVersion/compareVersions/isNewerVersion) — dependency-free
    updates.ts             # GitHub releases/latest fetch + release parsing (APK asset pick) + 24 h throttle
    update-install.ts      # ApkInstaller plugin wrapper — native APK download + install intent (Android-only guard)
  i18n/locales/            # en (base), pt, fr, es, it, zh, de, nl — flat JSON, 152 keys each
  assets/css/main.css      # Tailwind import + @theme brand tokens + html.dark overrides + page-transition/entrance classes + scroll-shadow classes
android/                   # Capacitor Android project (committed; build/ + .gradle/ gitignored)
  app/src/main/java/com/soiquit/app/  # SplashActivity, MainActivity, SystemBarsPlugin, ApkInstallerPlugin
ios/                       # Capacitor iOS project (committed; SPM via App/CapApp-SPM — no Podfile)
tests/
  helpers.ts               # installStorageMock() (localStorage stub via vi.stubGlobal) + seedStorage()
  smoke.test.ts            # en.json key-set guard (≥80 keys, no {{ mustache }}) + 8-locale key parity vs en.json
  unit/                    # storage, habits, milestones, milestones-store, slips-store, settings, currencies, domain, validators, migrations, notifications, backup, backup-platform, haptics, system-bars, back-handler, popover, version, updates, update-install, use-update-check
  component/               # habits, name-modal, savings-modal, wizard-modal, progress, settings, tabbar, error-boundary, exact-alarm-dialog, update-banner
scripts/
  live-reload.mjs          # LAN IP + CAP_LIVE_URL + cap run android (HMR dev loop)
  add-i18n-keys.py         # add new keys to all 8 locale JSONs
  convert-i18n.py          # RN .ts → JSON migration helper (legacy)
  bump-version.mjs         # version:bump / version:check — keeps the four version sources in lockstep
  generate-icons.sh        # SVG masters → PNG sources → @capacitor/assets densities (+ Android splash logo)
assets/                    # Icon/splash SVG masters (incl. splash-logo.svg) + rendered 1024²/2732² PNG sources
public/                    # Web favicon (icon.svg) + apple-touch-icon.png (180²)
docs/                      # Architecture/UI/native/features/build docs + QA checklist (see Documentation)
.github/workflows/         # ci.yml (PR gate), mobile-preview.yml, mobile-release.yml (both workflow_dispatch)
capacitor.config.ts        # appId com.soiquit.app (dev: com.soiquit.dev), webDir dist, androidScheme https
nuxt.config.ts             # modules, ssr:false, colorMode, i18n, fonts, cloudflare_pages preset
vitest.config.ts           # vue + AutoImport plugins; node env; include tests/**; coverage gate 80%
eslint.config.mjs          # flat config (@nuxt/eslint, stylistic)
lint-staged.config.mjs     # eslint --fix on staged *.{ts,vue,mjs}
```

## Coding Conventions

### Imports
- **Nuxt auto-imports — never import Nuxt or Vue APIs.** `ref`, `computed`, `watch`, `onMounted`, `onUnmounted`, `useRoute`, `useRouter`, `navigateTo`, `defineNuxtPlugin`, `definePageMeta`, `useLocalePath`, `useSwitchLocalePath`, `markRaw`, the global `NuxtLink` component, etc. are available **without any import** in every SFC/plugin/composable — this is the project standard (Nuxt generates `.nuxt/imports.d.ts`).
- **`useI18n` is imported explicitly** from `'vue-i18n'` in every component/page — match the file you're editing.
- **Relative imports only** for project modules — no `@/`/`~/` alias usage in app code (e.g. `../composables/useNow`, `./storage`).
- Components are auto-imported (`pathPrefix: false`), but pages often import them explicitly with relative paths — either is fine; keep it consistent within a file.
- Group: Vue/Nuxt → i18n → project modules → local.
- **Tests are different:** Vitest has NO Nuxt auto-imports — only Vue ones (via `unplugin-auto-import` in `vitest.config.ts`). Nuxt APIs used INSIDE components under test (`useLocalePath`, `useRoute`, `useRuntimeConfig`) are mocked per-file; composables used in pages are wrapped and mocked (see Testing).

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

### Data, state, i18n & notifications
Rules and rationale are in **`docs/architecture.md`** (data layer, storage keys & error semantics, state/effects, i18n model + locale persistence, notification scheduling). Keep that doc in sync when you change any of it.

## Commands

```bash
npm run dev              # Nuxt dev server (browser dev loop)
npm run build            # SPA build → .output
npm run generate         # SPA generate → dist/ (Capacitor webDir)
npm run lint             # ESLint (flat config, @nuxt/eslint) — 0 errors/warnings
npm run lint:fix         # ESLint --fix
npx tsc --noEmit         # TypeScript check (strict)
npm test                 # vitest run (unit + component) + coverage gate 80%
npx vitest run --coverage  # coverage report (last ~93/95/92/86 stmts/lines/funcs/branches)
# Mobile (Capacitor)
npm run mobile:sync      # generate + cap sync (android + ios)
npm run mobile:run       # cap run android
npm run mobile:run:ios   # cap run ios (macOS + Xcode only)
npm run mobile:apk       # gradlew assembleDebug
npm run mobile:apk:preview  # gradlew assemblePreview — debug-keystore-signed, for QA/sideload
npm run mobile:apk:release  # gradlew assembleRelease — signed only if android/keystore.properties exists
npm run mobile:live      # cap sync && scripts/live-reload.mjs — LAN IP + CAP_LIVE_URL + cap run android
npm run mobile:icons     # regenerate icon/splash densities
# Version sync
npm run version:bump <1.2.0|major|minor|patch> [--dry-run]  # bump package.json + lock + gradle + pbxproj in lockstep
npm run version:check     # fail (exit 1) if the four version sources have drifted
```

## Testing

- **Unit** (`tests/unit/`): pure utils, node environment — no setup needed beyond the storage stub
- **Component** (`tests/component/`): `// @vitest-environment happy-dom` header + `mount` from `@vue/test-utils`
- **`tests/helpers.ts`:** `installStorageMock()` stubs a real `localStorage` global via `vi.stubGlobal` (no module mocking); `seedStorage(key, value)` arranges raw values (corrupt JSON, edge cases)
- **Component test boilerplate:** `createI18n({ legacy: false, locale: 'en', messages: { en } })` from `app/i18n/locales/en.json` + `createRouter` with `createMemoryHistory`; `vi.mock` for `useNow` (hoisted ref for clock control) and `notifications` (foreground handlers)
- **No Nuxt auto-imports in tests**, so anything a component/page pulls in implicitly must be imported explicitly in the SFC or it is `undefined` at mount — pages import their components with relative paths, and composables like `useFocusTrap` are imported where used; forgetting it in a modal breaks every page test that mounts the page
- Coverage gate **enforced** at 80% (statements/lines/functions/branches) in `vitest.config.ts` — `npm test` fails below it (last ~93/95/92/86). ESLint must stay at 0 errors/warnings

## Docs Freshness: CHECK THIS ON EVERY TASK

**At the end of every task that touches the codebase — structure, stack, conventions, features, scripts, tests, i18n, or roadmap — check whether these docs are stale and fix them in the same task/commit.** A new/renamed file or directory, a new dependency, a changed command or gate, a new locale, a changed convention, or a landed roadmap item all stale them. Stale docs cost more than the update. The files:

| File | Audience | Covers |
|---|---|---|
| `README.md` | humans | features, stack, getting started, structure, license |
| `AGENTS.md` | agents | the short contract — overview, stack, structure, conventions, commands, testing |
| `docs/architecture.md` | agents | always-mobile, data layer, i18n, notifications |
| `docs/ui-shell.md` | agents | shell & scrolling, transitions, modals/z-scale, back button, date inputs, ring animation |
| `docs/features.md` | agents | slips, rename, backup/export-import, in-app updates |
| `docs/android-native.md` | agents | launch splash, system bars, icons/splash, haptics, Sentry |
| `docs/build-and-release.md` | agents | commands, hooks/CI, version sync, build variants, CD pipelines |
| `docs/QA-CHECKLIST.md` | QA | manual checklist vs screens + overlays |

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
12. ✅ Haptics + Sentry + polish
13. ✅ Test suite gates (80% coverage enforced in vitest.config) + ESLint + QA checklist + final docs
14. ✅ Slips — one-time lapses (log/manage + Progress indicator), cleared on relapse / quit-date edit
15. ✅ Update check — GitHub releases (24 h throttle + forced manual check in Settings), in-app banner, in-app APK download + install on Android

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
