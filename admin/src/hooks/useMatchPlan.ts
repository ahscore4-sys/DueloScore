import { useEffect, useReducer, useState } from 'react'
import type { TeamPlan } from '../types'
import { defaultPlan } from '../lib/matchPlans'
import { saveMatchPlan } from '@/features/match/data/match.service'

export interface MatchPlanApi {
  plan: TeamPlan
  update: (patch: Partial<TeamPlan>) => void
}

export function useMatchPlan(matchId?: string, teamId?: string): MatchPlanApi {
  const [, force] = useReducer((x: number) => x + 1, 0)
  const [plan, setPlan] = useState<TeamPlan>(defaultPlan())

  useEffect(() => {
    if (!matchId || !teamId) {
      setPlan(defaultPlan())
      return
    }
    const key = `plan:${matchId}:${teamId}`
    try {
      const raw = sessionStorage.getItem(key)
      if (raw) {
        const p = JSON.parse(raw) as TeamPlan
        setPlan({ ...p, formation: p.formation || defaultPlan().formation, lineup: p.lineup ?? [], bench: p.bench ?? [], injured: p.injured ?? [], suspended: p.suspended ?? [] })
      } else setPlan(defaultPlan())
    } catch {
      setPlan(defaultPlan())
    }
  }, [matchId, teamId])

  if (!matchId || !teamId) {
    return { plan: defaultPlan(), update: () => {} }
  }

  return {
    plan,
    update: (patch) => {
      const next = { ...plan, ...patch }
      setPlan(next)
      try { sessionStorage.setItem(`plan:${matchId}:${teamId}`, JSON.stringify(next)) } catch { /* noop */ }
      saveMatchPlan(matchId, teamId, next).then(() => force())
    },
  }
}
