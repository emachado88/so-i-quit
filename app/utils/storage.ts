/**
 * WebView-safe storage layer over localStorage, behind a composable.
 *
 * localStorage is the only storage the Android WebView reliably keeps
 * (cookies are dropped on restart). All persistence goes through this
 * module; swapping to @capacitor/preferences later means changing only
 * this file.
 *
 * Error semantics (ported from the RN data layer):
 *  - JSON-level problems (missing key, corrupt JSON, stored null) are
 *    absorbed and fall back to the caller-provided default;
 *  - real storage errors (quota, privacy mode) propagate to callers —
 *    no silent throws.
 */

export const STORAGE_KEYS = {
  habits: 'habits',
  milestones: 'milestones-v1',
  settings: 'settings-v1',
} as const

const getStore = (): Storage | null => {
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

/** Raw string read; null when missing or when storage is unavailable. */
export const readRaw = (key: string): string | null => {
  const store = getStore()
  if (!store) return null
  return store.getItem(key)
}

/** JSON read with fallback: missing key, corrupt JSON, or null → fallback. */
export const readJSON = <T>(key: string, fallback: T): T => {
  const raw = readRaw(key)
  if (raw === null) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed === null || parsed === undefined ? fallback : (parsed as T)
  }
  catch {
    return fallback
  }
}

/** JSON write. Storage-level errors (quota, privacy) propagate to callers. */
export const writeJSON = (key: string, value: unknown): void => {
  const store = getStore()
  if (!store) return
  store.setItem(key, JSON.stringify(value))
}

/** Remove a key; no-op when storage is unavailable. */
export const removeValue = (key: string): void => {
  const store = getStore()
  if (!store) return
  store.removeItem(key)
}

/**
 * Composable for components — stable API over the same functions.
 * (Nuxt auto-imports this from app/utils.)
 */
export const useStorage = () => ({
  readRaw,
  readJSON,
  writeJSON,
  removeValue,
})
