import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { DiwaniyaPost } from '../domain/diwaniya.types'
import { fetchDiwaniyaPosts, subscribeLatestPosts, PAGE_SIZE } from '../data/diwaniya.service'

export function useDiwaniyaPosts(): {
  posts: DiwaniyaPost[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
} {
  const [posts, setPosts] = useState<DiwaniyaPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef<QueryDocumentSnapshot | null>(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPosts([])
    cursorRef.current = null
    setHasMore(false)

    fetchDiwaniyaPosts()
      .then((page) => {
        if (cancelled) return
        setPosts(page.posts)
        cursorRef.current = page.cursor
        setHasMore(page.posts.length >= PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const count = posts.length

  useEffect(() => {
    if (count === 0) return
    return subscribeLatestPosts(count, (fresh) => {
      setPosts(fresh.length > 0 ? fresh : [])
    })
  }, [count])

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !cursorRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    fetchDiwaniyaPosts(cursorRef.current)
      .then((page) => {
        setPosts((prev) => [...prev, ...page.posts])
        cursorRef.current = page.cursor
        setHasMore(page.posts.length >= PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [])

  return { posts, loading, loadingMore, hasMore, loadMore }
}
