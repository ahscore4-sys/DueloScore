import { useCallback, useEffect, useState } from 'react'
import type { TeamPlan } from '../domain/match.types'
import { saveMatchPlan } from '../data/match.service'
import type { MatchWithPlans } from '../domain/match.types'

function defaultPlan(): TeamPlan {
  return { formation: '4-3-3', lineup: [], bench: [], injured: [], suspended: [] }
}

export function useMatchPlan(match: MatchWithPlans | null | undefined, teamId?: string) {
  const [plan, setPlan] = useState<TeamPlan>(defaultPlan())

  useEffect(() => {
    if (match?.plans && teamId && match.plans[teamId]) {
      const p = match.plans[teamId]
      setPlan({
        formation: p.formation || defaultPlan().formation,
        lineup: p.lineup ?? [],
        bench: p.bench ?? [],
        injured: p.injured ?? [],
        suspended: p.suspended ?? [],
        captain: p.captain,
        playerData: p.playerData,
      })
    } else {
      setPlan(defaultPlan())
    }
  }, [match?.id, teamId, match?.plans])

  const update = useCallback(
    async (patch: Partial<TeamPlan>) => {
      if (!match?.id || !teamId) return
      const next = { ...plan, ...patch }
      setPlan(next)
      await saveMatchPlan(match.id, teamId, next)
    },
    [match?.id, teamId, plan],
  )

  const setFormation = useCallback(
    (formation: string) => update({ formation }),
    [update],
  )

  const setLineup = useCallback(
    (lineup: string[]) => update({ lineup }),
    [update],
  )

  const setBench = useCallback(
    (bench: string[]) => update({ bench }),
    [update],
  )

  const setInjured = useCallback(
    (injured: string[]) => update({ injured }),
    [update],
  )

  const setSuspended = useCallback(
    (suspended: string[]) => update({ suspended }),
    [update],
  )

  return { plan, update, setFormation, setLineup, setBench, setInjured, setSuspended }
}
