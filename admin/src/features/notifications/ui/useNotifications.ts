import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { PushNotification } from '../domain/notifications.types'
import { fetchNotifications, PAGE_SIZE } from '../data/notifications.service'

export function useNotifications(): {
  notifications: PushNotification[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
} {
  const [notifications, setNotifications] = useState<PushNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef<QueryDocumentSnapshot | null>(null)
  const loadingMoreRef = useRef(false)

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setNotifications([])
    cursorRef.current = null
    setHasMore(false)

    fetchNotifications()
      .then((page) => {
        if (cancelled) return
        setNotifications(page.notifications)
        cursorRef.current = page.cursor
        setHasMore(page.notifications.length >= PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => load(), [load])

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !cursorRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    fetchNotifications(cursorRef.current)
      .then((page) => {
        setNotifications((prev) => [...prev, ...page.notifications])
        cursorRef.current = page.cursor
        setHasMore(page.notifications.length >= PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [])

  return { notifications, loading, loadingMore, hasMore, loadMore, refresh: load }
}
