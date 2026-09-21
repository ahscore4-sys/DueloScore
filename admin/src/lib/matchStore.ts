import { matches } from '../mockData'
import type { Match } from '../types'

const overrides = new Map<string, Partial<Match>>()
const cache = new Map<string, Match>()
const listeners = new Set<() => void>()

export function getMatch(id: string): Match | undefined {
  const base = matches.find((m) => m.id === id)
  if (!base) return undefined
  const patch = overrides.get(id)
  if (!patch) return base
  let merged = cache.get(id)
  if (!merged) {
    merged = { ...base, ...patch }
    cache.set(id, merged)
  }
  return merged
}

export function updateMatch(id: string, patch: Partial<Match>): void {
  overrides.set(id, { ...overrides.get(id), ...patch })
  cache.delete(id)
  listeners.forEach((fn) => fn())
}

export function subscribeMatchStore(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
