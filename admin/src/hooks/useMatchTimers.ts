import { useEffect, useReducer } from 'react'
import type { Match } from '../types'
import { formatEventMinute, getFlow, phaseIsRunning, subscribeFlow } from '../lib/matchFlow'
import { getClock, initClockFromFirestore, subscribeClock } from '../lib/liveClock'
import { subscribeAddedTime } from '../lib/addedTime'
import type { ControlPhase } from '../types'

export interface MatchTimer {
  text: string
  live: boolean
}

function timerText(phase: ControlPhase, seconds: number): MatchTimer {
  if (phase === 'not_started') return { text: '—', live: false }
  if (phaseIsRunning(phase)) return { text: formatEventMinute(phase, seconds), live: true }
  if (seconds > 0) return { text: formatEventMinute(phase, seconds), live: false }
  return { text: '—', live: false }
}

export function useMatchTimers(matches: Match[]): Map<string, MatchTimer> {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const offClock = subscribeClock(force)
    const offFlow = subscribeFlow(force)
    const offAdded = subscribeAddedTime(force)
    return () => {
      offClock()
      offFlow()
      offAdded()
    }
  }, [])

  useEffect(() => {
    matches.forEach((m) => {
      initClockFromFirestore(m.id, m.clockBaseSeconds || 0, m.clockStartedAt || null, m.clockRunning || false)
    })
  }, [matches])

  const map = new Map<string, MatchTimer>()
  matches.forEach((m) => {
    const flow = getFlow(m.id)
    const phase: ControlPhase = flow ? flow.phase : m.controlPhase || m.status
    const seconds = getClock(m.id)?.seconds ?? 0
    map.set(m.id, timerText(phase, seconds))
  })
  return map
}
