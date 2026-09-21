import { useEffect, useReducer, useState } from 'react'
import type { Player } from '@/types'
import { getPlayersByTeam, ensureSubscription, subscribeStore } from '../data/playerStore'

export function usePlayersByTeam(teamId?: string): { players: Player[]; loading: boolean } {
  const [, force] = useReducer((x: number) => x + 1, 0)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId) { setPlayers([]); setLoading(false); return }
    ensureSubscription(teamId)
    setLoading(false)
    setPlayers(getPlayersByTeam(teamId))
    return subscribeStore(() => {
      setPlayers(getPlayersByTeam(teamId))
      force()
    })
  }, [teamId])

  return { players, loading }
}
