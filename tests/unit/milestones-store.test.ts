import { describe, expect, it } from 'vitest'

import {
  deleteMilestonesForHabit,
  ensureMilestonesForHabit,
  getMilestonesForHabit,
  getMilestonesForHabits,
  saveMilestonesForHabit,
} from '../../app/utils/milestones-store'
import type { Habit, Milestone } from '../../app/utils/types'
import { installStorageMock, seedStorage } from '../helpers'

installStorageMock()

const makeMilestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'h1-day-1',
  habitId: 'h1',
  unit: 'day',
  amount: 1,
  reachedAt: null,
  notificationId: null,
  ...overrides,
})

const habit = (date: string): Habit => ({
  id: 'h1',
  name: 'Alcohol',
  date,
  savings: '5',
})

describe('utils/milestones-store', () => {
  it('getMilestonesForHabit returns [] for unknown habits', () => {
    expect(getMilestonesForHabit('nobody')).toEqual([])
  })

  it('saveMilestonesForHabit replaces the stored list', () => {
    saveMilestonesForHabit('h1', [makeMilestone()])
    expect(getMilestonesForHabit('h1')).toEqual([makeMilestone()])
  })

  it('keeps habits independent in the shared store', () => {
    saveMilestonesForHabit('h1', [makeMilestone()])
    saveMilestonesForHabit('h2', [makeMilestone({ id: 'h2-year-1', habitId: 'h2', unit: 'year', amount: 1 })])
    expect(getMilestonesForHabit('h1')).toHaveLength(1)
    expect(getMilestonesForHabit('h2')[0].unit).toBe('year')
  })

  it('deletes a habit milestone state and is a no-op for unknown ids', () => {
    saveMilestonesForHabit('h1', [makeMilestone()])
    deleteMilestonesForHabit('h1')
    expect(getMilestonesForHabit('h1')).toEqual([])
    expect(() => deleteMilestonesForHabit('missing')).not.toThrow()
  })

  it('tolerates corrupt JSON in the store (treats as empty)', () => {
    seedStorage('milestones-v1', '{not json')
    expect(getMilestonesForHabit('h1')).toEqual([])
    saveMilestonesForHabit('h1', [makeMilestone()])
    expect(getMilestonesForHabit('h1')).toHaveLength(1)
  })

  it('tolerates a stored non-object value (treats as empty)', () => {
    seedStorage('milestones-v1', JSON.stringify('garbage'))
    expect(getMilestonesForHabit('h1')).toEqual([])
    saveMilestonesForHabit('h1', [makeMilestone()])
    expect(getMilestonesForHabit('h1')).toHaveLength(1)
  })

  describe('ensureMilestonesForHabit', () => {
    it('initializes a habit without a stored record (silent backfill, no celebration queue)', () => {
      const h = habit('2025-01-01T00:00:00.000Z')
      const now = new Date('2025-06-01T00:00:00Z')

      const { milestones, newlyReached } = ensureMilestonesForHabit(h, now)

      expect(milestones.length).toBeGreaterThan(0)
      // Long-standing habit: historical targets marked reached but NOT queued
      expect(newlyReached).toEqual([])
      const reached = milestones.filter((m) => m.reachedAt !== null)
      expect(reached.length).toBeGreaterThan(0)
      // Persisted for later reads
      const stored = getMilestonesForHabit('h1')
      expect(stored.length).toBe(milestones.length)
    })

    it('returns nothing for undated habits', () => {
      const h = { ...habit('2025-01-01'), date: null }
      const { milestones, newlyReached } = ensureMilestonesForHabit(h, new Date())
      expect(milestones).toEqual([])
      expect(newlyReached).toEqual([])
    })

    it('queues only milestones crossed since the last check', () => {
      const h = habit('2025-01-01T00:00:00.000Z')
      // First check: backfill silently
      ensureMilestonesForHabit(h, new Date('2025-01-01T06:00:00Z'))

      // A day later: exactly the newly crossed targets are reported
      const { newlyReached } = ensureMilestonesForHabit(h, new Date('2025-01-02T06:00:00Z'))
      expect(newlyReached.length).toBeGreaterThan(0)
      const units = newlyReached.map((m) => `${m.unit}:${m.amount}`)
      expect(units).toContain('day:1')
    })

    it('extends the horizon on later checks and keeps existing state', () => {
      const h = habit('2025-01-01T00:00:00.000Z')
      ensureMilestonesForHabit(h, new Date('2025-06-01T00:00:00Z'))

      const { milestones } = ensureMilestonesForHabit(h, new Date('2030-06-01T00:00:00Z'))
      // Horizon extended: year 12 only exists after the 2030 check
      const year12 = milestones.find((m) => m.unit === 'year' && m.amount === 12)
      expect(year12).toBeDefined()
    })
  })

  describe('getMilestonesForHabits', () => {
    it('backfills many habits in one pass and persists', () => {
      const h1 = habit('2025-01-01T00:00:00.000Z')
      const h2: Habit = { ...habit('2024-01-01T00:00:00.000Z'), id: 'h2' }
      const byHabit = getMilestonesForHabits([h1, h2], new Date('2025-06-01T00:00:00Z'))
      expect(byHabit['h1'].length).toBeGreaterThan(0)
      expect(byHabit['h2'].length).toBeGreaterThan(0)
      // Persisted
      expect(getMilestonesForHabit('h2').length).toBeGreaterThan(0)
    })

    it('skips undated habits', () => {
      const h1 = habit('2025-01-01T00:00:00.000Z')
      const undated = { ...habit('2025-01-01'), id: 'undated', date: null }
      const byHabit = getMilestonesForHabits([h1, undated], new Date('2025-06-01T00:00:00Z'))
      expect(byHabit['h1'].length).toBeGreaterThan(0)
      expect(byHabit['undated']).toBeUndefined()
    })
  })
})
