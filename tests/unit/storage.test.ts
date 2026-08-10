import { describe, expect, it } from 'vitest'

import { STORAGE_KEYS, readJSON, readRaw, removeValue, useStorage, writeJSON } from '../../app/utils/storage'
import { installStorageMock, seedStorage } from '../helpers'

installStorageMock()

describe('utils/storage', () => {
  describe('readJSON/writeJSON', () => {
    it('round-trips objects', () => {
      writeJSON(STORAGE_KEYS.settings, { theme: 'dark', language: 'pt' })
      expect(readJSON(STORAGE_KEYS.settings, {})).toEqual({ theme: 'dark', language: 'pt' })
    })

    it('round-trips arrays', () => {
      writeJSON(STORAGE_KEYS.habits, [{ id: 'h1', name: 'Alcohol', date: null, savings: null }])
      expect(readJSON(STORAGE_KEYS.habits, [])).toEqual([{ id: 'h1', name: 'Alcohol', date: null, savings: null }])
    })

    it('returns the fallback for a missing key', () => {
      expect(readJSON(STORAGE_KEYS.settings, { fallback: true })).toEqual({ fallback: true })
    })

    it('returns the fallback for corrupt JSON', () => {
      seedStorage(STORAGE_KEYS.settings, '{not json')
      expect(readJSON(STORAGE_KEYS.settings, 'default')).toBe('default')
    })

    it('returns the fallback for a stored JSON null', () => {
      seedStorage(STORAGE_KEYS.milestones, 'null')
      expect(readJSON(STORAGE_KEYS.milestones, {})).toEqual({})
    })

    it('readRaw surfaces raw strings and null for missing keys', () => {
      seedStorage('habits', '[]')
      expect(readRaw('habits')).toBe('[]')
      expect(readRaw('nope')).toBeNull()
    })
  })

  describe('removeValue', () => {
    it('removes the key so reads fall back', () => {
      writeJSON(STORAGE_KEYS.habits, [1, 2, 3])
      removeValue(STORAGE_KEYS.habits)
      expect(readJSON(STORAGE_KEYS.habits, [])).toEqual([])
    })
  })

  describe('useStorage', () => {
    it('exposes the same functions behind the composable', () => {
      const storage = useStorage()
      expect(storage.readJSON).toBe(readJSON)
      expect(storage.writeJSON).toBe(writeJSON)
      expect(storage.removeValue).toBe(removeValue)
      expect(storage.readRaw).toBe(readRaw)
    })
  })
})
