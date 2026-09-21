import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AdminRecord } from '../data/admins.service'
import { fetchAdmins } from '../data/admins.service'

export function useAdminsMap(): { adminsMap: Map<string, AdminRecord>; reload: () => void } {
  const [admins, setAdmins] = useState<AdminRecord[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchAdmins()
      .then((records) => {
        if (!cancelled) setAdmins(records)
      })
      .catch(() => {
        if (!cancelled) setAdmins([])
      })
    return () => {
      cancelled = true
    }
  }, [version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])

  const adminsMap = useMemo(() => new Map(admins.map((a) => [a.uid, a])), [admins])

  return { adminsMap, reload }
}
