import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    vue(),
    // Vue API auto-imports for the test pipeline — mirrors Nuxt's own
    // auto-imports so components don't need explicit `import { ref } from
    // 'vue'` to be testable (Nuxt injects them in the app; vitest doesn't).
    AutoImport({
      imports: ['vue'],
      dts: false,
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
