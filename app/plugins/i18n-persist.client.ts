import {
  getLanguage,
  saveLanguage,
  type SupportedLanguage,
} from '../utils/settings'

/**
 * Locale persistence for the always-mobile build.
 *
 * With `prefix_except_default` the active locale lives in the URL, and the
 * Capacitor WebView boots at the root URL on every launch — without a
 * localStorage mirror the language would reset to the default on each start.
 *
 * Boot: navigate to the saved locale's prefix (first run: the detected
 * device language). Change: persist the new locale to settings-v1.
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const i18n = nuxtApp.$i18n
  const switchLocalePath = useSwitchLocalePath()
  const route = useRoute()

  // Persist every locale change (settings picker, prefix navigation).
  watch(
    () => i18n.locale.value,
    (locale) => {
      if (locale) saveLanguage(locale)
    },
  )

  // Restore on boot: the WebView always boots at the root URL, so only
  // redirect when arriving there and the saved/detected locale differs.
  // (settings only ever produces a supported code.)
  const saved = getLanguage() as SupportedLanguage
  const current = i18n.locale.value
  if (saved && saved !== current && route.path === '/') {
    const target = switchLocalePath(saved)
    if (target && target !== route.path) {
      // Awaiting inside an async plugin defers the app mount until the
      // redirect lands — no flash of the default locale.
      // `replace` (not push): the boot URL is transient — keeping it in
      // history would make the first hardware-back press bounce back to
      // the root instead of exiting the app.
      await navigateTo(target, { replace: true })
    }
  }
})
