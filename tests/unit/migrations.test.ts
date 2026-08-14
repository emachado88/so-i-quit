import { describe, expect, it } from 'vitest'

import { applyMigrations, MIGRATIONS } from '../../app/utils/migrations'
import { STORAGE_KEYS } from '../../app/utils/storage'

describe('utils/migrations', () => {
  it('has a baseline migration for every storage key', () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(MIGRATIONS[key]).toBeDefined()
      expect(MIGRATIONS[key][0]).toEqual({ from: 1, up: expect.any(Function) })
    }
  })

  it('baseline is identity for every storage key', () => {
    const data = { habits: [{ id: 'h1' }], nested: { ok: true } }
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(applyMigrations(key, data)).toBe(data)
    }
  })

  it('passes unknown keys through untouched', () => {
    const data = { anything: 1 }
    expect(applyMigrations('unknown-key', data)).toBe(data)
  })

  it('applies migrations in ascending `from` order', () => {
    const seen: string[] = []
    MIGRATIONS.habits.push(
      {
        from: 2,
        up: (d) => {
          seen.push('two')
          return d
        },
      },
      {
        from: 3,
        up: (d) => {
          seen.push('three')
          return d
        },
      },
    )
    applyMigrations(STORAGE_KEYS.habits, {})
    expect(seen).toEqual(['two', 'three'])
    MIGRATIONS.habits.length = 1
  })
})
