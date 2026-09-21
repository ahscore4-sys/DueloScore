import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { DailyChallenge } from '../domain/challenge.types'
import { fetchChallenges, CHALLENGES_PAGE_SIZE } from '../data/challenges.service'

export function useChallengeHistory(): {
  challenges: DailyChallenge[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
} {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef<QueryDocumentSnapshot | null>(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setChallenges([])
    cursorRef.current = null
    setHasMore(false)

    fetchChallenges()
      .then((page) => {
        if (cancelled) return
        setChallenges(page.challenges)
        cursorRef.current = page.cursor
        setHasMore(page.challenges.length >= CHALLENGES_PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !cursorRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    fetchChallenges(cursorRef.current)
      .then((page) => {
        setChallenges((prev) => [...prev, ...page.challenges])
        cursorRef.current = page.cursor
        setHasMore(page.challenges.length >= CHALLENGES_PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [])

  return { challenges, loading, loadingMore, hasMore, loadMore }
}
