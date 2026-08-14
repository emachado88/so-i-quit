<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useLocaleSwitch } from '../composables/useLocaleSwitch'
import { useExactAlarmPrompt } from '../composables/useExactAlarmPrompt'
import { useThemeMode } from '../composables/useThemeMode'
import CurrencyPicker from '../components/settings/CurrencyPicker.vue'
import LangPicker from '../components/settings/LangPicker.vue'
import NotificationToggle from '../components/settings/NotificationToggle.vue'
import SegmentedTheme from '../components/settings/SegmentedTheme.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import ExactAlarmHint from '../components/notifications/ExactAlarmHint.vue'
import ExactAlarmDialog from '../components/notifications/ExactAlarmDialog.vue'
import Snackbar from '../components/ui/Snackbar.vue'
import { CURRENCY_SYMBOLS } from '../utils/currencies'
import {
  backupFilename,
  exportBackupNative,
  isNativeBackupPlatform,
} from '../utils/backup-platform'
import {
  buildBackup,
  exportToFile,
  importBackup,
  parseBackup,
  type BackupFile,
} from '../utils/backup'
import { getHabits } from '../utils/habits'
import {
  addAppForegroundListener,
  cancelAllMilestoneNotifications,
  checkExactNotificationSetting,
  getNotificationPermissionStatus,
  openExactNotificationSettings,
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
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../utils/settings'
import type { AppSettings, Theme } from '../utils/types'

const { t, locale } = useI18n()
// App version injected by Nuxt from package.json — single source of truth.
const version = useRuntimeConfig().public.appVersion
const themeMode = useThemeMode()
const localeSwitch = useLocaleSwitch()

// ── State ──

const settings = ref<AppSettings>(getSettings())
const langPickerOpen = ref(false)
const currencyPickerOpen = ref(false)
const notificationsDenied = ref(false)
const exactAlarmDenied = ref(false)
/**
 * The exact-alarm re-ask dialog (Android 12+ special access). Same pattern
 * as the habit opt-in in habits.vue — but backed by a module-level
 * singleton (useExactAlarmPrompt) so a page re-creation mid-import cannot
 * lose the queued re-ask.
 */
const { visible: exactAlarmVisible } = useExactAlarmPrompt()

/**
 * The import chain is async (OS permission → reconcile → check) — if the
 * page is re-created mid-chain (e.g. the imported backup carries a
 * different language and `setLocale` navigates), the ref write lands on
 * the dead instance. A sessionStorage flag survives the remount so the
 * re-ask re-surfaces on the new page's mount.
 */
const PENDING_EXACT_REASK = 'pending-exact-reask'

const queueExactReask = async (): Promise<void> => {
  if (!(await checkExactNotificationSetting())) {
    exactAlarmVisible.value = true
    sessionStorage.setItem(PENDING_EXACT_REASK, '1')
  }
}

const clearExactReask = (): void => {
  exactAlarmVisible.value = false
  sessionStorage.removeItem(PENDING_EXACT_REASK)
}
const snackbarMessage = ref<string | null>(null)
const snackbarSuccess = ref(false)

/** Show a snackbar; `success` renders the positive (green) variant. */
const showSnackbar = (message: string, success = false): void => {
  snackbarMessage.value = message
  snackbarSuccess.value = success
}

const dismissSnackbar = (): void => {
  snackbarMessage.value = null
  snackbarSuccess.value = false
}
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

onMounted(async () => {
  void refreshOsPermission()
  // A re-ask queued by an import whose page was re-created mid-chain
  // (locale switch / navigation) — re-surface it now that we're mounted.
  if (sessionStorage.getItem(PENDING_EXACT_REASK)) {
    sessionStorage.removeItem(PENDING_EXACT_REASK)
    if (
      getSettings().milestoneNotificationsEnabled
      && !(await checkExactNotificationSetting())
    ) {
      exactAlarmVisible.value = true
    }
  }
  // Native app lifecycle: re-check the OS permission every time the app
  // returns to the foreground (e.g. the user toggled notifications in
  // system settings and came back). `visibilitychange` is unreliable in
  // the WebView — DOM visibility doesn't change on app background.
  foregroundSub = addAppForegroundListener(() => {
    void refreshOsPermission()
    void handleExactAlarmForeground()
  })
})

let foregroundSub: { remove: () => void } | null = null

onUnmounted(() => {
  foregroundSub?.remove()
  foregroundSub = null
})

// ── Data backup (export / import) ──

const importPending = ref<BackupFile | null>(null)
const importDialogOpen = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

/**
 * Export the full backup: native share sheet on mobile, download on web.
 */
const handleExport = async (): Promise<void> => {
  try {
    const json = exportToFile(buildBackup())
    if (isNativeBackupPlatform()) {
      await exportBackupNative(json, t('settings.exportShareDialog'))
    }
    else {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = backupFilename()
      link.click()
      URL.revokeObjectURL(url)
    }
    showSnackbar(t('settings.exportDone'), true)
  }
  catch {
    showSnackbar(t('settings.exportFailed'))
  }
}

/** Open the file picker (native picker inside the WebView on mobile). */
const handleImportClick = (): void => {
  fileInputRef.value?.click()
}

/** Read + validate a picked file; nothing is written until confirmed. */
const handleFileChange = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Reset so picking the same file again re-fires the change event.
  input.value = ''
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const parsed = parseBackup(String(reader.result ?? ''))
    if (!parsed.ok) {
      showSnackbar(t('settings.importInvalid'))
      return
    }
    importPending.value = parsed.data
    importDialogOpen.value = true
  }
  reader.onerror = () => {
    showSnackbar(t('settings.importInvalid'))
  }
  reader.readAsText(file)
}

/** Replace all data after the user confirms the dialog. */
const handleImportConfirm = async (): Promise<void> => {
  const data = importPending.value
  importPending.value = null
  importDialogOpen.value = false
  if (!data) return

  try {
    importBackup(data)
    refresh()
    // The imported settings may carry a different theme — the selector
    // reads from the settings ref (now updated), but the live theme only
    // changes via color-mode: apply it explicitly (same gap as the
    // language, which lives in the URL and is synced below).
    themeMode.setTheme(getSettings().theme)
    // The imported settings may carry a different language — the active
    // locale lives in the URL (i18n `prefix_except_default`), not in the
    // settings ref, so switch it explicitly. Guarded: `isAppSettings` only
    // checks that `language` is a string.
    const importedLanguage = getSettings().language
    if (
      importedLanguage !== locale.value
      && (SUPPORTED_LANGUAGES as readonly string[]).includes(importedLanguage)
    ) {
      localeSwitch.setLocale(importedLanguage as SupportedLanguage)
    }
    showSnackbar(t('settings.importDone'), true)
  }
  catch {
    showSnackbar(t('settings.importInvalid'))
    return
  }

  // Notification schedules from the old dataset are now stale (they would
  // fire on habits that no longer exist). Re-validate the imported
  // notification settings against the OS and rebuild — best-effort: a
  // native failure must not flip the "import done" state.
  try {
    await promptNotificationsAfterImport()
  }
  catch {
    // Non-fatal — the data itself is already imported.
  }
}

/**
 * Post-import notification setup — mirrors the habit opt-in flow
 * (habits.vue handleOptInEnable): re-validate the OS permission, rebuild
 * the schedules once confirmed, then surface the exact-alarm re-ask.
 * Every native step is isolated (a failure never kills the chain).
 */
const promptNotificationsAfterImport = async (): Promise<void> => {
  await cancelAllMilestoneNotifications().catch(() => {})

  const enabled = getSettings().milestoneNotificationsEnabled
  if (!enabled) return

  // Fresh installs report 'denied'/'undetermined' (never asked) — request
  // in every non-granted state, then schedule only once the user answered.
  const status = await getNotificationPermissionStatus().catch(
    () => 'undetermined' as const,
  )
  if (status !== 'granted') {
    const granted = await requestNotificationPermission().catch(() => false)
    // Keep the OS-sync state coherent so a later revoke/restore transition
    // in refreshOsPermission fires (cancel / rebuild) as expected.
    osPermission.value = granted ? 'granted' : 'denied'
    previousOsPermission = granted ? 'granted' : 'denied'
    if (!granted) {
      // Preference stays on (RN parity — restoring the OS permission
      // re-enables without re-prompting); surface the hint, schedules stay dead.
      notificationsDenied.value = true
      return
    }
  }

  // Rebuild schedules now that the permission is confirmed.
  await reconcileAllHabitNotifications(getHabits(), t, new Date()).catch(() => {})

  // Android 12+: exact alarms are a separate special access — surface the
  // re-ask right after enabling, exactly like the habit opt-in flow. The
  // sessionStorage flag survives a mid-chain page re-creation.
  await queueExactReask()
}

// ── Exact alarms (Android 12+ special access) ──

const handleExactAlarmSkip = (): void => {
  clearExactReask()
  // Schedules already exist (inexact); the Settings hint remains as fallback.
}

const handleExactAlarmGoSettings = (): void => {
  // Opens the system screen (ACTION_REQUEST_SCHEDULE_EXACT_ALARM); the
  // dialog stays open — the foreground listener re-checks on return.
  void openExactNotificationSettings()
}

/**
 * Re-check after the user returns from system settings. Granted → dismiss
 * and rebuild every schedule (Android keeps already-scheduled alarms
 * inexact — cancel + reconcile re-creates them as exact). Still denied →
 * keep the dialog open so they can retry or skip.
 */
const handleExactAlarmForeground = async (): Promise<void> => {
  if (!exactAlarmVisible.value) return
  try {
    if (await checkExactNotificationSetting()) {
      clearExactReask()
      await cancelAllMilestoneNotifications()
      await reconcileAllHabitNotifications(getHabits(), t, new Date())
    }
  }
  catch {
    // Permission API unavailable — leave the dialog open.
  }
}

// ── Appearance ──

const theme = computed<Theme>(() => settings.value.theme)

const setTheme = (value: Theme): void => {
  try {
    saveTheme(value)
    themeMode.setTheme(value)
    refresh()
  }
  catch {
    showSnackbar(t('settings.failedTheme'))
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
    showSnackbar(t('settings.failedLanguage'))
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
    showSnackbar(t('settings.failedCurrency'))
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
      // Schedule now that the permission is confirmed — without this the
      // milestones would only be scheduled on the next Progress boot.
      await reconcileAllHabitNotifications(getHabits(), t, new Date())
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
    showSnackbar(t('settings.failedNotifications'))
  }
}
</script>

<template>
  <main class="flex flex-col gap-4 px-4 py-6">
    <h1 class="enter-rise text-2xl font-black tracking-tight text-ink">
      {{ t('tabs.settings') }}
    </h1>

    <section
      class="enter-rise overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      :style="{ animationDelay: '45ms' }"
    >
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

    <section
      class="enter-rise overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      :style="{ animationDelay: '90ms' }"
    >
      <div class="flex items-center gap-3 border-b border-border px-4 py-3.5">
        <span class="text-sm font-semibold text-ink">
          {{ t('settings.data') }}
        </span>
      </div>
      <div class="flex items-center gap-2 px-4 py-3.5">
        <button
          type="button"
          class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          @click="handleExport"
        >
          {{ t('settings.exportData') }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-card"
          @click="handleImportClick"
        >
          {{ t('settings.importData') }}
        </button>
        <!-- Opens the native system picker inside the WebView on mobile. -->
        <input
          ref="fileInputRef"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="handleFileChange"
        >
      </div>
      <p
        class="border-t border-border px-4 pb-3.5 pt-3 text-xs leading-relaxed text-muted"
      >
        {{ t('settings.dataDescription') }}
      </p>
    </section>

    <section
      class="enter-rise overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
      :style="{ animationDelay: '135ms' }"
    >
      <div class="flex items-center gap-3 px-4 py-3.5">
        <span class="text-sm font-semibold text-ink">So I Quit</span>
        <span class="ml-auto text-[13.5px] font-semibold text-muted">v{{ version }}</span>
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
    <ConfirmDialog
      :visible="importDialogOpen"
      :title="t('settings.importDialogTitle')"
      :message="t('settings.importDialogMessage')"
      :confirm-label="t('settings.importDialogConfirm')"
      destructive
      @confirm="handleImportConfirm"
      @cancel="importDialogOpen = false"
    />
    <!-- Exact alarms (Android 12+): re-asked after a restore whose settings
         enable notifications while the system denies the special access. -->
    <ExactAlarmDialog
      :visible="exactAlarmVisible"
      @skip="handleExactAlarmSkip"
      @go-settings="handleExactAlarmGoSettings"
    />
    <Snackbar
      :message="snackbarMessage"
      :success="snackbarSuccess"
      @dismiss="dismissSnackbar"
    />
  </main>
</template>
