<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import {
  addBackButtonListener,
  exitApp,
  handleBackButton,
} from './utils/back-handler'
import { addNotificationTapListener } from './utils/notifications'

const router = useRouter()
const { locale } = useI18n()

useHead({
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  ],
})

// Milestone notification taps: route to the Progress screen (the index).
// The Android plugin delivers the tap on cold starts too (the launch intent
// action is retained until this listener registers).
let removeTapListener: (() => void) | null = null
let removeBackListener: (() => void) | null = null

onMounted(() => {
  removeTapListener = addNotificationTapListener(() => {
    const prefix = locale.value === 'en' ? '' : `/${locale.value}`
    router.push(prefix === '' ? '/' : prefix)
  }).remove

  // Hardware back (Android): open overlays (modals, wizard) get first
  // chance via the handler stack, then the router history (tabs), then
  // exit. Without this listener the WebView falls back to the OS default,
  // which backgrounds the app even when the router can go back.
  removeBackListener = addBackButtonListener((canGoBack) => {
    if (handleBackButton()) return
    if (canGoBack) {
      router.back()
    }
    else {
      void exitApp()
    }
  }).remove
})

onUnmounted(() => {
  removeTapListener?.()
  removeBackListener?.()
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
  </NuxtLayout>
</template>
