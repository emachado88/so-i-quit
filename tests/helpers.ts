import { afterEach, beforeEach, vi } from 'vitest'

/**
 * In-memory localStorage for unit tests. The storage layer guards with
 * `typeof localStorage === 'undefined'`, so stubbing the global is enough —
 * no module mocking required.
 */
const memory = new Map<string, string>()

/** Seed a raw value before a test (corrupt JSON, edge values...). */
export const seedStorage = (key: string, value: string): void => {
  memory.set(key, value)
}

/** Install the localStorage stub for the whole test file. */
export const installStorageMock = (): void => {
  beforeEach(() => {
    memory.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
      clear: () => {
        memory.clear()
      },
    })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })
}
