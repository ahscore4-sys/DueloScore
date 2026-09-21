import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { NewsPost } from '../domain/news.types'
import { fetchNewsPosts, PAGE_SIZE, type NewsFeedFilters } from '../data/news.service'

export function useNewsPosts(filters: NewsFeedFilters): {
  posts: NewsPost[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
} {
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef<QueryDocumentSnapshot | null>(null)
  const loadingMoreRef = useRef(false)

  const teamKey = filters.team ?? ''
  const tagKey = filters.tag ?? ''

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPosts([])
    cursorRef.current = null
    setHasMore(false)

    fetchNewsPosts({ team: (teamKey || undefined) as NewsFeedFilters['team'], tag: (tagKey || undefined) as NewsFeedFilters['tag'] })
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
  }, [teamKey, tagKey])

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !cursorRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    fetchNewsPosts(
      { team: (teamKey || undefined) as NewsFeedFilters['team'], tag: (tagKey || undefined) as NewsFeedFilters['tag'] },
      cursorRef.current,
    )
      .then((page) => {
        setPosts((prev) => [...prev, ...page.posts])
        cursorRef.current = page.cursor
        setHasMore(page.posts.length >= PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [teamKey, tagKey])

  return { posts, loading, loadingMore, hasMore, loadMore }
}
