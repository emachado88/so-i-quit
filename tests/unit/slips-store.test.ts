import { describe, expect, it } from 'vitest'

import {
  addSlip,
  clearPastSlips,
  deleteSlip,
  deleteSlipsForHabit,
  getSlipStore,
  getSlipsForHabit,
  isSlipMap,
  parseSlipStore,
  saveSlipsForHabit,
  updateSlip,
} from '../../app/utils/slips-store'
import { STORAGE_KEYS } from '../../app/utils/storage'
import type { Slip } from '../../app/utils/types'
import { installStorageMock, seedStorage } from '../helpers'

installStorageMock()

const slip = (overrides: Partial<Slip> = {}): Slip => ({
  id: 's1',
  habitId: 'h1',
  date: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('parseSlipStore', () => {
  it('returns an empty store for corrupt / non-object input', () => {
    for (const raw of [null, undefined, 42, 'nope', ['x']]) {
      expect(parseSlipStore(raw)).toEqual({})
    }
  })

  it('drops non-array entries', () => {
    expect(parseSlipStore({ h1: 'nope', h2: [slip()] })).toEqual({
      h2: [slip()],
    })
  })

  it('drops malformed slips inside a valid array', () => {
    expect(parseSlipStore({ h1: [slip(), { id: 'x' }] })).toEqual({
      h1: [slip()],
    })
  })
})

describe('isSlipMap', () => {
  it('accepts a valid map (including empty arrays)', () => {
    expect(isSlipMap({ h1: [slip()], h2: [] })).toBe(true)
    expect(isSlipMap({})).toBe(true)
  })

  it('rejects arrays, non-array entries and malformed slips', () => {
    expect(isSlipMap([])).toBe(false)
    expect(isSlipMap(null)).toBe(false)
    expect(isSlipMap({ h1: 'nope' })).toBe(false)
    expect(isSlipMap({ h1: [{ id: 'x' }] })).toBe(false)
  })
})

describe('slip CRUD', () => {
  it('adds a slip and reads it back per habit', () => {
    const created = addSlip('h1', new Date('2026-03-04T00:00:00.000Z'))

    expect(created.habitId).toBe('h1')
    expect(created.date).toBe('2026-03-04T00:00:00.000Z')
    expect(created.id).toBeTruthy()
    expect(getSlipsForHabit('h1')).toEqual([created])
    expect(getSlipsForHabit('h2')).toEqual([])
  })

  it('appends to an existing list', () => {
    seedStorage(STORAGE_KEYS.slips, JSON.stringify({ h1: [slip()] }))
    addSlip('h1', new Date('2026-02-02T00:00:00.000Z'))

    expect(getSlipsForHabit('h1')).toHaveLength(2)
  })

  it('updates a slip date by id', () => {
    seedStorage(STORAGE_KEYS.slips, JSON.stringify({ h1: [slip()] }))
    updateSlip('h1', 's1', new Date('2026-05-05T00:00:00.000Z'))

    expect(getSlipsForHabit('h1')).toEqual([
      slip({ date: '2026-05-05T00:00:00.000Z' }),
    ])
  })

  it('deletes a slip by id and leaves the rest', () => {
    seedStorage(
      STORAGE_KEYS.slips,
      JSON.stringify({
        h1: [slip(), slip({ id: 's2', date: '2026-02-02T00:00:00.000Z' })],
      }),
    )
    deleteSlip('h1', 's1')

    expect(getSlipsForHabit('h1')).toEqual([
      slip({ id: 's2', date: '2026-02-02T00:00:00.000Z' }),
    ])
  })

  it('is a no-op when the habit has no slips', () => {
    expect(() => updateSlip('h9', 's1', new Date())).not.toThrow()
    expect(() => deleteSlip('h9', 's1')).not.toThrow()
    expect(getSlipsForHabit('h9')).toEqual([])
  })

  it('replaces a whole list with saveSlipsForHabit', () => {
    saveSlipsForHabit('h1', [slip()])
    saveSlipsForHabit('h1', [])
    expect(getSlipsForHabit('h1')).toEqual([])
  })

  it('removes all state for one habit', () => {
    seedStorage(
      STORAGE_KEYS.slips,
      JSON.stringify({ h1: [slip()], h2: [slip({ id: 's2', habitId: 'h2' })] }),
    )
    deleteSlipsForHabit('h1')

    expect(getSlipsForHabit('h1')).toEqual([])
    expect(getSlipsForHabit('h2')).toHaveLength(1)
  })
})

describe('clearPastSlips', () => {
  it('drops slips dated before the cutoff and keeps the rest', () => {
    seedStorage(
      STORAGE_KEYS.slips,
      JSON.stringify({
        h1: [
          slip({ id: 'old', date: '2026-01-01T00:00:00.000Z' }),
          slip({ id: 'new', date: '2026-02-01T00:00:00.000Z' }),
        ],
      }),
    )
    clearPastSlips('h1', '2026-01-15T00:00:00.000Z')

    expect(getSlipsForHabit('h1')).toEqual([
      slip({ id: 'new', date: '2026-02-01T00:00:00.000Z' }),
    ])
  })

  it('keeps a slip exactly on the cutoff', () => {
    seedStorage(
      STORAGE_KEYS.slips,
      JSON.stringify({ h1: [slip({ date: '2026-01-15T00:00:00.000Z' })] }),
    )
    clearPastSlips('h1', '2026-01-15T00:00:00.000Z')

    expect(getSlipsForHabit('h1')).toHaveLength(1)
  })
})

describe('getSlipStore', () => {
  it('returns the whole validated map', () => {
    seedStorage(
      STORAGE_KEYS.slips,
      JSON.stringify({ h1: [slip()], bad: 'nope' }),
    )
    expect(getSlipStore()).toEqual({ h1: [slip()] })
  })
})
