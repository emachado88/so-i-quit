<template>
  <div class="min-h-dvh">
    <main
      class="pb-[calc(5rem+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)]"
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
