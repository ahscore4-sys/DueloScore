import type { Player, TeamPlan } from '../types'
import { parseFormation, outfieldCount, UNDEFINED_FORMATION } from './formations'

const plans = new Map<string, TeamPlan>()
const listeners = new Set<() => void>()

function planKey(matchId: string, teamId: string): string {
  return `${matchId}:${teamId}`
}

export function emptyLineup(formation: string): string[] {
  if (formation === UNDEFINED_FORMATION) return []
  return Array(1 + outfieldCount(formation)).fill('')
}

export function defaultPlan(): TeamPlan {
  return { formation: UNDEFINED_FORMATION, lineup: [], bench: [], injured: [], suspended: [] }
}

export function fitLineup(squad: Player[], lineup: string[], formation: string): string[] {
  const counts = [1, ...parseFormation(formation)]
  const squadById = new Map(squad.map((p) => [p.id, p]))
  const used = new Set<string>()
  const result = emptyLineup(formation)
  let slot = 0
  counts.forEach((count, li) => {
    const gkRow = li === 0
    let kept = 0
    for (const id of lineup) {
      if (kept >= count) break
      const p = squadById.get(id)
      const isGK = p?.position === 'حارس'
      if (p && isGK === gkRow && !used.has(id)) {
        used.add(id)
        result[slot + kept] = id
        kept++
      }
    }
    slot += count
  })
  return result
}

export function getPlan(matchId: string, teamId: string): TeamPlan {
  const key = planKey(matchId, teamId)
  if (!plans.has(key)) plans.set(key, defaultPlan())
  return plans.get(key)!
}

export function savePlan(matchId: string, teamId: string, plan: TeamPlan): void {
  plans.set(planKey(matchId, teamId), plan)
  listeners.forEach((fn) => fn())
}

export function subscribePlans(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
