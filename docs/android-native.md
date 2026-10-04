# Android & Native

Native/Capacitor behaviour: launch splash, system bars, assets, haptics, Sentry. Rules live in
`AGENTS.md`; the reasoning and the traps are here.

## Icons & splash assets

- Master art: `assets/icon.svg` (rounded, full-bleed). `assets/` holds the derived SVG variants +
  rendered 1024²/2732² PNG sources; `npm run mobile:icons` (`scripts/generate-icons.sh` →
  rsvg-convert → `@capacitor/assets generate --android --ios`) regenerates every density. Re-run it
  after editing any master. The script also renders `public/apple-touch-icon.png` (180², from
  icon-ios) and `assets/ios/icon.png`.
- **Adaptive foreground** = pulse line + dot only on transparent, baked into the center safe zone
  (`icon-foreground.svg` scales the line 0.82×); the tool wraps it in a 16.7% inset → final art ≈44%
  of the icon, safely inside the mask.
- **Gotcha:** the tool's generated `ic_launcher*.xml` insets the **background** 16.7% too — on squircle
  masks that leaves a launcher-default rim around the gradient. The committed XMLs drop the background
  inset (gradient fills the full 108dp layer); keep it that way when regenerating (the tool will
  re-add it — re-patch after `mobile:icons`).
- **Gotcha:** `@capacitor/assets` also re-parses `AndroidManifest.xml` on every run and rewrites it
  cosmetically (self-closing tags, whitespace). Functionally identical — revert the manifest with
  `git checkout` after `mobile:icons` if you don't want that churn in the diff.
- **iOS variant** (`assets/icon-ios.svg`) is the square master with **no baked rounded corners** —
  Apple applies its own mask. It feeds `assets/ios/icon.png` (the @capacitor/assets iOS override — the
  root `icon-ios.png` is NOT consumed for the AppIcon, only for the web `apple-touch-icon`) and the web
  favicon `public/icon.svg`.
- **Splash:** `assets/splash.svg` (light) + `assets/splash-dark.svg` (dark-mode variant) →
  `splash.png`/`splash-dark.png` (2732²). iOS LaunchScreen.storyboard uses `scaleAspectFill` with the
  light image; the dark variant is registered in the `Splash.imageset` `Contents.json` under the
  `luminosity: dark` appearance so iOS picks it automatically in dark mode.

## Launch splash (no fixed duration, no fade)

- **The splash is the launch theme's window background — nothing else.** `AppTheme.NoActionBarLaunch`
  sets `android:windowBackground = @drawable/splash_screen` — a `layer-list` of the brand gradient
  (`@drawable/splash_bg`, light + `drawable-night/`) with the pulse logo centred at
  `@dimen/splash_logo_size`. The **system paints that from the process's first frame**, i.e. before any
  Java runs, so the logo is on screen *instantly* and can never appear late. It is static art and the
  app window replaces it when it loads — a cut, on purpose (see below).
- `SplashActivity` then hands off on its **first drawn frame** (`OnPreDrawListener` → post →
  `startActivity`): **no hold** (the old 1200 ms delay is gone). It keeps `noHistory`, the back-press
  exit, and the launch-intent (action + extras) forwarding to MainActivity so **notification
  cold-start taps keep working**.
- **No activity transition:** both windows show the same art, so the launch theme sets
  `android:windowAnimationStyle=@null` (values + values-night) and `SplashActivity` overrides it to
  nothing as well (`overrideActivityTransition(…, 0, 0)` on API 34+, `overridePendingTransition(0, 0)`
  below) — the default slide/zoom only reads as a jump when the art either side is identical.
- **No fade, no overlay — twice attempted, twice reverted.** (1) An overlay view above the WebView,
  first as a child of `android.R.id.content` then of the window decor: **never rendered on device**
  (the art that stayed on screen was always the static window background), so the logo beat and the
  fade-out on that view were invisible and all the user ever saw was art → app. (2) `WebView.setAlpha(0f)`
  + an alpha cross-fade over 260 ms driven by an app-local `AppSplash` plugin on the app's mount
  signal, gated on the WebView's first frame: correct in theory but **invisible on device and then
  flaky** — one launch came up with no art at all. Both were removed; the WebView is opaque and
  replaces the art as soon as its window draws, which is the hand-off. **Do not reintroduce a splash
  view above the WebView, and do not gate the hand-off on a web signal.**
- **The splash logo is static art on purpose and cannot animate.** An entrance animation has to start
  invisible, but the logo is painted from frame 1 by the window background — so a fade/scale-in reads
  as the logo *arriving late*, which is the bug this whole design evolved from.
- **iOS has no overlay** — Apple dismisses the launch storyboard as soon as the app's first frame is
  ready (already duration-free) and its `Splash` imageset cannot animate. A fade there needs an
  app-local Swift overlay or `@capacitor/splash-screen` (`launchShowDuration: 0` + `fadeOutDuration`);
  neither is wired.
- **Recents/task-overview title:** the task title comes from the **root activity's** label — the
  launcher. SplashActivity must keep a non-empty `android:label` (`@string/app_name`); an empty
  `android:label=""` blanks the Recents card title (icon only) even after MainActivity takes over.
- `windowSplashScreenBackground` (`@color/splash_background`, `#1A6B5C`) still colors the Android 12+
  system splash on devices where it renders (before SplashActivity) — it now only covers the pre-window
  gap; `windowSplashScreenAnimatedIcon` is **transparent** — HyperOS renders the splash icon
  duplicated on top of the window (the "3 copies" bug: 2 distorted icons in the header + the window
  image).
- **Gotcha:** the core-splashscreen library (`Theme.SplashScreen`) **overrides `android:windowBackground`
  with a solid color** (`compat_splash_screen_no_icon_background`) — the Capacitor template's
  `android:background=@drawable/splash` is the wrong attribute and never renders. The launch theme
  must set `android:windowBackground` (after the parent) to show the splash art.
- `MainActivity` has no intent-filter (`exported=false`, `singleTask`) and keeps
  `AppTheme.NoActionBarLaunch`, so the branded backdrop stays behind the WebView while it loads (no
  flash, no blank window) and the web app paints over it as soon as it is ready.
- `@capacitor/splash-screen` was **tried and removed** — on Android 12+ its launch splash is still the
  system one (icon + color), which Xiaomi ignores in dark mode.
- **The generated `res/drawable*/splash.png` densities are no longer referenced on Android** (the
  backdrop is `@drawable/splash_bg`, the logo `splash_logo.png`; the composites still feed iOS).
  `npm run mobile:icons` keeps regenerating them and aapt still packages them (~2.6 MB —
  `shrinkResources` is off): delete them in the script or enable shrinking to reclaim it.
- **iOS launch screen:** Apple always shows the system launch screen (no OEM problem). The
  `LaunchScreen.storyboard` (generated by `cap add ios`) references the `Splash` imageset with
  `scaleAspectFill`; `@capacitor/assets generate --ios` fills it (light + dark from
  `splash.svg`/`splash-dark.svg`) and updates the `Contents.json`.

## System bars follow the in-app theme (status + navigation)

- **The light-grey nav-bar band:** with `targetSdk 36` on Android 15+, edge-to-edge is **enforced** —
  `statusBarColor`/`navigationBarColor` are ignored and the bars render transparent over the page.
  What paints the light-grey band behind the gesture pill / 3-button keys is the system's **nav-bar
  contrast scrim** (`navigationBarContrastEnforced`) — and on Xiaomi/HyperOS (verified Android 16) it
  is a **fixed light band that ignores the icon appearance, the app theme, `theme-color` meta, and CSS
  `color-scheme`** (verified empirically: white icons + light band; a plain black WebView page still
  gets the band; even Rekup, another Capacitor app, shows it). The scrim sits on top of the app content
  (dark page + ~80% white scrim = the grey band).
- **`@capacitor/status-bar` is NOT enough:** its `setStyle` only flips the **status** bar icons
  (`setAppearanceLightStatusBars` — verified in the capacitor-plugins source); the navigation bar keeps
  the theme-derived appearance. And on Android 16+ its `backgroundColor`/`overlaysWebView` are dead
  (edge-to-edge enforced).
- **Fix:** app-local `SystemBarsPlugin` (`android/app/src/main/java/com/soiquit/app/`) with one
  `setTheme({ dark })` method — two independent levers:
  - `WindowInsetsControllerCompat.setAppearanceLightStatusBars/NavigationBars(!dark)` — flips the
    **icon** color on both bars (the OS's own uiMode is irrelevant once this runs).
  - `window.setNavigationBarContrastEnforced(false)` (API 29+) — kills the **scrim**, letting the app's
    own background show through (this is the actual band fix on Android 15+; without it the dark page
    keeps a light band no matter what the icons/theme do).
  - `setStatusBarColor`/`setNavigationBarColor` to the app surfaces (`#0F0E0D`/`#F7F6F3`) **below
    Android 15** where solid bars still apply.
- **Theme gotcha:** `BridgeActivity.onCreate` calls `setTheme(R.style.AppTheme_NoActionBar)` (Capacitor's
  own style — parent `Theme.AppCompat.NoActionBar`), overriding the manifest theme on MainActivity at
  runtime. `values-night/styles.xml` (dark `AppTheme.NoActionBarLaunch` + dark `windowBackground` via
  `drawable-night/splash_bg.xml`) therefore only affects `SplashActivity` (a plain Activity) — keep it
  for the dark launch backdrop, don't expect it to theme the WebView window.
- **App-local plugins are NOT auto-discovered** (auto-discovery covers node_modules plugins via
  `assets/capacitor.plugins.json` generated by cap sync) — register explicitly in `MainActivity.onCreate`
  **before** `super.onCreate`: `registerPlugin(SystemBarsPlugin.class)`. No `cap sync` needed for
  app-local Java (compiled by gradle directly).
- **Calling a custom plugin from JS:** v8 has no public `Capacitor.Plugins` — use
  `registerPlugin<SystemBars>('SystemBars')` from `@capacitor/core`. Guard with
  `Capacitor.isNativePlatform()` + `Capacitor.isPluginAvailable('SystemBars')` (false on iOS — the
  plugin isn't registered there, so the wrapper is an Android-only no-op). Wrapper:
  `app/utils/system-bars.ts`; watcher: `app/plugins/system-bars.client.ts` (client plugin watching
  `useColorMode().value`, applies on boot + every change).
- **iOS: no band, but the status bar text needs the same sync.** iOS has no nav-bar contrast scrim —
  the home indicator auto-contrasts and the app content shows through behind it, so there is no
  "light-grey band" class of bug. The only lever is the **status bar text style**, which does NOT
  follow the in-app theme: a dark page keeps the default dark status text (unreadable).
  `applySystemBarTheme` branches on `Capacitor.getPlatform() === 'ios'` and calls
  `StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })` via **@capacitor/status-bar** (works
  on iOS; on Android 15+ it's dead for the nav bar, which is why Android uses the app-local plugin).
  Keep the Info.plist `UIViewControllerBasedStatusBarAppearance = true` — that is what lets the plugin
  control the style. Re-run `npx cap sync` after touching the plugin list (StatusBar is a node_modules
  plugin, auto-discovered).

## Haptics & Sentry

- `app/utils/haptics.ts` wraps `@capacitor/haptics` behind the same native guard as notifications
  (browser = silent no-op). Feedback map: **light** on tab presses (`pointerdown`), **medium** on
  primary confirmations (wizard confirm, savings save, opt-in Enable, exact-alarm Go-to-settings,
  ConfirmDialog confirm — delete/relapse, add-custom-habit, empty-state CTA), **success** notification
  feedback when a milestone celebration is queued (watcher on the queue in `app/pages/index.vue`).
- Sentry is **opt-in**: `NUXT_PUBLIC_SENTRY_DSN` feeds `runtimeConfig.public.sentryDsn`; without a DSN
  `plugins/sentry.client.ts` returns early (no SDK init, no network). The Vue integration installs the
  global error handler; `components/ui/ErrorBoundary.vue` wraps `<NuxtPage />` in the layout — render
  crashes show a branded fallback (+ reload) and report once (`errorCaptured` returns `false` to stop
  bubbling). Note: the SDK still ships in the bundle without a DSN.

## Release signing & app id

- `appId com.soiquit.app` is a placeholder — confirm before Play Store / App Store release.
  `com.soiquit.dev` is the dev-loop variant (see `docs/build-and-release.md`).
- `android/app/build.gradle` signs the `release` variant **only** when `android/keystore.properties`
  exists (gitignored; CI writes it from secrets) — otherwise the APK/AAB is unsigned and sideload fails
  with "package appears to be invalid" (that's the preview variant's job).
