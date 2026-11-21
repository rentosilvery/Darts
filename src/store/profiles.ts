import { useSyncExternalStore } from 'react'
import type { MatchRecord } from '../engine/engine'
import { KEYS, readJSON, writeJSON } from './storage'

/** A saved player whose lifetime 301/501 stats build up across games. Around the Clock is not recorded. */
export interface PlayerProfile {
  id: string
  name: string
  colorIndex: number
  gamesPlayed: number
  gamesWon: number
  totalRounds: number
  totalScored: number
  count100Plus: number
  count60Plus: number
  count40Plus: number
  bustCount: number
  bestTurn: number
  /** ISO date */
  lastPlayed: string | null
}

export const PALETTE = [
  '#F29A38', // orange
  '#E5483B', // red
  '#E86A9A', // pink
  '#9B6BDB', // purple
  '#5C6BE0', // indigo
  '#3D8FE6', // blue
  '#2BB3AE', // teal
  '#3FB062', // green
  '#8FD9B6', // mint
  '#F0C456', // yellow
]

export const profileColor = (p?: PlayerProfile | null) =>
  p ? PALETTE[((p.colorIndex % PALETTE.length) + PALETTE.length) % PALETTE.length] : undefined

export const lifetimeAverage = (p: PlayerProfile) => (p.totalRounds > 0 ? p.totalScored / p.totalRounds : 0)

export const blankProfile = (name: string, colorIndex: number): PlayerProfile => ({
  id: crypto.randomUUID(),
  name,
  colorIndex,
  gamesPlayed: 0,
  gamesWon: 0,
  totalRounds: 0,
  totalScored: 0,
  count100Plus: 0,
  count60Plus: 0,
  count40Plus: 0,
  bustCount: 0,
  bestTurn: 0,
  lastPlayed: null,
})

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let profiles: PlayerProfile[] = readJSON<PlayerProfile[]>(KEYS.profiles, [])
const listeners = new Set<() => void>()

function commit(next: PlayerProfile[]) {
  profiles = next
  writeJSON(KEYS.profiles, profiles)
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useProfiles = () => useSyncExternalStore(subscribe, () => profiles)
export const getProfile = (id?: string) => (id ? profiles.find((p) => p.id === id) : undefined)

export const profileStore = {
  add(p: PlayerProfile) {
    commit([...profiles, p])
  },
  update(p: PlayerProfile) {
    commit(profiles.map((x) => (x.id === p.id ? p : x)))
  },
  remove(id: string) {
    commit(profiles.filter((p) => p.id !== id))
  },
  /** Merge a finished 301/501 match into each linked profile's lifetime totals. */
  recordMatch(records: MatchRecord[]) {
    if (records.length === 0) return
    const now = new Date().toISOString()
    commit(
      profiles.map((p) => {
        const r = records.find((x) => x.profileId === p.id)
        if (!r) return p
        return {
          ...p,
          gamesPlayed: p.gamesPlayed + 1,
          gamesWon: p.gamesWon + (r.won ? 1 : 0),
          totalRounds: p.totalRounds + r.rounds,
          totalScored: p.totalScored + r.scored,
          count100Plus: p.count100Plus + r.count100Plus,
          count60Plus: p.count60Plus + r.count60Plus,
          count40Plus: p.count40Plus + r.count40Plus,
          bustCount: p.bustCount + r.bustCount,
          bestTurn: Math.max(p.bestTurn, r.bestTurn),
          lastPlayed: now,
        }
      }),
    )
  },

  /** Backup file contents. */
  exportJSON() {
    return JSON.stringify({ app: 'darts', version: 1, exportedAt: new Date().toISOString(), profiles }, null, 2)
  },
  /** Restore from a backup file. Profiles with the same id are replaced; others are added. Returns the count imported. */
  importJSON(text: string): number {
    const data = JSON.parse(text)
    const incoming: unknown = Array.isArray(data) ? data : data?.profiles
    if (!Array.isArray(incoming)) throw new Error('This file has no players in it.')
    const valid = incoming.filter(
      (p): p is PlayerProfile => p && typeof p.id === 'string' && typeof p.name === 'string',
    )
    const merged = new Map(profiles.map((p) => [p.id, p]))
    for (const p of valid) merged.set(p.id, { ...blankProfile(p.name, 0), ...p })
    commit([...merged.values()])
    return valid.length
  },
}
