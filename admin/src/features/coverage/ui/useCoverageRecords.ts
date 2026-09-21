import { useEffect, useState } from 'react'
import type { CoverageEntityType, CoverageRecord } from '../domain/coverage.types'
import { subscribeCoverageList } from '../data/coverage.service'

export function useCoverageRecords(type: CoverageEntityType): {
  records: CoverageRecord[]
  loading: boolean
} {
  const [records, setRecords] = useState<CoverageRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const unsubscribe = subscribeCoverageList(type, (items) => {
      if (!active) return
      setRecords(items)
      setLoading(false)
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [type])

  return { records, loading }
}
