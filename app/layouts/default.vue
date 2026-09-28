<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!--
      Fixed-height shell: the document never scrolls (see main.css). The page
      fills the space between the top safe area and the TabBar reservation and
      owns its own scroll area — page chrome (title, chips, pinned card) stays
      put while the content moves. The TabBar stays `fixed`, so its room is
      reserved here as padding: everything inside `main` is already clear of
      it, and a page's bottom bar (the pinned savings card) lands exactly on
      the tab bar. 4rem is the bar's own height; pages add their own breathing
      room inside their scroll area.
    -->
    <main
      class="min-h-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)]"
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
