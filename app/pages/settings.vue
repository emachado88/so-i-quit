<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useLocaleSwitch } from '../composables/useLocaleSwitch'
import { useThemeMode } from '../composables/useThemeMode'
import CurrencyPicker from '../components/settings/CurrencyPicker.vue'
import LangPicker from '../components/settings/LangPicker.vue'
import NotificationToggle from '../components/settings/NotificationToggle.vue'
import SegmentedTheme from '../components/settings/SegmentedTheme.vue'
import ExactAlarmHint from '../components/notifications/ExactAlarmHint.vue'
import Snackbar from '../components/ui/Snackbar.vue'
import { CURRENCY_SYMBOLS } from '../utils/currencies'
import { getHabits } from '../utils/habits'
import {
  addAppForegroundListener,
  cancelAllMilestoneNotifications,
  checkExactNotificationSetting,
  getNotificationPermissionStatus,
  reconcileAllHabitNotifications,
  requestNotificationPermission,
  type NotificationPermissionStatus,
} from '../utils/notifications'
import {
  getSettings,
  LANGUAGE_NAMES,
  saveCurrency,
  saveLanguage,
  saveMilestoneNotificationsEnabled,
  saveTheme,
  type SupportedLanguage,
} from '../utils/settings'
import type { AppSettings, Theme } from '../utils/types'

const { t, locale } = useI18n()
const themeMode = useThemeMode()
const localeSwitch = useLocaleSwitch()

// ── State ──

const settings = ref<AppSettings>(getSettings())
const langPickerOpen = ref(false)
const currencyPickerOpen = ref(false)
const notificationsDenied = ref(false)
const exactAlarmDenied = ref(false)
const snackbarMessage = ref<string | null>(null)
/** OS-level notification permission; null while unknown (browser). */
const osPermission = ref<NotificationPermissionStatus | null>(null)

const refresh = (): void => {
  settings.value = getSettings()
}
onMounted(refresh)

// ── OS permission sync ──

/**
 * Keep the toggle in sync with the OS-level permission: re-check whenever
 * the screen mounts or the app returns to the foreground (e.g. the user
 * toggled notifications in system settings and came back). When the OS
 * permission is revoked while the preference is on, pending schedules are
 * dead — cancel them. Restored later: reconcile rebuilds everything
 * (RN parity).
 */
let previousOsPermission: NotificationPermissionStatus | null = null

const refreshOsPermission = async (): Promise<void> => {
  const enabled = getSettings().milestoneNotificationsEnabled
  try {
    const status = await getNotificationPermissionStatus()
    osPermission.value = status
    if (status === 'denied' && enabled && previousOsPermission !== 'denied') {
      await cancelAllMilestoneNotifications()
    }
    else if (
      status !== 'denied'
      && enabled
      && previousOsPermission === 'denied'
    ) {
      await reconcileAllHabitNotifications(getHabits(), t, new Date())
    }
    previousOsPermission = status

    // Exact alarms (Android 12+ special access) — hint only when the user
    // opted in and the OS blocks exact scheduling.
    exactAlarmDenied.value
      = enabled && !(await checkExactNotificationSetting())
  }
  catch {
    // Permission API unavailable (e.g. web) — leave state untouched.
  }
}

onMounted(() => {
  void refreshOsPermission()
  // Native app lifecycle: re-check the OS permission every time the app
  // returns to the foreground (e.g. the user toggled notifications in
  // system settings and came back). `visibilitychange` is unreliable in
  // the WebView — DOM visibility doesn't change on app background.
  foregroundSub = addAppForegroundListener(() => {
    void refreshOsPermission()
  })
})

let foregroundSub: { remove: () => void } | null = null

onUnmounted(() => {
  foregroundSub?.remove()
  foregroundSub = null
})

// ── Appearance ──

const theme = computed<Theme>(() => settings.value.theme)

const setTheme = (value: Theme): void => {
  try {
    saveTheme(value)
    themeMode.setTheme(value)
    refresh()
  }
  catch {
    snackbarMessage.value = t('settings.failedTheme')
  }
}

// ── Language ──

/** Locale code for the picker's current check (e.g. "pt"). */
const currentLanguageCode = computed(() => locale.value)
/** Native display name for the row (e.g. "Português"). */
const currentLanguageLabel = computed(
  () => LANGUAGE_NAMES[locale.value as SupportedLanguage] ?? locale.value,
)

const setLanguage = (code: SupportedLanguage): void => {
  try {
    saveLanguage(code)
    localeSwitch.setLocale(code)
    langPickerOpen.value = false
  }
  catch {
    snackbarMessage.value = t('settings.failedLanguage')
  }
}

// ── Currency ──

const currency = computed(() => settings.value.currency)
const currencyLabel = computed(() => {
  const code = settings.value.currency
  return `${CURRENCY_SYMBOLS[code] ?? code} ${code}`
})

const setCurrency = (code: string): void => {
  try {
    saveCurrency(code)
    currencyPickerOpen.value = false
    refresh()
  }
  catch {
    snackbarMessage.value = t('settings.failedCurrency')
  }
}

// ── Milestone notifications ──

/**
 * Effective toggle state: the preference AND the OS permission. When the
 * user revokes notifications in system settings, the toggle shows off even
 * though the stored preference is still on (RN parity — the preference is
 * kept so restoring the OS permission re-enables without re-prompting).
 */
const notificationsEnabled = computed(
  () =>
    settings.value.milestoneNotificationsEnabled
    && osPermission.value !== 'denied',
)

const handleNotificationsToggle = async (): Promise<void> => {
  const next = !notificationsEnabled.value
  notificationsDenied.value = false
  try {
    if (next) {
      const granted = await requestNotificationPermission()
      if (!granted) {
        // Keep the preference disabled; the in-app celebration still works.
        notificationsDenied.value = true
        return
      }
      saveMilestoneNotificationsEnabled(true)
    }
    else {
      await cancelAllMilestoneNotifications()
      saveMilestoneNotificationsEnabled(false)
      exactAlarmDenied.value = false
    }
    refresh()
    void refreshOsPermission()
  }
  catch {
    snackbarMessage.value = t('settings.failedNotifications')
  }
}
</script>

<template>
  <main class="flex flex-col gap-4 px-4 py-6">
    <h1 class="text-2xl font-black tracking-tight text-ink">
      {{ t('tabs.settings') }}
    </h1>

    <section class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div class="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
        <span class="text-sm font-semibold text-ink">
          {{ t('settings.appearance') }}
        </span>
        <SegmentedTheme
          class="ml-auto"
          :value="theme"
          @change="setTheme"
        />
      </div>

      <div class="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
        <span class="text-sm font-semibold text-ink">
          {{ t('settings.language') }}
        </span>
        <button
          type="button"
          :aria-label="t('settings.openLanguagePicker')"
          class="ml-auto flex items-center gap-1.5 text-[13.5px] font-semibold text-muted"
          @click="langPickerOpen = true"
        >
          {{ currentLanguageLabel }}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          ><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>

      <div class="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
        <span class="text-sm font-semibold text-ink">
          {{ t('settings.currency') }}
        </span>
        <button
          type="button"
          :aria-label="t('settings.openCurrencyPicker')"
          class="ml-auto flex items-center gap-1.5 text-[13.5px] font-semibold text-muted"
          @click="currencyPickerOpen = true"
        >
          {{ currencyLabel }}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          ><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>

      <div class="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
        <span class="text-sm font-semibold text-ink">
          {{ t('settings.milestoneNotifications') }}
        </span>
        <NotificationToggle
          class="ml-auto"
          :enabled="notificationsEnabled"
          @toggle="handleNotificationsToggle"
        />
      </div>
      <p
        v-if="notificationsDenied"
        class="border-t border-border px-4 pb-3.5 pt-3 text-xs leading-relaxed text-muted"
      >
        {{ t('settings.milestoneNotificationsDenied') }}
      </p>
      <ExactAlarmHint v-if="exactAlarmDenied" />
    </section>

    <section class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div class="flex items-center gap-3 px-4 py-3.5">
        <span class="text-sm font-semibold text-ink">So I Quit</span>
        <span class="ml-auto text-[13.5px] font-semibold text-muted">v0.2.0</span>
      </div>
    </section>

    <LangPicker
      :visible="langPickerOpen"
      :current="currentLanguageCode"
      @select="setLanguage"
      @dismiss="langPickerOpen = false"
    />
    <CurrencyPicker
      :visible="currencyPickerOpen"
      :current="currency"
      @select="setCurrency"
      @dismiss="currencyPickerOpen = false"
    />
    <Snackbar
      :message="snackbarMessage"
      @dismiss="snackbarMessage = null"
    />
  </main>
</template>
