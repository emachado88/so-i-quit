import { describe, expect, it } from 'vitest'
import en from '../app/i18n/locales/en.json'

describe('scaffold smoke', () => {
  it('en.json carries the full flat key set from the RN app', () => {
    const keys = Object.keys(en)
    expect(keys.length).toBeGreaterThanOrEqual(80)
    for (const key of [
      'tabs.progress',
      'habits.logRelapse',
      'milestone.next',
      'savings.skip',
      'common.cancel',
    ]) {
      expect(keys).toContain(key)
    }
    for (const value of Object.values(en)) {
      expect(typeof value).toBe('string')
    }
    // vue-i18n interpolation is {name}, not mustache {{name}} — the compiler
    // rejects nested placeholders. Regression guard for the RN port.
    for (const value of Object.values(en)) {
      expect(value).not.toContain('{{')
    }
  })
})
