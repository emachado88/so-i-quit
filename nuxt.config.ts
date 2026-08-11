import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n', '@nuxtjs/color-mode', '@nuxt/fonts', '@nuxt/eslint'],
  // Always mobile (user decision) — pure SPA, no SSR anywhere.
  ssr: false,
  // Component names without directory prefixes (TabBar, HabitCard, ...) —
  // every component name in this app is unique.
  components: [{ path: '~/components', pathPrefix: false }],
  app: {
    head: {
      // viewport-fit=cover → Capacitor keeps the WebView edge-to-edge (no
      // native margins); the shell offsets content with env(safe-area-inset-*).
      // maximum-scale=1 + user-scalable=no → no pinch/double-tap zoom. Safari
      // ignores these since iOS 10, but WKWebView (Capacitor) honors them —
      // without them the app is pinch-zoomable. (See also touch-action:
      // manipulation in main.css, which kills the double-tap zoom gesture.)
      viewport:
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content',
    },
  },
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'system',
    fallback: 'light',
    // localStorage: WebView resets cookies on restart
    storage: 'localStorage',
  },

  // Sentry is opt-in: set NUXT_PUBLIC_SENTRY_DSN at build time to enable.
  // Without a DSN the sentry plugin is a no-op (see plugins/sentry.client.ts).
  runtimeConfig: {
    public: {
      sentryDsn: '',
    },
  },
  compatibilityDate: '2026-08-10',
  // CF preset emits dist/ (needed as Capacitor webDir)
  nitro: {
    preset: 'cloudflare_pages',
  },
  vite: {
    plugins: [tailwindcss()],
  },

  eslint: { config: { stylistic: true } },
  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700, 800, 900] },
    ],
  },
  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'en',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'pt', name: 'Português', file: 'pt.json' },
      { code: 'fr', name: 'Français', file: 'fr.json' },
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'it', name: 'Italiano', file: 'it.json' },
      { code: 'zh', name: '中文', file: 'zh.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' },
      { code: 'nl', name: 'Nederlands', file: 'nl.json' },
    ],
    langDir: '../app/i18n/locales',
    // Locale detection/restore is the i18n-persist plugin's job (localStorage,
    // WebView-safe). The module's own detection uses a cookie, which the
    // Capacitor WebView drops on restart.
    detectBrowserLanguage: false,
  },
})
