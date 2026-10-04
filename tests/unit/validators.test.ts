import { describe, expect, it } from 'vitest'

import { isAppSettings, isHabit, isMilestone, isSlip } from '../../app/utils/validators'

const validHabit = {
  id: 'h1',
  name: 'Alcohol',
  date: null,
  savings: null,
}

const validMilestone = {
  id: 'h1-day-1',
  habitId: 'h1',
  unit: 'day',
  amount: 1,
  reachedAt: null,
  notificationId: null,
}

const validSettings = {
  theme: 'system',
  language: 'en',
  currency: 'EUR',
  milestoneNotificationsEnabled: true,
  milestoneNotificationsPrompted: false,
}

const validSlip = {
  id: 's1',
  habitId: 'h1',
  date: '2026-01-01T00:00:00.000Z',
}

describe('utils/validators', () => {
  describe('isHabit', () => {
    it('accepts a valid habit', () => {
      expect(isHabit(validHabit)).toBe(true)
    })

    it('accepts a standard habit (empty name, no key)', () => {
      expect(isHabit({ ...validHabit, name: '' })).toBe(true)
    })

    it('accepts a savings amount string', () => {
      expect(isHabit({ ...validHabit, savings: '7.50' })).toBe(true)
    })

    it('rejects a numeric date', () => {
      expect(isHabit({ ...validHabit, date: 1735689600000 })).toBe(false)
    })

    it('rejects an object savings value', () => {
      expect(isHabit({ ...validHabit, savings: { amount: 5 } })).toBe(false)
    })

    it('rejects null and undefined', () => {
      expect(isHabit(null)).toBe(false)
      expect(isHabit(undefined)).toBe(false)
    })
  })

  describe('isMilestone', () => {
    it('accepts a valid milestone', () => {
      expect(isMilestone(validMilestone)).toBe(true)
    })

    it('accepts a notification id string', () => {
      expect(isMilestone({ ...validMilestone, notificationId: 'ntf-123' })).toBe(true)
    })

    it('rejects an invalid unit', () => {
      expect(isMilestone({ ...validMilestone, unit: 'decade' })).toBe(false)
    })

    it('rejects a numeric reachedAt', () => {
      expect(isMilestone({ ...validMilestone, reachedAt: 1735689600000 })).toBe(false)
    })

    it('rejects a non-positive amount', () => {
      expect(isMilestone({ ...validMilestone, amount: 0 })).toBe(false)
    })

    it('rejects null and undefined', () => {
      expect(isMilestone(null)).toBe(false)
      expect(isMilestone(undefined)).toBe(false)
    })
  })

  describe('isSlip', () => {
    it('accepts a valid slip', () => {
      expect(isSlip(validSlip)).toBe(true)
    })

    it('rejects a non-string habitId', () => {
      expect(isSlip({ ...validSlip, habitId: undefined })).toBe(false)
    })

    it('rejects a numeric date', () => {
      expect(isSlip({ ...validSlip, date: 1735689600000 })).toBe(false)
    })

    it('rejects null and undefined', () => {
      expect(isSlip(null)).toBe(false)
      expect(isSlip(undefined)).toBe(false)
    })
  })

  describe('isAppSettings', () => {
    it('accepts valid settings', () => {
      expect(isAppSettings(validSettings)).toBe(true)
    })

    it('rejects an invalid theme', () => {
      expect(isAppSettings({ ...validSettings, theme: 'sepia' })).toBe(false)
    })

    it('rejects a non-boolean notification flag', () => {
      expect(isAppSettings({ ...validSettings, milestoneNotificationsEnabled: 'yes' })).toBe(false)
    })

    it('rejects null and undefined', () => {
      expect(isAppSettings(null)).toBe(false)
      expect(isAppSettings(undefined)).toBe(false)
    })
  })
})
