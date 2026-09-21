import { useEffect, useState } from 'react'
import type { WeeklyLeaderboard } from '../domain/challenge.types'
import { challengeWeekId, challengeWeekLabel } from '../domain/challenge.types'
import { subscribeWeeklyLeaderboard } from '../data/challenges.service'

export function useWeeklyLeaderboard(): {
  leaderboard: WeeklyLeaderboard | null
  loading: boolean
  weekId: string
  weekLabel: string
} {
  const weekId = challengeWeekId(Date.now())
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeWeeklyLeaderboard(weekId, (lb) => {
      setLeaderboard(lb)
      setLoading(false)
    })
    return unsub
  }, [weekId])

  return { leaderboard, loading, weekId, weekLabel: challengeWeekLabel(weekId) }
}
