import { init as initSentry, vueIntegration } from '@sentry/vue'

/**
 * Sentry error tracking — opt-in via NUXT_PUBLIC_SENTRY_DSN.
 *
 * The app is local-only with no backend, so Sentry is off by default: without
 * a DSN in the public runtime config this plugin does nothing and the app
 * behaves exactly as before (no network calls, no error handler swap). Set
 * NUXT_PUBLIC_SENTRY_DSN at build time to enable.
 *
 * The Vue integration installs Vue's global error handler and captures
 * component render errors automatically; ErrorBoundary.vue handles the
 * user-facing fallback and adds context for the captured error.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const {
    public: { sentryDsn },
  } = useRuntimeConfig()

  // Fresh type info for the public config may lag behind nuxt prepare; cast
  // the env-fed value explicitly.
  const dsn = sentryDsn as string | undefined

  if (!dsn) return

  initSentry({
    app: nuxtApp.vueApp,
    dsn,
    environment: import.meta.dev ? 'development' : 'production',
    integrations: [vueIntegration()],
  })
})
