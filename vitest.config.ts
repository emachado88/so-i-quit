import AutoImport from 'unplugin-auto-import/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    vue(),
    // Vue auto-imports (ref, computed, onMounted, ...) at transform time —
    // vitest has no Nuxt auto-imports, so components can rely on them the
    // same way they do in the app.
    AutoImport({ imports: ['vue'], dts: false }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
