import { useEffect, useState } from 'react'
import type { DailyChallenge } from '../domain/challenge.types'
import { subscribeLatestChallenge } from '../data/challenges.service'

export function useLatestChallenge(): {
  challenge: DailyChallenge | null
  loading: boolean
} {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeLatestChallenge((c) => {
      setChallenge(c)
      setLoading(false)
    })
    return unsub
  }, [])

  return { challenge, loading }
}
