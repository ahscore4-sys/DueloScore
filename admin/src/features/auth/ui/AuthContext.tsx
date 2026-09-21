import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AdminPermission } from '@/core/domain/types'
import type { AuthUser } from '../domain/auth.types'
import type { AdminSessionInfo } from './auth-context'
import { onAuthChange, getAdminRole } from '../data/auth.service'
import { AuthContext } from './auth-context'
import { setActivityActor, logActivity } from '@/features/activity/data/activity.service'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [adminDoc, setAdminDoc] = useState<AdminSessionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const wasLoggedInRef = useRef(false)

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const admin = await getAdminRole(firebaseUser.uid)
          setAdminDoc(admin)
          if (admin) {
            setActivityActor({ adminId: firebaseUser.uid, adminName: admin.name })
            if (!wasLoggedInRef.current) {
              wasLoggedInRef.current = true
              logActivity({
                action: 'session.login',
                targetLabel: 'تسجيل الدخول إلى لوحة التحكم',
                details: { email: firebaseUser.email ?? '' },
              })
            }
          }
        } catch {
          setAdminDoc(null)
        }
      } else {
        setAdminDoc(null)
        if (wasLoggedInRef.current) {
          wasLoggedInRef.current = false
          logActivity({ action: 'session.logout', targetLabel: 'تسجيل الخروج من لوحة التحكم' })
        }
        setActivityActor(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const isAdmin = adminDoc !== null
  const isSuperAdmin = adminDoc?.role === 'super_admin'

  const hasPermission = useMemo(() => {
    return (permission: AdminPermission): boolean => {
      if (!adminDoc) return false
      if (adminDoc.role === 'super_admin') return true
      const permissions = adminDoc.permissions
      if (!permissions || permissions.length === 0) return true
      return permissions.includes(permission)
    }
  }, [adminDoc])

  return (
    <AuthContext.Provider value={{ user, adminDoc, loading, isAdmin, isSuperAdmin, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}
