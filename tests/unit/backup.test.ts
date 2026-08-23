import { describe, expect, it } from 'vitest'

import {
  BACKUP_VERSION,
  buildBackup,
  exportToFile,
  importBackup,
  parseBackup,
  type BackupFile,
} from '../../app/utils/backup'
import { getHabits } from '../../app/utils/habits'
import { getMilestonesForHabit } from '../../app/utils/milestones-store'
import { getSettings, SUPPORTED_LANGUAGES } from '../../app/utils/settings'
import { readJSON, STORAGE_KEYS } from '../../app/utils/storage'
import type { AppSettings, Habit, Milestone } from '../../app/utils/types'
import { installStorageMock, seedStorage } from '../helpers'

installStorageMock()

const habit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Tobacco',
  date: '2026-01-01T10:00:00.000Z',
  savings: '5.50',
  ...overrides,
})

const milestone = (overrides: Partial<Milestone> = {}): Milestone => ({
  id: 'm1',
  habitId: 'h1',
  unit: 'week',
  amount: 1,
  reachedAt: null,
  notificationId: null,
  ...overrides,
})

const settings: AppSettings = {
  theme: 'dark',
  language: 'pt',
  currency: 'EUR',
  milestoneNotificationsEnabled: true,
  milestoneNotificationsPrompted: true,
}

const validBackup = (): BackupFile => ({
  version: BACKUP_VERSION,
  exportedAt: '2026-08-14T12:00:00.000Z',
  habits: [habit()],
  milestones: { h1: [milestone()] },
  settings,
})

describe('buildBackup', () => {
  it('snapshots habits, milestones and settings', () => {
    seedStorage(STORAGE_KEYS.habits, JSON.stringify([habit()]))
    seedStorage(
      STORAGE_KEYS.milestones,
      JSON.stringify({ h1: [milestone()], h2: [milestone({ id: 'm2', habitId: 'h2' })] }),
    )
    seedStorage(STORAGE_KEYS.settings, JSON.stringify(settings))

    const backup = buildBackup()

    expect(backup.version).toBe(BACKUP_VERSION)
    expect(backup.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(backup.habits).toEqual([habit()])
    expect(backup.milestones).toEqual({
      h1: [milestone()],
      h2: [milestone({ id: 'm2', habitId: 'h2' })],
    })
    expect(backup.settings).toEqual(settings)
  })

  it('tolerates a corrupt milestones store (treated as empty)', () => {
    seedStorage(STORAGE_KEYS.habits, JSON.stringify([habit()]))
    seedStorage(STORAGE_KEYS.milestones, 'not-json{{')
    seedStorage(STORAGE_KEYS.settings, JSON.stringify(settings))

    expect(buildBackup().milestones).toEqual({})
  })
})

describe('parseBackup', () => {
  it('round-trips a built backup through exportToFile', () => {
    seedStorage(STORAGE_KEYS.habits, JSON.stringify([habit()]))
    seedStorage(
      STORAGE_KEYS.milestones,
      JSON.stringify({ h1: [milestone()] }),
    )
    seedStorage(STORAGE_KEYS.settings, JSON.stringify(settings))

    const backup = buildBackup()
    const parsed = parseBackup(exportToFile(backup))

    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.data).toEqual(backup)
    }
  })

  it('accepts a milestone map with empty arrays', () => {
    const parsed = parseBackup(
      exportToFile({ ...validBackup(), milestones: { h1: [] } }),
    )
    expect(parsed.ok).toBe(true)
  })

  it('rejects invalid JSON', () => {
    expect(parseBackup('{not json')).toEqual({
      ok: false,
      error: 'invalid-json',
    })
  })

  it('rejects non-object payloads', () => {
    for (const raw of ['null', '42', '"hello"', '[1, 2]', 'true']) {
      expect(parseBackup(raw)).toEqual({ ok: false, error: 'invalid-json' })
    }
  })

  it('rejects a wrong version', () => {
    const parsed = parseBackup(
      exportToFile({ ...validBackup(), version: 2 }),
    )
    expect(parsed).toEqual({ ok: false, error: 'invalid-version' })
  })

  it('rejects an invalid exportedAt', () => {
    for (const exportedAt of ['not-a-date', 42, undefined]) {
      const raw = JSON.stringify({ ...validBackup(), exportedAt })
      expect(parseBackup(raw)).toEqual({
        ok: false,
        error: 'invalid-exported-at',
      })
    }
  })

  it('rejects invalid habits', () => {
    const badHabit = { ...habit(), name: 42 }
    const parsed = parseBackup(
      exportToFile({ ...validBackup(), habits: [badHabit] }),
    )
    expect(parsed).toEqual({ ok: false, error: 'invalid-habits' })
  })

  it('rejects a non-array habits field', () => {
    const parsed = parseBackup(
      exportToFile({ ...validBackup(), habits: 'nope' }),
    )
    expect(parsed).toEqual({ ok: false, error: 'invalid-habits' })
  })

  it('rejects invalid milestones', () => {
    const badMilestone = { ...milestone(), amount: 0 }
    const parsed = parseBackup(
      exportToFile({ ...validBackup(), milestones: { h1: [badMilestone] } }),
    )
    expect(parsed).toEqual({ ok: false, error: 'invalid-milestones' })
  })

  it('rejects a non-array milestone entry', () => {
    const parsed = parseBackup(
      exportToFile({ ...validBackup(), milestones: { h1: 'nope' } }),
    )
    expect(parsed).toEqual({ ok: false, error: 'invalid-milestones' })
  })

  it('rejects a milestone map that is an array', () => {
    const parsed = parseBackup(
      exportToFile({ ...validBackup(), milestones: [] }),
    )
    expect(parsed).toEqual({ ok: false, error: 'invalid-milestones' })
  })

  it('rejects invalid settings', () => {
    const badSettings = { ...settings, theme: 'neon' }
    const parsed = parseBackup(
      exportToFile({ ...validBackup(), settings: badSettings }),
    )
    expect(parsed).toEqual({ ok: false, error: 'invalid-settings' })
  })

  it('never throws on hostile input', () => {
    for (const raw of ['', '   ', '{', 'null', '[]']) {
      const result = parseBackup(raw)
      expect(result.ok).toBe(false)
      expect(typeof result.error).toBe('string')
    }
  })
})

describe('importBackup', () => {
  it('replaces habits, milestones and settings', () => {
    seedStorage(STORAGE_KEYS.habits, JSON.stringify([habit({ id: 'old' })]))
    seedStorage(
      STORAGE_KEYS.milestones,
      JSON.stringify({ old: [milestone({ id: 'm-old' })] }),
    )
    seedStorage(STORAGE_KEYS.settings, JSON.stringify({ ...settings, theme: 'light' }))

    importBackup({
      ...validBackup(),
      habits: [habit(), habit({ id: 'h2', name: 'Alcohol' })],
      milestones: {
        h1: [milestone()],
        h2: [milestone({ id: 'm2', habitId: 'h2', unit: 'month', amount: 3 })],
      },
    })

    expect(getHabits()).toEqual([
      habit(),
      habit({ id: 'h2', name: 'Alcohol' }),
    ])
    expect(getMilestonesForHabit('h1')).toEqual([milestone()])
    expect(getMilestonesForHabit('h2')).toEqual([
      milestone({ id: 'm2', habitId: 'h2', unit: 'month', amount: 3 }),
    ])
    expect(getSettings()).toEqual(settings)
  })

  it('drops a __proto__ milestone key (prototype-pollution sink)', () => {
    const milestones: Record<string, Milestone[]> = { h1: [milestone()] }
    // simulate JSON.parse: __proto__ is an own enumerable data prop, not a setter
    milestones['__proto__'] = [
      { id: 'mx', habitId: 'h1', unit: 'week', amount: 1, reachedAt: null, notificationId: null },
    ]

    importBackup({ ...validBackup(), milestones })

    expect(getMilestonesForHabit('h1')).toEqual([milestone()])
    const store = readJSON(STORAGE_KEYS.milestones, {}) as Record<string, Milestone[]>
    expect(Object.prototype.hasOwnProperty.call(store, '__proto__')).toBe(false)
  })

  it('drops an orphan milestone whose habitId has no matching habit', () => {
    importBackup({
      ...validBackup(),
      milestones: {
        h1: [milestone()],
        h9: [milestone({ id: 'm9', habitId: 'h9' })],
      },
    })

    expect(getMilestonesForHabit('h1')).toEqual([milestone()])
    expect(getMilestonesForHabit('h9')).toEqual([])
  })

  it('normalizes out-of-allow-list language/currency to defaults', () => {
    importBackup({
      ...validBackup(),
      settings: { ...settings, language: 'xx', currency: 'XYZ' },
    })

    const saved = getSettings()
    expect(saved.language).not.toBe('xx')
    expect(SUPPORTED_LANGUAGES).toContain(saved.language)
    expect(saved.currency).toBe('EUR')
  })
})
