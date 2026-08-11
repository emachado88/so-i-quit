import { describe, expect, it } from 'vitest'

import { addHabit, deleteHabit, getHabits, saveHabits, updateHabit } from '../../app/utils/habits'
import type { Habit } from '../../app/utils/types'
import { installStorageMock, seedStorage } from '../helpers'

installStorageMock()

const makeHabit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Alcohol',
  date: null,
  savings: null,
  ...overrides,
})

const ID_PATTERN = /^\d+-[a-z0-9]{9}$/

describe('utils/habits', () => {
  describe('getHabits', () => {
    it('returns [] when nothing is stored', () => {
      expect(getHabits()).toEqual([])
    })

    it('round-trips stored habits', () => {
      saveHabits([makeHabit()])
      expect(getHabits()).toEqual([makeHabit()])
    })

    it('propagates corrupt JSON as an error (screens surface it)', () => {
      seedStorage('habits', '{not json')
      expect(() => getHabits()).toThrow()
    })
  })

  describe('saveHabits', () => {
    it('persists the full list', () => {
      const habits = [makeHabit(), makeHabit({ id: 'h2', name: 'Tobacco' })]
      saveHabits(habits)
      expect(getHabits()).toEqual(habits)
    })
  })

  describe('addHabit', () => {
    it('assigns a timestamp+random id', () => {
      const created = addHabit({ name: 'Alcohol', date: null, savings: null })
      expect(created.id).toMatch(ID_PATTERN)
      expect(created.name).toBe('Alcohol')
    })

    it('appends to the stored list', () => {
      const first = addHabit({ name: 'A', date: null, savings: null })
      const second = addHabit({ name: 'B', date: null, savings: null })
      expect(getHabits().map(h => h.id)).toEqual([first.id, second.id])
    })
  })

  describe('updateHabit', () => {
    it('merges updates and persists', () => {
      const created = addHabit({ name: 'Alcohol', date: null, savings: null })
      updateHabit(created.id, { date: '2025-01-01T00:00:00.000Z', savings: '5' })
      const [stored] = getHabits()
      expect(stored).toMatchObject({
        id: created.id,
        name: 'Alcohol',
        date: '2025-01-01T00:00:00.000Z',
        savings: '5',
      })
    })

    it('is a no-op for unknown ids (no throw)', () => {
      expect(() => updateHabit('missing', { savings: '1' })).not.toThrow()
      expect(getHabits()).toEqual([])
    })
  })

  describe('deleteHabit', () => {
    it('removes the habit and persists', () => {
      const first = addHabit({ name: 'A', date: null, savings: null })
      addHabit({ name: 'B', date: null, savings: null })
      deleteHabit(first.id)
      const stored = getHabits()
      expect(stored).toHaveLength(1)
      expect(stored[0].id).not.toBe(first.id)
    })

    it('is a no-op for unknown ids', () => {
      expect(() => deleteHabit('missing')).not.toThrow()
      expect(getHabits()).toEqual([])
    })
  })
})
