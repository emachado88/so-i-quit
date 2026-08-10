import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-08-10',
  modules: ['@nuxtjs/i18n', '@nuxtjs/color-mode', '@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
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
    locales: [{ code: 'en', name: 'English', file: 'en.json' }],
    langDir: '../app/i18n/locales',
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
})
