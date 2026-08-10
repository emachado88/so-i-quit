<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { addNotificationTapListener } from './utils/notifications'

const router = useRouter()
const { locale } = useI18n()

// Milestone notification taps: route to the Progress screen (the index).
// The Android plugin delivers the tap on cold starts too (the launch intent
// action is retained until this listener registers).
let removeTapListener: (() => void) | null = null

onMounted(() => {
  removeTapListener = addNotificationTapListener(() => {
    const prefix = locale.value === 'en' ? '' : `/${locale.value}`
    router.push(prefix === '' ? '/' : prefix)
  }).remove
})

onUnmounted(() => {
  removeTapListener?.()
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
