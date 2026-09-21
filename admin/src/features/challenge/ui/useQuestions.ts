import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { ChallengeQuestion } from '../domain/challenge.types'
import { fetchQuestions, QUESTIONS_PAGE_SIZE } from '../data/questions.service'

export function useQuestions(): {
  questions: ChallengeQuestion[]
  setQuestions: React.Dispatch<React.SetStateAction<ChallengeQuestion[]>>
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
} {
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef<QueryDocumentSnapshot | null>(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setQuestions([])
    cursorRef.current = null
    setHasMore(false)

    fetchQuestions()
      .then((page) => {
        if (cancelled) return
        setQuestions(page.questions)
        cursorRef.current = page.cursor
        setHasMore(page.questions.length >= QUESTIONS_PAGE_SIZE && page.cursor !== null)
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
    fetchQuestions(cursorRef.current)
      .then((page) => {
        setQuestions((prev) => [...prev, ...page.questions])
        cursorRef.current = page.cursor
        setHasMore(page.questions.length >= QUESTIONS_PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [])

  return { questions, setQuestions, loading, loadingMore, hasMore, loadMore }
}
