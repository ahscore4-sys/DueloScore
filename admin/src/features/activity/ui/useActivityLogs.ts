import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { ActivityLogEntry, ActivityTargetType } from '../domain/activity.types'
import { ACTIVITY_PAGE_SIZE, fetchActivityLogs } from '../data/activity.service'

export interface ActivityLogQuery {
  ownAdminId: string
  isSuperAdmin: boolean
  adminId: string | null
  targetType: ActivityTargetType | null
  from: number | null
  to: number | null
}

export function useActivityLogs(query: ActivityLogQuery): {
  entries: ActivityLogEntry[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
} {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef<QueryDocumentSnapshot | null>(null)
  const loadingMoreRef = useRef(false)

  const filters = {
    adminId: query.adminId ?? undefined,
    targetType: query.targetType ?? undefined,
    from: query.from ?? undefined,
    to: query.to ?? undefined,
  }

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setEntries([])
    cursorRef.current = null
    setHasMore(false)

    fetchActivityLogs(query.ownAdminId, query.isSuperAdmin, filters)
      .then((page) => {
        if (cancelled) return
        setEntries(page.entries)
        cursorRef.current = page.cursor
        setHasMore(page.entries.length >= ACTIVITY_PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.ownAdminId, query.isSuperAdmin, filters.adminId, filters.targetType, filters.from, filters.to])

  useEffect(() => load(), [load])

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || !cursorRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    fetchActivityLogs(query.ownAdminId, query.isSuperAdmin, filters, cursorRef.current)
      .then((page) => {
        setEntries((prev) => [...prev, ...page.entries])
        cursorRef.current = page.cursor
        setHasMore(page.entries.length >= ACTIVITY_PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.ownAdminId, query.isSuperAdmin, filters.adminId, filters.targetType, filters.from, filters.to])

  return { entries, loading, loadingMore, hasMore, loadMore, refresh: load }
}