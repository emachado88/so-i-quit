<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useLocaleSwitch } from '../composables/useLocaleSwitch'
import { useThemeMode } from '../composables/useThemeMode'
import CurrencyPicker from '../components/settings/CurrencyPicker.vue'
import LangPicker from '../components/settings/LangPicker.vue'
import NotificationToggle from '../components/settings/NotificationToggle.vue'
import SegmentedTheme from '../components/settings/SegmentedTheme.vue'
import Snackbar from '../components/ui/Snackbar.vue'
import { CURRENCY_SYMBOLS } from '../utils/currencies'
import {
  cancelAllMilestoneNotifications,
  requestNotificationPermission,
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
const snackbarMessage = ref<string | null>(null)

const refresh = (): void => {
  settings.value = getSettings()
}
onMounted(refresh)

// ── Appearance ──

const theme = computed<Theme>(() => settings.value.theme)

const setTheme = (value: Theme): void => {
  try {
    saveTheme(value)
    themeMode.setTheme(value)
    refresh()
  } catch {
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
  } catch {
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
  } catch {
    snackbarMessage.value = t('settings.failedCurrency')
  }
}

// ── Milestone notifications ──

const notificationsEnabled = computed(
  () => settings.value.milestoneNotificationsEnabled,
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
    } else {
      await cancelAllMilestoneNotifications()
      saveMilestoneNotificationsEnabled(false)
    }
    refresh()
  } catch {
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6" /></svg>
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6" /></svg>
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
    <Snackbar :message="snackbarMessage" @dismiss="snackbarMessage = null" />
  </main>
</template>
