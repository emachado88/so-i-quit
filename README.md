# So I Quit

> **Track vices. Celebrate progress.**

---

So I Quit is a habit tracker that helps you quit habits — alcohol, tobacco, or anything else you set yourself to overcome. Set a quit date, log daily savings, and watch the counters tick. No accounts, no cloud sync, no nonsense.

> ⚠️ **This branch (`rewrite-nuxt-cap`) is the Nuxt 4 + Capacitor rewrite.** The previous React Native (Expo) app lives on `master` until the rewrite lands. The docs below describe the rewrite.

## Features

- **⏱ Live Counters** — Track years, months, days, hours since quitting each habit (1s tick)
- **💰 Savings Calculator** — Enter how much you spend per day and see total savings grow in real time
- **🎉 Milestone Rings** — Daily/weekly/monthly/yearly celebration rings with opt-in local notifications (exact alarms on Android)
- **🎨 Theme Override** — System, Light, or Dark mode (persisted, WebView-safe)
- **💱 Currency Picker** — Searchable currency selector with locale-based auto-detection on first run
- **🌍 Locale-aware** — Device-language detection; Intl-based currency/date formatting
- **🗣 Multi-language** — Zero-backend i18n via @nuxtjs/i18n: EN, PT, FR, ES, IT, ZH (Simplified), DE, NL
- **📱 Android-first** — Capacitor 8 wrapper; the same SPA runs in the browser for the dev loop
- **💾 Local Only** — All data stays on-device via localStorage (no account needed)
- **🎯 Multiple Habits** — Track alcohol, tobacco, custom habits simultaneously

## Tech Stack

| Layer         | Technology                                                                  |
| ------------- | --------------------------------------------------------------------------- |
| Framework     | [Nuxt](https://nuxt.com) 4.5 (SPA, `ssr: false`) + Vue 3.5                  |
| Mobile        | [Capacitor](https://capacitorjs.com) 8 (Android) + @capacitor/local-notifications |
| UI            | Tailwind CSS v4 (token-driven `@theme`) + lucide-vue-next icons             |
| i18n          | @nuxtjs/i18n 10 — 8 locales, URL-prefix strategy, localStorage persistence  |
| Theme         | @nuxtjs/color-mode 4 (system/light/dark, localStorage)                      |
| Date Handling | dayjs (calendar math for milestone targets)                                 |
| Storage       | localStorage (WebView-safe layer in `app/utils/storage.ts`)                 |
| Fonts         | @nuxt/fonts — Inter 400–900                                                 |
| Language      | TypeScript 5.9 (strict mode)                                                |
| Testing       | Vitest 4 + @vue/test-utils + happy-dom                                      |
| Build         | `nuxt generate` (cloudflare_pages preset) → `dist/` = Capacitor webDir      |

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

| Command                      | Description                                       |
| ---------------------------- | ------------------------------------------------- |
| `npm run dev`                | Nuxt dev server                                   |
| `npm run build`              | SPA build → `.output`                             |
| `npm run generate`           | SPA generate → `dist/` (Capacitor webDir)         |
| `npm test`                   | Vitest unit + component tests                     |
| `npx tsc --noEmit`           | TypeScript type check (strict mode)               |
| `npm run mobile:sync`        | generate + `cap sync android`                     |
| `npm run mobile:run`         | `cap run android`                                 |
| `npm run mobile:apk`         | Gradle `assembleDebug`                            |
| `npm run mobile:apk:preview` | Gradle `assemblePreview` (debug-signed, sideload) |
| `npm run mobile:apk:release` | Gradle `assembleRelease`                          |
| `npm run mobile:dev`         | Dev server on `0.0.0.0` (phone dev loop)          |
| `npm run mobile:run:live`    | Live-reload loop (LAN IP + `cap run android`)     |

### Build

```bash
# Debug APK
npm run mobile:apk
# Preview APK (debug-keystore-signed — QA/sideload)
npm run mobile:apk:preview
# Release APK/AAB
npm run mobile:apk:release   # then sign/align via the normal Android toolchain
```

The `android/` project is committed; build artifacts are gitignored.

## Testing

- **Stack:** Vitest 4 + @vue/test-utils + happy-dom. Pure logic (`app/utils/*`) runs in node; components run in happy-dom (`// @vitest-environment happy-dom`).
- **Layout:** `tests/unit/` (storage, habits, milestones, milestones-store, settings, currencies, domain, notifications) + `tests/component/` (habits, progress, settings) + `tests/smoke.test.ts` (i18n key-set guard).
- **Helpers (`tests/helpers.ts`):** `installStorageMock()` stubs a real `localStorage` global (no module mocking) + `seedStorage()` for arranging raw values.
- **Coverage:** currently ~91/86/88/93 (lines/branches/functions/statements). An enforced 80% gate + ESLint are planned (rewrite Ticket 13).
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
android/                   # Capacitor Android project (committed)
tests/                     # unit/ + component/ + helpers.ts + smoke.test.ts
scripts/                   # live-reload.mjs, add-i18n-keys.py, convert-i18n.py
docs/ui-sketch.html        # Wireframe — visual contract
```

## Roadmap (rewrite tickets)

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
13. ⏳ Test suite gates (80% coverage) + ESLint + QA checklist + final docs

## License

MIT — do whatever you want with it.
