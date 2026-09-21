import { useEffect, useReducer, useState } from 'react'
import type { Match } from '../domain/match.types'
import { subscribeMatches } from '../data/match.service'

export function useMatches(): { matches: Match[]; loading: boolean } {
  const [, force] = useReducer((x: number) => x + 1, 0)
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return subscribeMatches((data) => {
      setMatches(data)
      setLoading(false)
      force()
    })
  }, [])

  return { matches, loading }
}
