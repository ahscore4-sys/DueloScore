import { useCallback, useEffect, useState } from 'react'
import { fetchReportsQueue, type ReportQueueItem } from '../data/diwaniya.service'

export function useReportsQueue(): {
  items: ReportQueueItem[]
  loading: boolean
  refresh: () => void
} {
  const [items, setItems] = useState<ReportQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchReportsQueue()
      .then((list) => {
        if (!cancelled) setItems(list)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tick])

  const refresh = useCallback(() => setTick((t) => t + 1), [])

  return { items, loading, refresh }
}
