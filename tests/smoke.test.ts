import { describe, expect, it } from 'vitest'
import de from '../app/i18n/locales/de.json'
import en from '../app/i18n/locales/en.json'
import es from '../app/i18n/locales/es.json'
import fr from '../app/i18n/locales/fr.json'
import itLocale from '../app/i18n/locales/it.json'
import nl from '../app/i18n/locales/nl.json'
import pt from '../app/i18n/locales/pt.json'
import zh from '../app/i18n/locales/zh.json'

/** en.json is the base — every locale must carry exactly its key set. */
const LOCALES = { de, en, es, fr, it: itLocale, nl, pt, zh }

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

  it('every locale carries the same key set as en.json', () => {
    const base = Object.keys(en).sort()
    for (const [code, messages] of Object.entries(LOCALES)) {
      expect(Object.keys(messages).sort(), `${code}.json key drift`).toEqual(base)
    }
  })
})
