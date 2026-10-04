# So I Quit

> **Track vices. Celebrate progress.**

![So I Quit](./assets/icon.svg)

---

So I Quit is a habit tracker that helps you quit habits — alcohol, tobacco, or anything else you set yourself to overcome. Set a quit date, log daily savings, and watch the counters tick. No accounts, no cloud sync, no nonsense.

## Features

- **⏱ Live Counters** — Track years, months, days, hours since quitting each habit (1s tick)
- **💰 Savings Calculator** — Enter how much you spend per day and see total savings grow in real time
- **🎉 Milestone Rings** — Daily/weekly/monthly/yearly celebration rings with opt-in local notifications (exact alarms on Android)
- **🚩 Slips** — Log an occasional, one-time slip (date only) without restarting your streak; manage them from the card menu and see the count on Progress
- **🎨 Theme Override** — System, Light, or Dark mode (persisted, WebView-safe)
- **💱 Currency Picker** — Searchable currency selector with locale-based auto-detection on first run
- **🌍 Locale-aware** — Device-language detection; Intl-based currency/date formatting
- **🗣 Multi-language** — Zero-backend i18n via @nuxtjs/i18n: EN, PT, FR, ES, IT, ZH (Simplified), DE, NL
- **📱 Mobile-first** — Capacitor 8 wrapper (Android + iOS); the same SPA runs in the browser for the dev loop
- **💾 Local Only** — All data stays on-device via localStorage (no account needed)
- **📦 Backup & Restore** — Export everything (habits, milestones, slips, settings) to a portable JSON — native share sheet on mobile, file download on web; import validates the file and replaces your data only after explicit confirmation (notification schedules are rebuilt from the restored data)
- **🎯 Multiple Habits** — Track alcohol, tobacco, custom habits simultaneously
- **✏️ Rename Custom Habits** — Rename any custom habit from its card menu (actions: edit name / edit date / edit savings / manage slips / delete); standard habits keep their localized names, so the menu only offers renaming where it applies
- **⬆️ In-app Updates** — Checks the GitHub releases for a newer version (once per 24 h at app start + a manual check in Settings) and shows an in-app banner; on Android the release APK is downloaded and installed from inside the app (no browser), then handed to the system installer

## Tech Stack

| Layer         | Technology                                                                        |
| ------------- | --------------------------------------------------------------------------------- |
| Framework     | [Nuxt](https://nuxt.com) 4.5 (SPA, `ssr: false`) + Vue 3.5                        |
| Mobile        | [Capacitor](https://capacitorjs.com) 8 (Android + iOS, iOS via Swift Package Manager) + @capacitor/local-notifications, @capacitor/filesystem, @capacitor/share |
| UI            | Tailwind CSS v4 (token-driven `@theme`) + lucide-vue-next icons                   |
| i18n          | @nuxtjs/i18n 10 — 8 locales, URL-prefix strategy, localStorage persistence        |
| Theme         | @nuxtjs/color-mode 4 (system/light/dark, localStorage)                            |
| Date Handling | dayjs (calendar math for milestone targets)                                       |
| Storage       | localStorage (WebView-safe layer in `app/utils/storage.ts`)                       |
| Fonts         | @nuxt/fonts — Inter 400–900                                                       |
| Language      | TypeScript 5.9 (strict mode)                                                      |
| Testing       | Vitest 4 + @vue/test-utils + happy-dom                                            |
| Build         | `nuxt generate` (cloudflare_pages preset) → `dist/` = Capacitor webDir            |

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server (browser dev loop)
npm run dev
```

### Android dev loop (live reload on the phone)

- Terminal A: `npm run dev` (Nuxt/Vite dev server bound to all hosts via `--host`)
- Terminal B: `npm run mobile:live` (resolves your LAN IP itself; `--emulator` uses `10.0.2.2`)
- Phone on the **same Wi-Fi**; USB debugging for the first install
- Every save → Vite HMR pushes to the WebView (no native rebuild)

### Scripts

| Command                      | Description                                                |
| ---------------------------- | ---------------------------------------------------------- |
| `npm run dev`                | Nuxt dev server                                            |
| `npm run build`              | SPA build → `.output`                                      |
| `npm run generate`           | SPA generate → `dist/` (Capacitor webDir)                  |
| `npm test`                   | Vitest unit + component tests (coverage gate 80% enforced) |
| `npm run lint`               | ESLint (flat config) — 0 errors/warnings                   |
| `npm run lint:fix`           | ESLint `--fix`                                             |
| `npx tsc --noEmit`           | TypeScript type check (strict mode)                        |
| `npm run mobile:sync`        | generate + `cap sync` (android + ios)                         |
| `npm run mobile:run`         | `cap run android`                                             |
| `npm run mobile:run:ios`     | `cap run ios` (macOS + Xcode only)                            |
| `npm run mobile:apk`         | Gradle `assembleDebug`                                        |
| `npm run mobile:apk:preview` | Gradle `assemblePreview` (debug-signed, sideload)             |
| `npm run mobile:apk:release` | Gradle `assembleRelease`                                      |
| `npm run dev`                | Dev server bound to all hosts (`--host`) — phone dev loop     |
| `npm run mobile:live`        | Live-reload loop (LAN IP + `cap run android`)                 |
| `npm run mobile:icons`       | Regenerate icon/splash densities (Android + iOS)              |

### Build

```bash
# Debug APK
npm run mobile:apk
# Preview APK (debug-keystore-signed — QA/sideload)
npm run mobile:apk:preview
# Release APK/AAB (signed once android/keystore.properties exists — see below)
npm run mobile:apk:release
```

The `android/` and `ios/` projects are committed; build artifacts are gitignored.

**Release signing:** `android/app/build.gradle` signs the `release` variant only when `android/keystore.properties` exists (gitignored; CI writes it from GitHub secrets). Without it the APK/AAB is **unsigned** — sideloading it fails with "package appears to be invalid" (use the `preview` variant for sideload QA). To sign locally, create the file next to your keystore:

```properties
# android/keystore.properties
storeFile=so-i-quit-upload.jks
storePassword=***
keyAlias=upload
keyPassword=***
```

with the `.jks` in `android/` (generated once via `keytool -genkeypair ... -validity 10000`; keep the original outside the repo — it is your publishing identity).

### CI preview installers

`.github/workflows/mobile-preview.yml` is manual-only (`workflow_dispatch`, any branch — previews are on-demand, not per-PR; `ci` already gates PRs). A `platforms` input picks android/ios/both:

- **Android** — `assemblePreview` APK (installable on any device, `com.soiquit.app.preview`)
- **iOS** — unsigned simulator `.app` (zipped; install via Xcode/simctl)

Artifacts land in the run's Summary page. Signed iOS device builds need an Apple Developer account + certificates.

### CI release installers

`.github/workflows/mobile-release.yml` is also manual-only (`workflow_dispatch`): builds a **signed** `assembleRelease` APK + `bundleRelease` AAB for production. The keystore never enters the repo — the workflow decodes `ANDROID_KEYSTORE_B64` (plus password/alias secrets) into the ephemeral runner. Required secrets: `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Enable **Play App Signing** when publishing — the upload key is then recoverable if lost/compromised. Release download = APK only; the AAB is for Play Store upload only, not made available (AABs can't be sideloaded).

## Testing

- **Stack:** Vitest 4 + @vue/test-utils + happy-dom. Pure logic (`app/utils/*`) runs in node; components run in happy-dom (`// @vitest-environment happy-dom`).
- **Layout:** `tests/unit/` (storage, habits, milestones, milestones-store, slips-store, settings, currencies, domain, validators, migrations, notifications, backup, backup-platform, haptics, system-bars, back-handler, popover, version, updates, update-install, use-update-check) + `tests/component/` (habits, name-modal, savings-modal, wizard-modal, progress, settings, tabbar, error-boundary, exact-alarm-dialog, update-banner) + `tests/smoke.test.ts` (i18n key-set guard + 8-locale key parity vs `en.json`).
- **Helpers (`tests/helpers.ts`):** `installStorageMock()` stubs a real `localStorage` global (no module mocking) + `seedStorage()` for arranging raw values.
- **Coverage:** gate enforced at 80% (statements/lines/functions/branches) in `vitest.config.ts` — `npm test` fails below it. Current ~93/95/92/86 (stmts/lines/funcs/branches). ESLint (10 + @nuxt/eslint) is configured with `npm run lint` / `npm run lint:fix`.
- **No React Native / jest-expo here** — the app is Nuxt 4 + Capacitor; the old RN/Expo code is gone.

## Project Structure

```
app/
  app.vue                  # Root — NuxtLayout + NuxtPage; notification-tap → Progress; update check on mount
  layouts/default.vue      # Shell: fixed-height column (safe-areas, TabBar) + update banner; the document never scrolls
  pages/                   # index (Progress), habits, settings — pinned header + own scroll area each
  components/              # ui/, habits/, progress/, settings/, notifications/, updates/
  composables/             # useNow (1s tick), useThemeMode, useLocaleSwitch, useFocusTrap,
                           # useExactAlarmPrompt, useMilestoneNotifications, useUpdateCheck
  plugins/                 # i18n-persist.client.ts (locale persistence), sentry.client.ts,
                           # system-bars.client.ts (native Android system bars)
  utils/                   # types, storage, habits, validators, migrations, milestones,
                           # milestones-store, slips-store, settings, currencies, domain,
                           # notifications, haptics, system-bars, back-handler, backup,
                           # backup-platform, popover, version, updates, update-install
  i18n/locales/            # en (base), pt, fr, es, it, zh, de, nl — flat JSON
  assets/css/main.css      # Tailwind import + @theme brand tokens + dark overrides + scroll-shadow classes
assets/                    # Icon/splash SVG masters (incl. splash-logo.svg) + rendered PNG sources
public/                    # Web favicon (icon.svg) + apple-touch-icon.png
android/                   # Capacitor Android project (committed) — SplashActivity = launch splash;
                           # app-local plugins: SystemBarsPlugin, ApkInstallerPlugin
ios/                       # Capacitor iOS project (committed; Swift Package Manager)
tests/                     # unit/ + component/ + helpers.ts + smoke.test.ts
scripts/                   # live-reload.mjs, add-i18n-keys.py, convert-i18n.py, bump-version.mjs, generate-icons.sh
docs/                      # architecture.md, ui-shell.md, features.md, android-native.md,
                           # build-and-release.md, QA-CHECKLIST.md (see Documentation below)
```

## Documentation

| File | Audience | Covers |
| ---- | -------- | ------ |
| `README.md` | humans | features, stack, getting started, structure, license |
| `AGENTS.md` | agents | short contract — overview, stack, structure, conventions, commands, testing |
| `docs/architecture.md` | agents | always-mobile, data layer, i18n, notifications |
| `docs/ui-shell.md` | agents | shell & scrolling, transitions, modals/z-scale, back button, date inputs, ring animation |
| `docs/features.md` | agents | slips, rename, backup/export-import, in-app updates |
| `docs/android-native.md` | agents | launch splash, system bars, icons/splash, haptics, Sentry |
| `docs/build-and-release.md` | agents | commands, hooks/CI, version sync, build variants, CD pipelines |
| `docs/QA-CHECKLIST.md` | QA | manual checklist vs screens + overlays |

## License

MIT — do whatever you want with it.
