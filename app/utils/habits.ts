/**
 * Habit CRUD over localStorage — ported from the RN data layer
 * (data/habits.ts, AsyncStorage key "habits").
 *
 * Error semantics kept from RN: corrupt JSON propagates as an error —
 * screens catch and surface it. No silent data loss.
 */

import { STORAGE_KEYS, readRaw, writeJSON } from './storage'
import type { Habit } from './types'
import { isHabit } from './validators'

const newHabitId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`

export const getHabits = (): Habit[] => {
  const raw = readRaw(STORAGE_KEYS.habits)
  // JSON.parse throws on corrupt JSON — intentional, screens surface it.
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    console.warn('[habits] stored value is not an array; treating as empty')
    return []
  }
  return parsed.filter((item): item is Habit => {
    if (isHabit(item)) return true
    console.warn('[habits] discarding invalid habit entry', item)
    return false
  })
}

export const saveHabits = (habits: Habit[]): void => {
  writeJSON(STORAGE_KEYS.habits, habits)
}

export const addHabit = (habit: Omit<Habit, 'id'>): Habit => {
  const habits = getHabits()
  const newHabit: Habit = { ...habit, id: newHabitId() }
  habits.push(newHabit)
  saveHabits(habits)
  return newHabit
}

export const updateHabit = (id: string, updates: Partial<Habit>): void => {
  const habits = getHabits()
  const index = habits.findIndex(h => h.id === id)
  if (index !== -1) {
    const existing = habits[index]
    if (existing) {
      habits[index] = { ...existing, ...updates }
      saveHabits(habits)
    }
  }
}

export const deleteHabit = (id: string): void => {
  saveHabits(getHabits().filter(h => h.id !== id))
}
