import { describe, expect, it } from 'vitest'

import { deleteMilestonesForHabit, getMilestonesForHabit, saveMilestonesForHabit } from '../../app/utils/milestones-store'
import type { Milestone } from '../../app/utils/types'
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
})
