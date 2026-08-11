export default {
  // TS + Vue app code (and this config's own file type) — eslint handles
  // formatting via @nuxt/eslint stylistic. Locale JSONs are validated by the
  // smoke test, not eslint.
  '*.{ts,vue,mjs}': 'eslint --fix',
}
