<script setup lang="ts">
// Explicit import (not the Nuxt auto-import): layouts are never mounted in
// vitest, but the project convention keeps component imports explicit.
import UpdateBanner from '../components/updates/UpdateBanner.vue'
</script>

<template>
  <div
    class="flex h-full flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)]"
  >
    <!--
      Fixed-height shell: the document never scrolls (see main.css). The page
      fills the space between the top safe area and the TabBar reservation and
      owns its own scroll area — page chrome (title, chips, pinned card) stays
      put while the content moves. The TabBar stays `fixed`, so its room is
      reserved on `main` as padding: everything inside `main` is already clear
      of it, and a page's bottom bar (the pinned savings card) lands exactly on
      the tab bar. 4rem is the bar's own height; pages add their own breathing
      room inside their scroll area.

      The safe-area top padding sits on the shell (not `main`) because the
      update banner is the first flex item — it must start below the status
      bar. It is in-flow (not fixed) on purpose: no overlay z-index ties, and
      it never covers the TabBar or a page snackbar.
    -->
    <UpdateBanner />
    <main
      class="min-h-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))]"
    >
      <!-- Render-error boundary: page crashes show a branded fallback
           (and report to Sentry when a DSN is configured) instead of a
           blank screen; the shell + TabBar stay intact. -->
      <ErrorBoundary>
        <NuxtPage />
      </ErrorBoundary>
    </main>
    <TabBar />
  </div>
</template>
