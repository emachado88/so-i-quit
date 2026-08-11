import AutoImport from 'unplugin-auto-import/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    vue(),
    // Vue auto-imports (ref, computed, onMounted, ...) at transform time —
    // vitest has no Nuxt auto-imports, so components can rely on them the
    // same way they do in the app.
    //
    // Nuxt-only composables used inside components under test (TabBar's
    // useLocalePath/useRoute) resolve from the real `nuxt/app` module and
    // are vi.mocked per test file.
    AutoImport({
      imports: ['vue', { 'nuxt/app': ['useLocalePath', 'useRoute'] }],
      dts: false,
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      // Gate: enforced on every `npm test` run (as in the RN app).
      enabled: true,
      provider: 'v8',
      reporter: ['text'],
      // Measure the app only — tests and locale data are not product code.
      exclude: ['tests/**', 'app/i18n/locales/**'],
      thresholds: {
        statements: 80,
        lines: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
})
