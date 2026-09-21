import { useEffect, useReducer } from 'react'
import type { Match } from '../types'
import { clockMinute, getClock, initClockFromFirestore, subscribeClock } from '../lib/liveClock'

function useClockTicker() {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => subscribeClock(force), [])
}

export function useLiveClock(match?: Match | null) {
  useClockTicker()
  useEffect(() => {
    if (match) {
      initClockFromFirestore(
        match.id,
        match.clockBaseSeconds || 0,
        match.clockStartedAt || null,
        match.clockRunning || false,
      )
    }
  }, [match])

  if (!match) return undefined
  const entry = getClock(match.id)
  if (!entry) return undefined
  return { seconds: entry.seconds, running: entry.running }
}

export function useLiveClocks(matches: Match[]) {
  useClockTicker()
  useEffect(() => {
    matches.forEach((m) => {
      initClockFromFirestore(m.id, m.clockBaseSeconds || 0, m.clockStartedAt || null, m.clockRunning || false)
    })
  }, [matches])

  const minutes = new Map<string, number>()
  matches.forEach((m) => {
    const entry = getClock(m.id)
    minutes.set(m.id, entry ? clockMinute(entry.seconds) : 0)
  })
  return minutes
}
