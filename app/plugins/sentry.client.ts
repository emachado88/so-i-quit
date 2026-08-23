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

// Header / config keys that must never leave the device.
const SENSITIVE_KEY_RE
  = /^(authorization|cookie|set-cookie|token|api[_-]?key|secret|password|passwd)$/i

// localStorage-derived user content that may carry habit names / strings.
const PII_KEY_RE
  = /^(habit(s)?|name|user(name)?|email|note(s)?|title|comment|description|label)$/i

/**
 * Recursively walk a value and replace sensitive / PII keys with `[redacted]`.
 * Defensive by design: tolerates undefined, primitives, arrays, and plain
 * objects, and never throws on unexpected shapes.
 */
function scrub(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => scrub(item))
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>)) {
      const v = (value as Record<string, unknown>)[key]
      if (SENSITIVE_KEY_RE.test(key) || PII_KEY_RE.test(key)) {
        out[key] = '[redacted]'
      }
      else {
        out[key] = scrub(v)
      }
    }
    return out
  }
  return value
}

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
    // Tag events with the app version so issues can be pinned to a release.
    // Cast to satisfy the public-config type if it lags nuxt prepare.
    release: useRuntimeConfig().public.appVersion as string | undefined,
    // Only accept events whose origin matches the app so third-party frames /
    // injected scripts can't pump noise into the project.
    allowUrls: [/localhost/, /capacitor/, /127\.0\.0\.1/],
    beforeSend(event) {
      if (event.request) {
        if (event.request.headers) {
          event.request.headers = scrub(event.request.headers) as typeof event.request.headers
        }
        if (event.request.cookies) {
          event.request.cookies
            = '[redacted]' as unknown as typeof event.request.cookies
        }
        if (event.request.data) {
          event.request.data = scrub(event.request.data) as typeof event.request.data
        }
        if (
          event.request.query_string
          && typeof event.request.query_string !== 'string'
        ) {
          event.request.query_string = scrub(
            event.request.query_string,
          ) as typeof event.request.query_string
        }
      }
      if (Array.isArray(event.breadcrumbs)) {
        for (const crumb of event.breadcrumbs) {
          if (crumb?.data) {
            crumb.data = scrub(crumb.data) as typeof crumb.data
          }
          // Breadcrumb messages can surface habit names / localStorage content.
          if (
            crumb?.message
            && /habit|localStorage/i.test(crumb.message)
          ) {
            crumb.message = '[redacted]'
          }
        }
      }
      return event
    },
  })
})
