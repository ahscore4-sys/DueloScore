import { useEffect, useState } from 'react'
import type { AdminRecord } from '../data/admins.service'
import { fetchAdmins } from '../data/admins.service'
import type { AppUser } from '../domain/user.types'
import { fetchUserByUid } from '../data/users.service'

export interface AdminWithProfile {
  admin: AdminRecord
  profile: AppUser | null
}

export function useAdminsWithProfiles(): { admins: AdminWithProfile[]; loading: boolean } {
  const [admins, setAdmins] = useState<AdminWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        const records = await fetchAdmins()
        if (cancelled) return
        const withProfiles = await Promise.all(
          records.map(async (admin) => {
            if (cancelled) return { admin, profile: null as AppUser | null }
            const profile = await fetchUserByUid(admin.uid)
            return { admin, profile }
          }),
        )
        if (cancelled) return
        setAdmins(withProfiles)
      } catch {
        if (!cancelled) setAdmins([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { admins, loading }
}
