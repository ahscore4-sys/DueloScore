import { useEffect, useReducer } from 'react'
import type { Match } from '../types'
import { getFlow, subscribeFlow } from '../lib/matchFlow'

export interface LiveScore {
  goals: { home: number; away: number }
  penalties: { home: number; away: number }
}

export function useLiveScores(matches: Match[]): Map<string, LiveScore> {
  const [, force] = useReducer((x: number) => x + 1, 0)
  useEffect(() => subscribeFlow(force), [])

  const map = new Map<string, LiveScore>()
  matches.forEach((m) => {
    const flow = getFlow(m.id)
    map.set(m.id, {
      goals: { home: m.score.home, away: m.score.away },
      penalties: { home: flow?.penalties.home ?? 0, away: flow?.penalties.away ?? 0 },
    })
  })
  return map
}
