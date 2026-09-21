import { useCallback, useEffect, useRef, useState } from 'react'
import type { QueryDocumentSnapshot } from 'firebase/firestore'
import type { AppUser } from '../domain/user.types'
import { fetchUsers, USERS_PAGE_SIZE } from '../data/users.service'

export function useUsers(): {
  users: AppUser[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
} {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const cursorRef = useRef<QueryDocumentSnapshot | null>(null)
  const loadingMoreRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchUsers()
      .then((page) => {
        if (cancelled) return
        setUsers(page.users)
        cursorRef.current = page.cursor
        setHasMore(page.users.length >= USERS_PAGE_SIZE && page.cursor !== null)
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
    fetchUsers(cursorRef.current)
      .then((page) => {
        setUsers((prev) => [...prev, ...page.users])
        cursorRef.current = page.cursor
        setHasMore(page.users.length >= USERS_PAGE_SIZE && page.cursor !== null)
      })
      .finally(() => {
        loadingMoreRef.current = false
        setLoadingMore(false)
      })
  }, [])

  return { users, loading, loadingMore, hasMore, loadMore }
}
