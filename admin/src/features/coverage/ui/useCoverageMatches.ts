import { useEffect, useState } from 'react'
import type { CoverageMatch } from '../domain/coverageMatches.types'
import { subscribeCoverageMatches } from '../data/coverageMatches.service'

export function useCoverageMatches(): {
  matches: CoverageMatch[]
  loading: boolean
} {
  const [matches, setMatches] = useState<CoverageMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const unsubscribe = subscribeCoverageMatches((items) => {
      if (!active) return
      setMatches(items)
      setLoading(false)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return { matches, loading }
}