import type { Player } from '@/types'
import { subscribePlayersByTeam } from './player.service'

const cache = new Map<string, Player[]>()
const unsubs = new Map<string, () => void>()
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((fn) => fn())
}

export function getPlayersByTeam(teamId: string): Player[] {
  return cache.get(teamId) ?? []
}

export function ensureSubscription(teamId: string): void {
  if (unsubs.has(teamId)) return
  cache.set(teamId, [])
  const unsub = subscribePlayersByTeam(teamId, (data) => {
    cache.set(teamId, data)
    notify()
  })
  unsubs.set(teamId, unsub)
}

export function subscribeStore(fn: () => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
