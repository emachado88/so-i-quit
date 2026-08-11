import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-10',
  app: {
    head: {
      // viewport-fit=cover → Capacitor keeps the WebView edge-to-edge (no
      // native margins); the shell offsets content with env(safe-area-inset-*).
      viewport:
        'width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content',
    },
  },
  modules: ['@nuxtjs/i18n', '@nuxtjs/color-mode', '@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  // Component names without directory prefixes (TabBar, HabitCard, ...) —
  // every component name in this app is unique.
  components: [{ path: '~/components', pathPrefix: false }],
  vite: {
    plugins: [tailwindcss()],
  },
  // Always mobile (user decision) — pure SPA, no SSR anywhere.
  ssr: false,
  colorMode: {
    preference: 'system',
    fallback: 'light',
    // localStorage: WebView resets cookies on restart
    storage: 'localStorage',
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
  fonts: {
    families: [
      { name: 'Inter', provider: 'google', weights: [400, 500, 600, 700, 800, 900] },
    ],
  },
  // CF preset emits dist/ (needed as Capacitor webDir)
  nitro: {
    preset: 'cloudflare_pages',
  },
  // Sentry is opt-in: set NUXT_PUBLIC_SENTRY_DSN at build time to enable.
  // Without a DSN the sentry plugin is a no-op (see plugins/sentry.client.ts).
  runtimeConfig: {
    public: {
      sentryDsn: '',
    },
  },
})
