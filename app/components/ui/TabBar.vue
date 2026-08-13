<script setup lang="ts">
import { ListChecks, Settings, TrendingUp } from 'lucide-vue-next'

import { impact, ImpactStyle } from '../../utils/haptics'

const localePath = useLocalePath()
const route = useRoute()

interface Tab {
  label: string
  path: string
  icon: unknown
}

const tabs: Tab[] = [
  { label: 'tabs.progress', path: '/', icon: markRaw(TrendingUp) },
  { label: 'tabs.habits', path: '/habits', icon: markRaw(ListChecks) },
  { label: 'tabs.settings', path: '/settings', icon: markRaw(Settings) },
]

const isActive = (path: string): boolean => {
  const to = localePath(path)
  // Home is the locale default root — exact match only, so /habits
  // never highlights it.
  return path === '/' ? route.path === to : route.path.startsWith(to)
}

// The sliding pill sits under the active tab: 1/3 of the bar (flex-1 × 3),
// translated by its index so it glides between positions on tab switch.
const activeIndex = computed(() => {
  const index = tabs.findIndex(tab => isActive(tab.path))
  return index === -1 ? 0 : index
})
</script>

<template>
  <nav
    class="fixed bottom-0 z-50 w-full border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur"
  >
    <!-- Sliding active-tab indicator: a soft pill that glides between tabs.
         The 1/3-wide track translates by tab index; the pill visual inside
         carries the margins so the translate stays cell-aligned. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-y-1.5 left-0 w-1/3 transition-transform duration-300 ease-out motion-reduce:transition-none"
      :style="{ transform: `translateX(${activeIndex * 100}%)` }"
    >
      <div class="mx-2 h-full rounded-xl bg-primary/10" />
    </div>
    <ul class="relative flex items-stretch">
      <li
        v-for="tab in tabs"
        :key="tab.label"
        class="flex-1"
      >
        <NuxtLink
          :to="localePath(tab.path)"
          class="flex flex-col items-center gap-0.5 px-4 py-2.5 text-[11px] font-medium text-muted transition-colors"
          :class="isActive(tab.path) ? 'text-primary' : ''"
          @pointerdown="impact(ImpactStyle.Light)"
        >
          <component
            :is="tab.icon"
            class="h-5 w-5 shrink-0"
          />
          {{ $t(tab.label) }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
