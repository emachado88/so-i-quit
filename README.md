# So I Quit

> **Track vices. Celebrate progress.**

![So I Quit](./assets/icon.svg)

---

So I Quit is a habit tracker that helps you quit habits — alcohol, tobacco, or anything else you set yourself to overcome. Set a quit date, log daily savings, and watch the counters tick. No accounts, no cloud sync, no nonsense.

## Features

- **⏱ Live Counters** — Track years, months, days, hours since quitting each habit (1s tick)
- **💰 Savings Calculator** — Enter how much you spend per day and see total savings grow in real time
- **🎉 Milestone Rings** — Daily/weekly/monthly/yearly celebration rings with opt-in local notifications (exact alarms on Android)
- **🎨 Theme Override** — System, Light, or Dark mode (persisted, WebView-safe)
- **💱 Currency Picker** — Searchable currency selector with locale-based auto-detection on first run
- **🌍 Locale-aware** — Device-language detection; Intl-based currency/date formatting
- **🗣 Multi-language** — Zero-backend i18n via @nuxtjs/i18n: EN, PT, FR, ES, IT, ZH (Simplified), DE, NL
- **📱 Mobile-first** — Capacitor 8 wrapper (Android + iOS); the same SPA runs in the browser for the dev loop
- **💾 Local Only** — All data stays on-device via localStorage (no account needed)
- **🎯 Multiple Habits** — Track alcohol, tobacco, custom habits simultaneously

## Tech Stack

| Layer         | Technology                                                                        |
| ------------- | --------------------------------------------------------------------------------- |
| Framework     | [Nuxt](https://nuxt.com) 4.5 (SPA, `ssr: false`) + Vue 3.5                        |
| Mobile        | [Capacitor](https://capacitorjs.com) 8 (Android + iOS, iOS via Swift Package Manager) + @capacitor/local-notifications |
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

- Terminal A: `npm run mobile:dev` (Nuxt/Vite dev server bound to `0.0.0.0`)
- Terminal B: `npm run mobile:run:live` (resolves your LAN IP itself; `--emulator` uses `10.0.2.2`)
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
| `npm run mobile:dev`         | Dev server on `0.0.0.0` (phone dev loop)                      |
| `npm run mobile:run:live`    | Live-reload loop (LAN IP + `cap run android`)                 |
| `npm run mobile:icons`       | Regenerate icon/splash densities (Android + iOS)              |

### Build

```bash
# Debug APK
npm run mobile:apk
# Preview APK (debug-keystore-signed — QA/sideload)
npm run mobile:apk:preview
# Release APK/AAB
npm run mobile:apk:release   # then sign/align via the normal Android toolchain
```

The `android/` and `ios/` projects are committed; build artifacts are gitignored.

### CI preview installers

`.github/workflows/mobile-preview.yml` is manual-only (`workflow_dispatch`, any branch — previews are on-demand, not per-PR; `ci` already gates PRs). A `platforms` input picks android/ios/both:

- **Android** — `assemblePreview` APK (installable on any device, `com.soiquit.app.preview`)
- **iOS** — unsigned simulator `.app` (zipped; install via Xcode/simctl)

Artifacts land in the run's Summary page. Signed iOS device builds need an Apple Developer account + certificates.

## Testing

- **Stack:** Vitest 4 + @vue/test-utils + happy-dom. Pure logic (`app/utils/*`) runs in node; components run in happy-dom (`// @vitest-environment happy-dom`).
- **Layout:** `tests/unit/` (storage, habits, milestones, milestones-store, settings, currencies, domain, notifications) + `tests/component/` (habits, progress, settings) + `tests/smoke.test.ts` (i18n key-set guard).
- **Helpers (`tests/helpers.ts`):** `installStorageMock()` stubs a real `localStorage` global (no module mocking) + `seedStorage()` for arranging raw values.
- **Coverage:** gate enforced at 80% (statements/lines/functions/branches) in `vitest.config.ts` — `npm test` fails below it. Current ~94/89/92/95. ESLint (10 + @nuxt/eslint) is configured with `npm run lint` / `npm run lint:fix`.
- **No React Native / jest-expo here** — that tooling belongs to the old app on `master`.

## Project Structure

```
app/
  app.vue                  # Root — NuxtLayout + NuxtPage; notification-tap → Progress
  layouts/default.vue      # Shell: max-w-107.5 (430px), safe-area, TabBar fixed bottom
  pages/                   # index (Progress), habits, settings
  components/              # ui/, habits/, progress/, settings/, notifications/
  composables/             # useNow (1s tick), useThemeMode, useLocaleSwitch
  plugins/                 # i18n-persist.client.ts (WebView-safe locale persistence)
  utils/                   # types, storage, habits, milestones, milestones-store,
                           # settings, currencies, domain, notifications (pure TS)
  i18n/locales/            # en (base), pt, fr, es, it, zh, de, nl — flat JSON
  assets/css/main.css      # Tailwind import + @theme brand tokens + dark overrides
assets/                    # Icon/splash SVG masters + rendered 1024²/2732² PNG sources
public/                    # Web favicon (icon.svg) + apple-touch-icon.png
android/                   # Capacitor Android project (committed)
ios/                       # Capacitor iOS project (committed; Swift Package Manager)
tests/                     # unit/ + component/ + helpers.ts + smoke.test.ts
scripts/                   # live-reload.mjs, add-i18n-keys.py, convert-i18n.py, generate-icons.sh
docs/ui-sketch.html        # Wireframe — visual contract
docs/QA-CHECKLIST.md       # Manual QA checklist vs wireframe (screens + overlays)
```

## License

MIT — do whatever you want with it.
