import { useEffect, useState } from 'react'
import type { ChallengeQuestion } from '../domain/challenge.types'
import { fetchQuestion } from '../data/questions.service'

export function useQuestion(id: string | undefined): {
  question: ChallengeQuestion | null
  loading: boolean
} {
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null)
  const [loading, setLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) {
      setQuestion(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchQuestion(id)
      .then((q) => {
        if (!cancelled) setQuestion(q)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  return { question, loading }
}
