import { useCallback, useEffect, useState } from 'react'
import type { AppUser, PointsLogEntry } from '../domain/user.types'
import { fetchPointsLog, fetchTierThresholds, subscribeUser } from '../data/users.service'

export function useUser(id: string | undefined): {
  user: AppUser | null
  loading: boolean
  notFound: boolean
} {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    const unsubscribe = subscribeUser(id, (u) => {
      setUser(u)
      if (!u) setNotFound(true)
      setLoading(false)
    })
    return unsubscribe
  }, [id])

  return { user, loading, notFound }
}

export function usePointsLog(id: string | undefined): { log: PointsLogEntry[]; reload: () => void } {
  const [log, setLog] = useState<PointsLogEntry[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetchPointsLog(id).then((entries) => {
      if (!cancelled) setLog(entries)
    })
    return () => {
      cancelled = true
    }
  }, [id, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  return { log, reload }
}

export function useTierThresholds(): number[] {
  const [thresholds, setThresholds] = useState<number[]>([])

  useEffect(() => {
    let cancelled = false
    fetchTierThresholds().then((t) => {
      if (!cancelled) setThresholds(t)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return thresholds
}
