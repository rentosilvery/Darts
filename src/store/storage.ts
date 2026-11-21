/** Tiny localStorage wrapper. Every read/write is guarded: private mode or a full quota must never crash a game. */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: keep playing in memory */
  }
}

/** Ask the browser not to evict our data under storage pressure (best effort). */
export function requestPersistentStorage() {
  try {
    navigator.storage?.persist?.()
  } catch {
    /* not supported */
  }
}

export const KEYS = {
  profiles: 'darts.profiles.v1',
  session: 'darts.session.v1',
  setup: 'darts.setup.v1',
} as const
